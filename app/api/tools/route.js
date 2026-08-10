import { NextResponse } from "next/server";
import dns from "dns";
import net from "net";
import tls from "tls";

// This route performs real DNS/TLS/HTTP diagnostics and depends on Node core
// modules, so pin it to the Node.js runtime and never cache.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resolver = dns.promises;

// ---- Simple in-memory rate limiting (best-effort; see /api/lookup note) ----
const rateStore = {};
function checkRate(ip) {
  const now = Date.now();
  const windowMs = 60_000;
  const max = 60; // 60 tool calls / minute / IP
  const entry = rateStore[ip] || { count: 0, start: now };
  if (now - entry.start > windowMs) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateStore[ip] = entry;
  return entry.count <= max;
}

// ---- Validation ----
const DOMAIN_RE =
  /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,}$/;

function isValidDomain(d) {
  return typeof d === "string" && DOMAIN_RE.test(d);
}
function isValidIPv4(ip) {
  return net.isIPv4(ip);
}

function normalizeDomain(input) {
  if (typeof input !== "string") return "";
  let d = input.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  d = d.replace(/:\d+$/, ""); // strip port
  return d;
}

// ---- DNS helpers (each returns [] on NODATA/NXDOMAIN) ----
async function safeResolve(fn) {
  try {
    return await fn();
  } catch (e) {
    if (["ENOTFOUND", "ENODATA", "ESERVFAIL"].includes(e.code)) return [];
    throw e;
  }
}

async function getAllDnsRecords(domain) {
  const [a, aaaa, mx, ns, txt, cname, soa] = await Promise.all([
    safeResolve(() => resolver.resolve4(domain)),
    safeResolve(() => resolver.resolve6(domain)),
    safeResolve(() => resolver.resolveMx(domain)),
    safeResolve(() => resolver.resolveNs(domain)),
    safeResolve(() => resolver.resolveTxt(domain)),
    safeResolve(() => resolver.resolveCname(domain)),
    resolver.resolveSoa(domain).catch(() => null),
  ]);
  return {
    A: a,
    AAAA: aaaa,
    MX: mx.sort((x, y) => x.priority - y.priority),
    NS: ns,
    TXT: txt.map((chunks) => chunks.join("")),
    CNAME: cname,
    SOA: soa,
  };
}

// ---- RDAP summary (real domain age / registrar / status / dnssec) ----
async function rdapSummary(domain) {
  const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
  if (!res.ok) {
    return { registered: false, status: res.status };
  }
  const data = await res.json();
  const events = data.events || [];
  const reg = events.find((e) => e.eventAction === "registration");
  const exp = events.find((e) => e.eventAction === "expiration");
  const changed = events.find((e) => e.eventAction === "last changed");
  const registrarEntity = (data.entities || []).find((e) =>
    (e.roles || []).includes("registrar")
  );
  let registrar = null;
  if (registrarEntity?.vcardArray?.[1]) {
    const fn = registrarEntity.vcardArray[1].find((v) => v[0] === "fn");
    registrar = fn ? fn[3] : null;
  }
  const regDate = reg ? new Date(reg.eventDate) : null;
  const ageInDays = regDate
    ? Math.floor((Date.now() - regDate.getTime()) / 86_400_000)
    : null;
  return {
    registered: true,
    ldhName: data.ldhName || domain,
    handle: data.handle || null,
    registrar,
    registrationDate: reg?.eventDate || null,
    expirationDate: exp?.eventDate || null,
    lastChanged: changed?.eventDate || null,
    ageInDays,
    status: data.status || [],
    nameservers: (data.nameservers || []).map((n) => n.ldhName).filter(Boolean),
    dnssec: Boolean(data.secureDNS?.delegationSigned),
  };
}

// ---- Reverse DNS (PTR) ----
async function reverseDns(ip) {
  try {
    const names = await resolver.reverse(ip);
    return { ip, ptr: names };
  } catch (e) {
    return { ip, ptr: [], error: e.code || e.message };
  }
}

