import { NextResponse } from "next/server";
import dns from "dns";
import tls from "tls";
import net from "net";

// This route depends on Node core modules (dns, tls, net), so pin it to the
// Node.js runtime and force dynamic execution (never cache/prerender).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory store for rate limiting.
// NOTE: this only limits within a single running instance. On Vercel
// (serverless / Fluid Compute) requests are spread across multiple ephemeral
// instances, so this is best-effort throttling only. For durable, cross-instance
// limits, back this with a shared store (e.g. Upstash Redis from the Marketplace).
const rateLimitStore = {};

/**
 * Verify hCaptcha token with hCaptcha's verification endpoint
 */
async function verifyHCaptcha(token) {
  const verifyUrl = "https://api.hcaptcha.com/siteverify";
  const response = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      response: token,
      secret: process.env.HCAPTCHA_SECRET_KEY,
    }),
  });

  const data = await response.json();
  return data.success;
}

/**
 * Enforce rate limiting based on environment variables.
 */
function checkRateLimit(ip) {
  const now = Date.now();
  const userEntry = rateLimitStore[ip] || { count: 0, lastRequest: 0 };

  const maxQueries = parseInt(process.env.RDAP_LOOKUP_MAX_QUERIES, 10) || 100;
  const rateLimitSeconds = parseInt(process.env.RDAP_LOOKUP_RATE_LIMIT_SECONDS, 10) || 15;

  // Exceed total queries?
  if (userEntry.count >= maxQueries) {
    return {
      allowed: false,
      reason: `You have reached the maximum of ${maxQueries} queries for your IP address.`,
    };
  }

  // Too frequent?
  const timeSinceLastRequest = now - userEntry.lastRequest;
  if (timeSinceLastRequest < rateLimitSeconds * 1000) {
    return {
      allowed: false,
      reason: `Please wait at least ${rateLimitSeconds} seconds before making another query.`,
    };
  }

  return { allowed: true, reason: "" };
}

function updateRateLimit(ip) {
  const now = Date.now();
  const userEntry = rateLimitStore[ip] || { count: 0, lastRequest: 0 };
  userEntry.count += 1;
  userEntry.lastRequest = now;
  rateLimitStore[ip] = userEntry;
}

export async function POST(request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1"; // fallback in dev

    // Rate-limit check
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ message: rateCheck.reason }, { status: 429 });
    }

    const { type, object, dkimSelector, captchaToken } = await request.json();

    // Validate required fields
    if (!type || !object) {
      return NextResponse.json(
        { message: 'Please provide both "type" and "object".' },
        { status: 400 }
      );
    }

    // Count this request now (before the upstream work) so the per-IP throttle
    // is enforced regardless of whether the lookup ultimately succeeds.
    updateRateLimit(ip);

    // Verify hCaptcha token — but only when hCaptcha is actually configured.
    // This mirrors the frontend, which disables the CAPTCHA widget when the
    // site key is absent. Without this guard, every lookup fails with 400 on
    // any deployment that hasn't set HCAPTCHA_SECRET_KEY.
    if (process.env.HCAPTCHA_SECRET_KEY) {
      if (!captchaToken) {
        return NextResponse.json(
          { message: "Captcha token is required." },
          { status: 400 }
        );
      }

      const isValidCaptcha = await verifyHCaptcha(captchaToken);
      if (!isValidCaptcha) {
        return NextResponse.json(
          { message: "Invalid captcha token. Please try again." },
          { status: 400 }
        );
      }
    }

    // Primary RDAP request. rdap.org is the IANA bootstrap resolver: it already
    // 302-redirects to the authoritative RDAP server for the given object (and
    // fetch follows redirects by default), so there is no useful secondary
    // fallback to add here. (The previous rdap.iana.org fallback only served
    // TLD/bootstrap data and 404'd for every real domain.)
    const rdapUrl = `https://rdap.org/${type}/${object}`;
    const response = await fetch(rdapUrl);

    if (!response.ok) {
      const detail =
        response.status === 404
          ? `No RDAP record found for ${type}/${object}.`
          : `RDAP lookup failed for ${type}/${object} (upstream status ${response.status}).`;
      return NextResponse.json(
        { message: `${detail} Please check the identifier and try again.` },
        { status: response.status }
      );
    }

    // If primary request succeeded
    const data = await response.json();

    if (type === 'domain') {
      try {
        const dnsLookups = [
          dns.promises.resolveTxt(`_spf.${object}`),
          dns.promises.resolveTxt(`_dmarc.${object}`),
        ];

        if (dkimSelector) {
          dnsLookups.push(dns.promises.resolveTxt(`${dkimSelector}._domainkey.${object}`));
        }

        const [spf, dmarc, dkim] = await Promise.allSettled(dnsLookups);

        data.emailSecurity = {
          spf: spf.status === 'fulfilled' ? spf.value.join(' ') : 'Not found',
          dmarc: dmarc.status === 'fulfilled' ? dmarc.value.join(' ') : 'Not found',
          dkim: dkimSelector ? (dkim.status === 'fulfilled' ? dkim.value.join(' ') : 'Not found') : 'Not looked up',
        };
      } catch (dnsError) {
        // Ignore DNS errors if records don't exist
        data.emailSecurity = {
          spf: 'Not found',
          dmarc: 'Not found',
          dkim: dkimSelector ? 'Not found' : 'Not looked up',
        };
      }

      try {
        const certificate = await getCertificate(object);
        data.ssl = certificate;
      } catch (sslError) {
        data.ssl = { error: sslError.message };
      }
    } else if (type === 'ip') {
      try {
        const rblResults = await checkRbls(object);
        data.rbl = rblResults;
      } catch (rblError) {
        data.rbl = { error: rblError.message };
      }
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: `An unexpected error occurred: ${error.message}` },
      { status: 500 }
    );
  }
}

