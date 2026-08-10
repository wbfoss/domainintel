// Client-side helpers for the security tools. All network work that needs DNS,
// TLS, sockets or cross-origin HTTP is delegated to the server route
// /api/tools (Node runtime) — the browser cannot do those directly and CSP
// blocks arbitrary cross-origin calls.

// Call a server-side tool action. Returns parsed JSON or throws Error(message).
export async function callTool(action, params = {}) {
  const res = await fetch("/api/tools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...params }),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server returned an invalid response (${res.status}).`);
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status}).`);
  }
  return data;
}

// ---- Validation (client-side, mirrors server) ----
export function normalizeDomain(input) {
  if (typeof input !== "string") return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

const DOMAIN_RE =
  /^(?=.{1,253}$)(?!-)[a-zA-Z0-9-]{1,63}(?<!-)(\.[a-zA-Z0-9-]{1,63})*\.[a-zA-Z]{2,}$/;

export function validateDomain(input) {
  const d = normalizeDomain(input);
  if (!d) throw new Error("Please enter a domain name.");
  if (!DOMAIN_RE.test(d))
    throw new Error("Please enter a valid domain name (e.g., example.com).");
  return d;
}

export function isIPv4(ip) {
  return /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(
    (ip || "").trim()
  );
}

// ---- SPF record parsing (RFC 7208), operates on a raw TXT string ----
export function parseSpf(raw) {
  const record = raw.trim();
  const parts = record.split(/\s+/);
  const mechanisms = [];
  const issues = [];
  let all = null;
  let dnsLookups = 0; // include, a, mx, ptr, exists, redirect count against the 10-lookup limit

  for (const p of parts) {
    if (/^v=spf1$/i.test(p)) continue;
    const qualifier = "+-~?".includes(p[0]) ? p[0] : "+";
    const term = "+-~?".includes(p[0]) ? p.slice(1) : p;

    if (/^all$/i.test(term)) {
      all = qualifier;
    } else if (/^include:/i.test(term)) {
      mechanisms.push({ type: "include", value: term.slice(8), qualifier, lookups: 1 });
      dnsLookups++;
    } else if (/^a(:|$)/i.test(term)) {
      mechanisms.push({ type: "a", value: term.slice(2) || "(self)", qualifier, lookups: 1 });
      dnsLookups++;
    } else if (/^mx(:|$)/i.test(term)) {
      mechanisms.push({ type: "mx", value: term.slice(3) || "(self)", qualifier, lookups: 1 });
      dnsLookups++;
    } else if (/^ip4:/i.test(term)) {
      mechanisms.push({ type: "ip4", value: term.slice(4), qualifier, lookups: 0 });
    } else if (/^ip6:/i.test(term)) {
      mechanisms.push({ type: "ip6", value: term.slice(4), qualifier, lookups: 0 });
    } else if (/^exists:/i.test(term)) {
      mechanisms.push({ type: "exists", value: term.slice(7), qualifier, lookups: 1 });
      dnsLookups++;
    } else if (/^ptr(:|$)/i.test(term)) {
      mechanisms.push({ type: "ptr", value: term.slice(4) || "(self)", qualifier, lookups: 1 });
      dnsLookups++;
      issues.push({
        severity: "medium",
        message: "PTR mechanism is deprecated (RFC 7208 §5.5) and slow.",
      });
    } else if (/^redirect=/i.test(term)) {
      mechanisms.push({ type: "redirect", value: term.slice(9), qualifier: "", lookups: 1 });
      dnsLookups++;
    } else if (/^exp=/i.test(term)) {
      mechanisms.push({ type: "exp", value: term.slice(4), qualifier: "", lookups: 0 });
    } else {
      issues.push({ severity: "low", message: `Unrecognized term: "${p}"` });
    }
  }

  if (all === null && !mechanisms.some((m) => m.type === "redirect")) {
    issues.push({
      severity: "high",
      message: 'Missing "all" mechanism — the record has no default policy.',
    });
  }
  if (all === "+") {
    issues.push({
      severity: "critical",
      message: '"+all" allows any server to send as your domain. Remove it immediately.',
    });
  }
  if (all === "?") {
    issues.push({
      severity: "medium",
      message: '"?all" (neutral) provides no real protection. Use "~all" or "-all".',
    });
  }
  if (dnsLookups > 10) {
    issues.push({
      severity: "critical",
      message: `Too many DNS lookups (${dnsLookups}/10). SPF will PermError.`,
    });
  } else if (dnsLookups > 8) {
    issues.push({
      severity: "medium",
      message: `High DNS lookup count (${dnsLookups}/10) — approaching the limit.`,
    });
  }
  if (record.length > 255) {
    issues.push({
      severity: "high",
      message: `A single TXT string exceeds 255 chars (${record.length}); must be split into multiple strings.`,
    });
  }

  const allLabels = { "-": "Fail (strict)", "~": "SoftFail", "?": "Neutral", "+": "Pass (insecure)" };
  return { raw: record, mechanisms, all, allLabel: all ? allLabels[all] : "none", dnsLookups, issues };
}

// ---- DMARC record parsing (RFC 7489) ----
export function parseDmarc(raw) {
  const record = raw.trim();
  const tags = {};
  record.split(";").forEach((seg) => {
    const [k, v] = seg.split("=").map((s) => (s || "").trim());
    if (k) tags[k.toLowerCase()] = v;
  });
  const issues = [];
  if (!/^v=DMARC1$/i.test(`v=${tags.v || ""}`) && tags.v !== "DMARC1") {
    issues.push({ severity: "high", message: 'Record does not start with "v=DMARC1".' });
  }
  const policy = (tags.p || "").toLowerCase();
  if (!policy) {
    issues.push({ severity: "critical", message: 'Missing required policy tag "p".' });
  } else if (policy === "none") {
    issues.push({
      severity: "medium",
      message: 'Policy "p=none" only monitors — it does not block spoofing. Move toward quarantine/reject.',
    });
  }
  if (!tags.rua) {
    issues.push({
      severity: "low",
      message: 'No aggregate report address ("rua") — you will not receive DMARC reports.',
    });
  }
  const pct = tags.pct ? parseInt(tags.pct, 10) : 100;
  if (pct < 100) {
    issues.push({ severity: "low", message: `Only ${pct}% of mail is subject to the policy (pct=${pct}).` });
  }
  return {
    raw: record,
    version: tags.v || null,
    policy: policy || null,
    subdomainPolicy: (tags.sp || "").toLowerCase() || null,
    pct,
    rua: tags.rua || null,
    ruf: tags.ruf || null,
    adkim: tags.adkim === "s" ? "strict" : tags.adkim === "r" ? "relaxed" : "relaxed (default)",
    aspf: tags.aspf === "s" ? "strict" : tags.aspf === "r" ? "relaxed" : "relaxed (default)",
    fo: tags.fo || null,
    issues,
  };
}

// Extract records of interest from a server DNS response
export function findSpfRecord(txtRecords = []) {
  return txtRecords.find((t) => /^v=spf1(\s|$)/i.test(t.trim())) || null;
}
export function findDmarcRecord(txtRecords = []) {
  return txtRecords.find((t) => /^v=DMARC1(\s|;|$)/i.test(t.trim())) || null;
}

export const SUSPICIOUS_TLDS = [
  "tk", "ml", "ga", "cf", "gq", "click", "download", "review", "top", "win",
  "bid", "stream", "trade", "racing", "loan", "date", "men", "cricket",
  "party", "science", "webcam", "accountant", "faith", "work", "zip", "mov",
];

export function tldOf(domain) {
  const parts = domain.toLowerCase().split(".");
  return parts[parts.length - 1];
}