// ---- DNSBL checks (real, over DNS) for an IPv4 ----
const DNSBL_ZONES = [
  { zone: "zen.spamhaus.org", name: "Spamhaus ZEN" },
  { zone: "b.barracudacentral.org", name: "Barracuda" },
  { zone: "bl.spamcop.net", name: "SpamCop" },
  { zone: "dnsbl.sorbs.net", name: "SORBS" },
  { zone: "cbl.abuseat.org", name: "Abuseat CBL" },
  { zone: "psbl.surriel.com", name: "PSBL" },
];

async function checkDnsbls(ip) {
  const reversed = ip.split(".").reverse().join(".");
  const results = await Promise.all(
    DNSBL_ZONES.map(async ({ zone, name }) => {
      const query = `${reversed}.${zone}`;
      try {
        const a = await resolver.resolve4(query);
        let txt = [];
        try {
          txt = (await resolver.resolveTxt(query)).map((c) => c.join(""));
        } catch {
          /* listing may have no TXT */
        }
        return { provider: name, zone, listed: true, response: a, reason: txt };
      } catch (e) {
        if (["ENOTFOUND", "ENODATA"].includes(e.code)) {
          return { provider: name, zone, listed: false };
        }
        return { provider: name, zone, listed: false, error: e.code || "error" };
      }
    })
  );
  const listedCount = results.filter((r) => r.listed).length;
  return { ip, listedCount, total: DNSBL_ZONES.length, results };
}

// Resolve a hostname to an IPv4 then run DNSBL (domain-based blacklist view)
async function checkDomainBlacklist(domain) {
  const ips = await safeResolve(() => resolver.resolve4(domain));
  if (!ips.length) {
    return { domain, resolved: false, checks: [] };
  }
  const checks = await Promise.all(ips.slice(0, 3).map((ip) => checkDnsbls(ip)));
  return { domain, resolved: true, ips, checks };
}

// ---- Certificate Transparency via crt.sh (real) ----
async function certTransparency(domain) {
  const url = `https://crt.sh/?q=${encodeURIComponent(domain)}&output=json&exclude=expired`;
  let res;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "DomainIntel/1.0 (+https://www.domainintel.in)" },
      signal: AbortSignal.timeout(25_000),
    });
  } catch (e) {
    throw new Error(
      e.name === "TimeoutError"
        ? "crt.sh did not respond in time (it is often slow). Please try again."
        : `Could not reach crt.sh: ${e.message}`
    );
  }
  if (!res.ok) throw new Error(`crt.sh returned ${res.status}`);
  const text = await res.text();
  let rows;
  try {
    rows = JSON.parse(text);
  } catch {
    // crt.sh sometimes returns NDJSON-ish payloads; wrap into an array
    rows = JSON.parse(`[${text.trim().replace(/}\s*{/g, "},{")}]`);
  }
  // Deduplicate by (issuer, serial) and normalize
  const seen = new Set();
  const certs = [];
  for (const r of rows) {
    const key = `${r.issuer_ca_id}-${r.serial_number}`;
    if (seen.has(key)) continue;
    seen.add(key);
    certs.push({
      id: r.id,
      issuer: r.issuer_name,
      commonName: r.common_name,
      nameValue: (r.name_value || "").split("\n"),
      notBefore: r.not_before,
      notAfter: r.not_after,
      serial: r.serial_number,
      entryTimestamp: r.entry_timestamp,
    });
  }
  certs.sort((a, b) => new Date(b.notBefore) - new Date(a.notBefore));

  // Aggregate insights
  const now = Date.now();
  const uniqueNames = new Set();
  const issuers = {};
  let last30 = 0,
    last90 = 0;
  for (const c of certs) {
    c.nameValue.forEach((n) => uniqueNames.add(n.replace(/^\*\./, "")));
    const iss = (c.issuer.match(/O=([^,]+)/) || [])[1] || c.issuer;
    issuers[iss] = (issuers[iss] || 0) + 1;
    const nb = new Date(c.notBefore).getTime();
    if (now - nb < 30 * 86_400_000) last30++;
    if (now - nb < 90 * 86_400_000) last90++;
  }
  return {
    domain,
    total: certs.length,
    last30Days: last30,
    last90Days: last90,
    uniqueSubdomains: [...uniqueNames].sort(),
    issuerDistribution: Object.entries(issuers)
      .map(([issuer, count]) => ({ issuer, count }))
      .sort((a, b) => b.count - a.count),
    certificates: certs.slice(0, 100),
  };
}