function getCertificate(domain) {
  return new Promise((resolve, reject) => {
    const options = {
      host: domain,
      port: 443,
      // Send SNI so hosts serving multiple certs return the right one;
      // without servername, getPeerCertificate() can come back empty/wrong.
      servername: domain,
    };

    const socket = tls.connect(options, () => {
      const certificate = socket.getPeerCertificate();
      socket.end();
      if (Object.keys(certificate).length > 0) {
        resolve({
          subject: certificate.subject,
          issuer: certificate.issuer,
          valid_from: certificate.valid_from,
          valid_to: certificate.valid_to,
          fingerprint: certificate.fingerprint,
        });
      } else {
        reject(new Error("No certificate found."));
      }
    });

    socket.on("error", (error) => {
      reject(error);
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Connection timed out."));
    });

    socket.setTimeout(5000); // 5 second timeout
  });
}

// RBL providers to check against
const RBL_PROVIDERS = [
  "zen.spamhaus.org",
  "b.barracudacentral.org",
  "bl.spamcop.net",
];

/**
 * Checks an IP address against a list of RBLs.
 * @param {string} ip The IP address to check.
 * @returns {Promise<Object>} A promise that resolves to an object with RBL results.
 */
async function checkRbls(ip) {
  // The reversed-nibble DNSBL query below is IPv4-only. Most public RBLs
  // (Spamhaus ZEN, Barracuda, SpamCop) are IPv4-only anyway, so skip IPv6.
  if (net.isIPv4(ip) === false) {
    return { note: "RBL checks are only supported for IPv4 addresses." };
  }

  const reversedIp = ip.split(".").reverse().join(".");
  const results = {};

  const checks = RBL_PROVIDERS.map(async (provider) => {
    try {
      const address = `${reversedIp}.${provider}`;
      await dns.promises.resolve(address, "A");
      results[provider] = { status: "Listed" };
    } catch (error) {
      // NXDOMAIN (not found) is the expected error for a non-listed IP.
      if (error.code === "ENOTFOUND" || error.code === "ENODATA" || error.code === "dns.NODATA" || error.code === "dns.NOTFOUND") {
        results[provider] = { status: "Not Listed" };
      } else {
        // For other errors (e.g., timeout), mark as an error.
        results[provider] = { status: "Error" };
      }
    }
  });

  await Promise.all(checks);
  return results;
}
