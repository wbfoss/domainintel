'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import {
  callTool,
  validateDomain,
  SUSPICIOUS_TLDS,
  tldOf,
} from '../../utils/security-tools';
import {
  ToolShell,
  QueryForm,
  ErrorNote,
  InfoNote,
  Badge,
  StatCard,
} from './_shared';

// Grade thresholds applied to the percentage of points earned across the
// factors we could actually measure.
function gradeOf(pct) {
  if (pct >= 85) return { grade: 'A', level: 'low', label: 'Good reputation signals' };
  if (pct >= 70) return { grade: 'B', level: 'low', label: 'Mostly healthy signals' };
  if (pct >= 55) return { grade: 'C', level: 'medium', label: 'Mixed signals' };
  if (pct >= 40) return { grade: 'D', level: 'high', label: 'Weak signals' };
  return { grade: 'F', level: 'critical', label: 'Poor reputation signals' };
}

export default function DomainReputationScoring({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyze = async () => {
    let domain;
    try {
      domain = validateDomain(target);
    } catch (err) {
      setError(err.message);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const [rdapRes, dnsRes, dnsblRes] = await Promise.allSettled([
        callTool('rdap', { target: domain }),
        callTool('dns', { target: domain }),
        callTool('dnsbl', { target: domain }),
      ]);

      const rdap = rdapRes.status === 'fulfilled' ? rdapRes.value : null;
      const dns = dnsRes.status === 'fulfilled' ? dnsRes.value : null;
      const dnsbl = dnsblRes.status === 'fulfilled' ? dnsblRes.value : null;

      const factors = [];
      const unknown = (key, label, max, reason) =>
        factors.push({ key, label, max, unknown: true, why: reason });

      // ---- 1. Domain age (RDAP) — 25 pts ----
      if (rdap?.registered && typeof rdap.ageInDays === 'number') {
        const age = rdap.ageInDays;
        let points, level;
        if (age < 30) { points = 0; level = 'critical'; }
        else if (age < 90) { points = 5; level = 'high'; }
        else if (age < 180) { points = 10; level = 'medium'; }
        else if (age < 365) { points = 15; level = 'medium'; }
        else if (age < 730) { points = 20; level = 'low'; }
        else { points = 25; level = 'low'; }
        const years = Math.floor(age / 365);
        factors.push({
          key: 'age', label: 'Domain age', max: 25, points, level,
          value: years >= 1 ? `${years} yr ${age % 365} d (${age} days)` : `${age} days`,
          why: age < 90
            ? 'Very recently registered domains are disproportionately used for abuse.'
            : 'Older registrations correlate with legitimate, established use.',
        });
      } else if (rdap && rdap.registered === false) {
        unknown('age', 'Domain age', 25, 'RDAP reports the domain as not registered.');
      } else {
        unknown('age', 'Domain age', 25, 'RDAP registration date unavailable.');
      }

      // ---- 2. DNSSEC (RDAP) — 10 pts ----
      if (rdap?.registered && typeof rdap.dnssec === 'boolean') {
        factors.push({
          key: 'dnssec', label: 'DNSSEC', max: 10,
          points: rdap.dnssec ? 10 : 0,
          level: rdap.dnssec ? 'low' : 'medium',
          value: rdap.dnssec ? 'Signed' : 'Unsigned',
          why: rdap.dnssec
            ? 'DNSSEC signing protects resolution from spoofing.'
            : 'No DNSSEC — common, but signed zones show more operational care.',
        });
      } else {
        unknown('dnssec', 'DNSSEC', 10, 'DNSSEC status unavailable from RDAP.');
      }

      // ---- 3. EPP status (RDAP) — 15 pts ----
      if (rdap?.registered && Array.isArray(rdap.status)) {
        const statuses = rdap.status.map((s) => s.toLowerCase());
        let points = 15, level = 'low', why = 'No hold, redemption, or delete states.';
        if (statuses.some((s) => s.includes('serverhold') || s.includes('clienthold'))) {
          points = 0; level = 'critical';
          why = 'Hold status — the registry/registrar has suspended resolution, often for abuse.';
        } else if (statuses.some((s) => s.includes('pendingdelete') || s.includes('redemptionperiod'))) {
          points = 4; level = 'high';
          why = 'Domain is expiring or in redemption — unstable ownership.';
        }
        factors.push({
          key: 'status', label: 'Registry status', max: 15, points, level,
          value: rdap.status.length ? rdap.status.join(', ') : 'none reported', why,
        });
      } else {
        unknown('status', 'Registry status', 15, 'RDAP status codes unavailable.');
      }

      // ---- 4. Registrar on record (RDAP) — 5 pts ----
      if (rdap?.registered) {
        const has = Boolean(rdap.registrar);
        factors.push({
          key: 'registrar', label: 'Registrar', max: 5,
          points: has ? 5 : 0,
          level: has ? 'low' : 'medium',
          value: rdap.registrar || 'Not disclosed',
          why: has
            ? 'An identifiable sponsoring registrar is on record.'
            : 'RDAP did not disclose a sponsoring registrar.',
        });
      } else {
        unknown('registrar', 'Registrar', 5, 'RDAP registrar data unavailable.');
      }

      // ---- 5. DNS infrastructure (DNS) — 15 pts ----
      if (dns?.records) {
        const ns = dns.records.NS || [];
        const a = dns.records.A || [];
        const aaaa = dns.records.AAAA || [];
        const mx = dns.records.MX || [];
        let points = 0;
        if (ns.length >= 2) points += 6;
        else if (ns.length === 1) points += 3;
        if (a.length > 0 || aaaa.length > 0) points += 5;
        if (mx.length > 0) points += 4;
        const level = points >= 11 ? 'low' : points >= 6 ? 'medium' : 'high';
        factors.push({
          key: 'dnsinfra', label: 'DNS infrastructure', max: 15, points, level,
          value: `${ns.length} NS · ${a.length + aaaa.length} address record(s) · ${mx.length} MX`,
          why: 'Redundant nameservers, resolvable addresses, and mail routing indicate a real, operated zone.',
        });
      } else {
        unknown('dnsinfra', 'DNS infrastructure', 15, 'DNS lookup failed.');
      }

      // ---- 6. TLD (client-side check) — 10 pts ----
      {
        const tld = tldOf(domain);
        const suspicious = SUSPICIOUS_TLDS.includes(tld);
        factors.push({
          key: 'tld', label: 'TLD', max: 10,
          points: suspicious ? 0 : 10,
          level: suspicious ? 'high' : 'low',
          value: `.${tld}`,
          why: suspicious
            ? `.${tld} appears on lists of frequently abused TLDs (does not prove abuse by itself).`
            : `.${tld} is not on our list of frequently abused TLDs.`,
        });
      }

      // ---- 7. DNS blacklists (DNSBL) — 20 pts ----
      if (dnsbl && Array.isArray(dnsbl.checks)) {
        if (!dnsbl.resolved || dnsbl.checks.length === 0) {
          unknown('dnsbl', 'Blacklist listings', 20, 'Domain did not resolve to an IP, so no blacklist check was possible.');
        } else {
          const listed = dnsbl.checks.reduce((n, c) => n + (c.listedCount || 0), 0);
          const total = dnsbl.checks.reduce((n, c) => n + (c.total || 0), 0);
          const listings = dnsbl.checks.flatMap((c) =>
            (c.results || []).filter((r) => r.listed).map((r) => `${c.ip} on ${r.provider}`)
          );
          let points, level;
          if (listed === 0) { points = 20; level = 'low'; }
          else if (listed === 1) { points = 8; level = 'high'; }
          else { points = 0; level = 'critical'; }
          factors.push({
            key: 'dnsbl', label: 'Blacklist listings', max: 20, points, level,
            value: `${listed} listing(s) across ${total} checks (${dnsbl.ips?.length || 0} IP(s))`,
            why: listed === 0
              ? 'None of the resolved IPs appear on the queried DNS blacklists.'
              : `Listed: ${listings.join('; ')}.`,
          });
        }
      } else {
        unknown('dnsbl', 'Blacklist listings', 20, 'Blacklist check failed.');
      }

      const known = factors.filter((f) => !f.unknown);
      if (known.length === 0) {
        throw new Error('All data sources failed for this domain — no reputation score can be computed.');
      }
      const earned = known.reduce((n, f) => n + f.points, 0);
      const possible = known.reduce((n, f) => n + f.max, 0);
      const pct = Math.round((earned / possible) * 100);

      setResult({
        domain,
        factors,
        earned,
        possible,
        pct,
        ...gradeOf(pct),
        knownCount: known.length,
        totalCount: factors.length,
        registered: rdap ? rdap.registered !== false : null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const barColor =
    result?.pct >= 70 ? 'bg-green-500' : result?.pct >= 55 ? 'bg-yellow-500' : result?.pct >= 40 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <ToolShell
      title="Domain Reputation Scoring"
      subtitle="Score built from live RDAP, DNS, and blacklist data"
      icon={Shield}
      accent="green"
      onClose={onClose}
      width="max-w-3xl"
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={analyze}
        loading={loading}
        placeholder="Enter a domain (e.g., example.com)"
        accent="green"
        label="Score"
      />
      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          {result.registered === false && (
            <InfoNote title="Not registered">
              RDAP reports {result.domain} as not registered; scoring is limited to the factors that could still be measured.
            </InfoNote>
          )}

          <div className="rounded-lg border-2 border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">{result.domain}</h3>
                <p className="text-sm text-gray-600">{result.label}</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-gray-900">{result.grade}</div>
                <Badge level={result.level}>{result.pct}%</Badge>
              </div>
            </div>
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <div className={`h-full ${barColor}`} style={{ width: `${result.pct}%` }} />
            </div>
            <p className="mt-3 text-sm text-gray-600">
              {result.earned} of {result.possible} points, from {result.knownCount} of {result.totalCount} factors.
              {result.knownCount < result.totalCount &&
                ' Factors that could not be measured are excluded from the score.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Score" value={`${result.pct}%`} level={result.level} />
            <StatCard label="Points" value={`${result.earned}/${result.possible}`} />
            <StatCard label="Factors measured" value={`${result.knownCount}/${result.totalCount}`} />
          </div>

          <div className="space-y-3">
            {result.factors.map((f) => (
              <div key={f.key} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-gray-900">{f.label}</h4>
                    <Badge level={f.unknown ? 'unknown' : f.level}>
                      {f.unknown ? 'unknown' : f.level}
                    </Badge>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {f.unknown ? '—' : `${f.points}/${f.max}`}
                  </span>
                </div>
                {!f.unknown && (
                  <p className="text-sm text-gray-800">
                    <span className="font-medium">Value:</span> {f.value}
                  </p>
                )}
                <p className="text-sm text-gray-600 mt-1">{f.why}</p>
                {!f.unknown && (
                  <div className="mt-2 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${f.points / f.max >= 0.7 ? 'bg-green-500' : f.points / f.max >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${(f.points / f.max) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <InfoNote title="How this score works">
            Every number above comes from live RDAP, DNS, and DNSBL queries made just now — nothing is
            simulated. This is an infrastructure-hygiene score, not a threat-intelligence verdict: a
            low score means weak trust signals, not confirmed abuse.
          </InfoNote>
        </div>
      )}
    </ToolShell>
  );
}