// ---- Live TLS / certificate assessment (real socket) ----
function tlsAssessment(domain) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: domain,
        port: 443,
        servername: domain,
        rejectUnauthorized: false,
        ALPNProtocols: ["h2", "http/1.1"],
      },
      () => {
        const cert = socket.getPeerCertificate(true);
        const protocol = socket.getProtocol();
        const cipher = socket.getCipher();
        const authorized = socket.authorized;
        const authError = socket.authorizationError;
        const alpn = socket.alpnProtocol || null;
        socket.end();

        if (!cert || !Object.keys(cert).length) {
          resolve({ reachable: true, error: "No certificate presented" });
          return;
        }
        const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
        const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
        const daysRemaining = validTo
          ? Math.floor((validTo.getTime() - Date.now()) / 86_400_000)
          : null;
        resolve({
          reachable: true,
          authorized,
          authError: authError || null,
          protocol,
          alpn,
          http2: alpn === "h2",
          cipher: cipher
            ? { name: cipher.name, version: cipher.version, bits: cipher.bits }
            : null,
          certificate: {
            subject: cert.subject || null,
            issuer: cert.issuer || null,
            subjectAltName: cert.subjectaltname || null,
            validFrom: cert.valid_from || null,
            validTo: cert.valid_to || null,
            daysRemaining,
            expired: daysRemaining !== null && daysRemaining < 0,
            serialNumber: cert.serialNumber || null,
            fingerprint256: cert.fingerprint256 || null,
            keyBits: cert.bits || null,
            pubkeyAlgo: cert.asn1Curve || cert.nistCurve || null,
          },
        });
      }
    );
    socket.setTimeout(10_000);
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ reachable: false, error: "Connection timed out" });
    });
    socket.on("error", (err) => {
      resolve({ reachable: false, error: err.code || err.message });
    });
  });
}

// ---- HTTP probe (real): status, headers, security headers, parking hints ----
const PARKING_NS = [
  "parkingcrew.net", "sedoparking.com", "bodis.com", "above.com",
  "parklogic.com", "dan.com", "afternic.com", "cashparking.com",
  "domaincontrol.com", "hugedomains.com", "voodoo.com", "parked.com",
];
const PARKING_KEYWORDS = [
  "domain for sale", "buy this domain", "this domain is for sale",
  "parked domain", "domain parking", "the domain has expired",
  "related searches", "sponsored listings", "purchase this domain",
];

async function httpProbe(domain) {
  const result = {
    domain,
    https: { reachable: false },
    securityHeaders: {},
    parking: { parked: false, indicators: [], nameservers: [] },
  };
  let html = "";
  try {
    const res = await fetch(`https://${domain}/`, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; DomainIntel/1.0)" },
      signal: AbortSignal.timeout(10_000),
    });
    result.https = {
      reachable: true,
      status: res.status,
      finalUrl: res.url,
      server: res.headers.get("server") || null,
    };
    const h = res.headers;
    result.securityHeaders = {
      hsts: h.get("strict-transport-security"),
      csp: h.get("content-security-policy") ? true : false,
      xFrameOptions: h.get("x-frame-options"),
      xContentTypeOptions: h.get("x-content-type-options"),
      referrerPolicy: h.get("referrer-policy"),
      permissionsPolicy: h.get("permissions-policy") ? true : false,
    };
    const ct = h.get("content-type") || "";
    if (ct.includes("text/html")) {
      try {
        html = (await res.text()).slice(0, 200_000).toLowerCase();
      } catch {
        /* ignore body read errors */
      }
    }
  } catch (e) {
    result.https = { reachable: false, error: e.name === "TimeoutError" ? "timeout" : (e.cause?.code || e.message) };
  }

  // Parking detection: nameservers + content heuristics
  try {
    const ns = await safeResolve(() => resolver.resolveNs(domain));
    result.parking.nameservers = ns;
    const parkNs = ns.filter((n) =>
      PARKING_NS.some((p) => n.toLowerCase().includes(p))
    );
    if (parkNs.length) {
      result.parking.parked = true;
      result.parking.indicators.push(`Parking nameserver(s): ${parkNs.join(", ")}`);
    }
  } catch {
    /* ignore */
  }
  if (html) {
    const title = (html.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || "";
    result.parking.title = title.trim();
    const hits = PARKING_KEYWORDS.filter((k) => html.includes(k));
    if (hits.length) {
      result.parking.parked = true;
      result.parking.indicators.push(...hits.map((h) => `Content match: "${h}"`));
    }
  }
  return result;
}

