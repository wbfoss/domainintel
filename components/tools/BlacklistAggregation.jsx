'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { callTool, validateDomain, isIPv4 } from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, InfoNote, Badge, StatCard, Mono } from './_shared';

// Renders one IP's DNSBL check (provider-by-provider results).
function CheckResults({ check }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
        <span className="font-mono text-sm font-semibold text-gray-900">{check.ip}</span>
        <Badge level={check.listedCount > 0 ? 'high' : 'low'}>
          {check.listedCount > 0
            ? `Listed on ${check.listedCount} of ${check.total}`
            : `Clean on all ${check.total}`}
        </Badge>
      </div>
      <div className="divide-y divide-gray-100">
        {(check.results || []).map((r) => (
          <div key={r.zone} className="px-4 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {r.listed ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : r.unavailable || r.error ? (
                  <Info className="w-4 h-4 text-gray-400 shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                )}
                <span className="text-sm font-medium text-gray-900 truncate">{r.provider}</span>
                <span className="text-xs text-gray-500 font-mono truncate hidden sm:inline">{r.zone}</span>
              </div>
              <Badge level={r.listed ? 'high' : r.unavailable || r.error ? 'unknown' : 'low'}>
                {r.listed ? 'Listed' : r.unavailable || r.error ? 'Unavailable' : 'Not Listed'}
              </Badge>
            </div>
            {(r.unavailable || r.error) && (
              <p className="mt-1 ml-6 text-xs text-gray-500">{r.note || `Query error: ${r.error}`}</p>
            )}
            {r.listed && (r.reason || r.response) && (
              <div className="mt-2 ml-6 text-xs text-gray-700 space-y-1">
                {r.response && (
                  <p>
                    <span className="text-gray-500">Response:</span>{' '}
                    <span className="font-mono">{r.response}</span>
                  </p>
                )}
                {r.reason && (
                  <p>
                    <span className="text-gray-500">Reason:</span> {r.reason}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BlacklistAggregation({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runCheck = async () => {
    setError('');
    setResult(null);
    let query;
    try {
      const trimmed = target.trim();
      query = isIPv4(trimmed) ? trimmed : validateDomain(trimmed);
    } catch (err) {
      setError(err.message);
      return;
    }
    setLoading(true);
    try {
      const data = await callTool('dnsbl', { target: query });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Normalize: an IP query returns a single check; a domain returns checks[] per resolved IP.
  const checks = result ? (result.checks ? result.checks : [result]) : [];
  const totalListings = checks.reduce((sum, c) => sum + (c.listedCount || 0), 0);
  const totalQueries = checks.reduce((sum, c) => sum + (c.total || 0), 0);
  const providerCount = checks.length ? checks[0].total : 0;

  return (
    <ToolShell
      title="DNS Blocklist (DNSBL) Check"
      subtitle="Live queries against real DNS blocklists — Spamhaus, Barracuda, SpamCop, SORBS, CBL, PSBL"
      icon={AlertTriangle}
      accent="red"
      onClose={onClose}
      width="max-w-4xl"
    >
      <InfoNote title="What this checks">
        This tool queries public DNS-based blocklists (DNSBLs) used primarily for email and IP
        reputation: Spamhaus ZEN, Barracuda, SpamCop, SORBS, CBL, and PSBL. Each answer comes
        directly from the blocklist operator over DNS. A listing means the IP has been flagged
        (usually for spam or abuse) — it is not a general malware/phishing verdict.
      </InfoNote>

      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={runCheck}
        loading={loading}
        placeholder="example.com or 203.0.113.5"
        accent="red"
        label="Check"
      />

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          {result.domain && !result.resolved && (
            <ErrorNote>
              {result.domain} did not resolve to any IPv4 address, so no blocklist lookups could be
              performed.
            </ErrorNote>
          )}

          {checks.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Total Listings"
                  value={totalListings}
                  level={totalListings > 0 ? 'high' : 'low'}
                />
                <StatCard label="Blocklists Queried" value={providerCount} level="info" />
                <StatCard
                  label={result.domain ? 'Resolved IPs Checked' : 'Lookups Performed'}
                  value={result.domain ? checks.length : totalQueries}
                  level="info"
                />
              </div>

              {result.domain && result.ips?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    {result.domain} resolved to
                  </h3>
                  <Mono>{result.ips.join('\n')}</Mono>
                </div>
              )}

              <div className="space-y-4">
                {checks.map((check) => (
                  <CheckResults key={check.ip} check={check} />
                ))}
              </div>

              {totalListings === 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-green-800">
                    Not listed on any of the queried DNS blocklists. Note that many commercial
                    reputation systems (Google Safe Browsing, vendor threat feeds) are separate,
                    key-gated services and are not covered by this check.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </ToolShell>
  );
}