// ---- Fast-flux style snapshot (real, single point-in-time) ----
async function ipFootprint(domain) {
  const a = await safeResolve(() => resolver.resolve4(domain));
  const aaaa = await safeResolve(() => resolver.resolve6(domain));
  const ns = await safeResolve(() => resolver.resolveNs(domain));
  // Reverse-DNS each A to reveal hosting diversity
  const ptrs = await Promise.all(
    a.slice(0, 8).map(async (ip) => ({ ip, ...(await reverseDns(ip)) }))
  );
  return { domain, ipv4: a, ipv6: aaaa, nameservers: ns, ptr: ptrs };
}

// ---- Quick "is this domain registered" (for typosquatting variations) ----
async function isRegistered(domain) {
  // NS presence is a fast, reliable proxy for registration/active delegation.
  const ns = await safeResolve(() => resolver.resolveNs(domain));
  if (ns.length) return { domain, registered: true, via: "ns", nameservers: ns };
  const a = await safeResolve(() => resolver.resolve4(domain));
  if (a.length) return { domain, registered: true, via: "a", a };
  return { domain, registered: false };
}

async function bulkRegistered(domains) {
  const list = domains.slice(0, 60);
  const out = await Promise.all(
    list.map((d) =>
      isRegistered(d).catch(() => ({ domain: d, registered: false, error: true }))
    )
  );
  return { results: out };
}

// ---- Router ----
export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1";
  if (!checkRate(ip)) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { action } = body || {};
  const domain = normalizeDomain(body?.target || body?.domain || "");

  try {
    switch (action) {
      case "dns": {
        if (!isValidDomain(domain))
          return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
        return NextResponse.json({ domain, records: await getAllDnsRecords(domain) });
      }
      case "rdap": {
        if (!isValidDomain(domain))
          return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
        return NextResponse.json(await rdapSummary(domain));
      }
      case "ptr": {
        const ip4 = (body?.target || "").trim();
        if (!isValidIPv4(ip4))
          return NextResponse.json(
            { error: "Reverse DNS requires a valid IPv4 address." },
            { status: 400 }
          );
        return NextResponse.json(await reverseDns(ip4));
      }
      case "dnsbl": {
        const ip4 = (body?.target || "").trim();
        if (isValidIPv4(ip4)) return NextResponse.json(await checkDnsbls(ip4));
        if (isValidDomain(domain))
          return NextResponse.json(await checkDomainBlacklist(domain));
        return NextResponse.json(
          { error: "Provide a valid IPv4 address or domain." },
          { status: 400 }
        );
      }
      case "ct": {
        if (!isValidDomain(domain))
          return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
        return NextResponse.json(await certTransparency(domain));
      }
      case "tls": {
        if (!isValidDomain(domain))
          return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
        return NextResponse.json({ domain, ...(await tlsAssessment(domain)) });
      }
      case "http": {
        if (!isValidDomain(domain))
          return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
        return NextResponse.json(await httpProbe(domain));
      }
      case "ipfootprint": {
        if (!isValidDomain(domain))
          return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
        return NextResponse.json(await ipFootprint(domain));
      }
      case "registered": {
        if (!isValidDomain(domain))
          return NextResponse.json({ error: "Invalid domain." }, { status: 400 });
        return NextResponse.json(await isRegistered(domain));
      }
      case "bulk-registered": {
        const domains = Array.isArray(body?.domains) ? body.domains : [];
        const valid = domains.map(normalizeDomain).filter(isValidDomain);
        if (!valid.length)
          return NextResponse.json({ error: "No valid domains." }, { status: 400 });
        return NextResponse.json(await bulkRegistered(valid));
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: `Analysis failed: ${e.message}` },
      { status: 500 }
    );
  }
}
