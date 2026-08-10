'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { callTool, validateDomain } from '../../utils/security-tools';
import {
  ToolShell,
  QueryForm,
  ErrorNote,
  InfoNote,
  Badge,
  StatCard,
  Mono,
} from './_shared';

// Reduce a PTR hostname to its registrable-ish suffix (last two labels) so we
// can estimate hosting diversity across resolved IPs.
function rdnsSuffix(hostname) {
  const labels = (hostname || '').replace(/\.$/, '').split('.').filter(Boolean);
  if (labels.length < 2) return hostname || '';
  return labels.slice(-2).join('.');
}

function nsSuffixes(nameservers) {
  return [...new Set((nameservers || []).map((ns) => rdnsSuffix(ns.toLowerCase())))];
}

export default function FastFluxDetection({ onClose }) {
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
      const [footprintRes, dnsRes] = await Promise.allSettled([
        callTool('ipfootprint', { target: domain }),
        callTool('dns', { target: domain }),
      ]);

      if (footprintRes.status === 'rejected') {
        throw new Error(footprintRes.reason?.message || 'IP footprint lookup failed.');
      }
      const fp = footprintRes.value;
      const dns = dnsRes.status === 'fulfilled' ? dnsRes.value : null;
      const soa = dns?.records?.SOA || null;

      const ipv4 = fp.ipv4 || [];
      const ipv6 = fp.ipv6 || [];
      const nameservers = fp.nameservers || [];
      const ptr = fp.ptr || [];

      const ptrHosts = ptr.flatMap((p) => p.ptr || []);
      const rdnsProviders = [...new Set(ptrHosts.map((h) => rdnsSuffix(h.toLowerCase())))];
      const ipsWithoutPtr = ptr.filter((p) => !(p.ptr || []).length).map((p) => p.ip);
      const nsProviders = nsSuffixes(nameservers);
      const totalIps = ipv4.length + ipv6.length;

      // Indicators computed from the real snapshot. Each is honestly labelled
      // as a weak (single-observation) signal.
      const indicators = [];

      if (ipv4.length >= 10) {
        indicators.push({
          signal: 'medium',
          label: 'Unusually many A records',
          detail: `${ipv4.length} IPv4 addresses returned in one resolution. Large rotating pools are one fast-flux trait, but big CDNs answer the same way.`,
        });
      } else if (ipv4.length >= 5) {
        indicators.push({
          signal: 'low',
          label: 'Several A records',
          detail: `${ipv4.length} IPv4 addresses returned. Common for CDNs and round-robin load balancing; only mildly notable.`,
        });
      }

      if (rdnsProviders.length >= 3) {
        indicators.push({
          signal: 'medium',
          label: 'Diverse reverse-DNS providers',
          detail: `PTR records point at ${rdnsProviders.length} different provider suffixes (${rdnsProviders.join(', ')}). Flux networks often span unrelated hosts; multi-CDN setups can too.`,
        });
      } else if (rdnsProviders.length === 2) {
        indicators.push({
          signal: 'low',
          label: 'Mixed reverse-DNS providers',
          detail: `PTR records span 2 provider suffixes (${rdnsProviders.join(', ')}).`,
        });
      }

      if (totalIps > 0 && ipsWithoutPtr.length === ptr.length && ptr.length > 0) {
        indicators.push({
          signal: 'low',
          label: 'No reverse DNS on any IP',
          detail: 'None of the resolved IPs have PTR records. Typical of cheap or hastily provisioned hosting, but also of many small VPS deployments.',
        });
      }

      if (nsProviders.length >= 3) {
        indicators.push({
          signal: 'low',
          label: 'Nameservers across multiple providers',
          detail: `Delegation spans ${nsProviders.length} distinct NS provider suffixes (${nsProviders.join(', ')}).`,
        });
      }

      if (soa && typeof soa.minttl === 'number' && soa.minttl <= 300) {
        indicators.push({
          signal: 'low',
          label: 'Short SOA minimum TTL',
          detail: `SOA minimum TTL is ${soa.minttl}s. Short TTLs let records change quickly — also standard practice for CDNs and failover setups.`,
        });
      }

      const mediumCount = indicators.filter((i) => i.signal === 'medium').length;
      const summary =
        indicators.length === 0
          ? { level: 'low', text: 'No fast-flux-style traits in this snapshot. The infrastructure looks static and conventional right now.' }
          : mediumCount >= 2
            ? { level: 'medium', text: 'Multiple flux-compatible traits observed. This is still a single snapshot — confirm with repeated resolutions over hours or days before drawing conclusions.' }
            : { level: 'low', text: 'Some flux-compatible traits observed, all also consistent with ordinary CDN or multi-provider hosting. Time-series observation would be needed to say more.' };

      setResult({
        domain,
        ipv4,
        ipv6,
        nameservers,
        ptr,
        rdnsProviders,
        ipsWithoutPtr,
        soa,
        indicators,
        summary,
        dnsFailed: dnsRes.status === 'rejected',
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="Infrastructure Snapshot (Fast-Flux Indicators)"
      subtitle="Point-in-time hosting diversity from live DNS and reverse DNS"
      icon={Globe}
      accent="indigo"
      onClose={onClose}
      width="max-w-4xl"
    >
      <InfoNote title="What this can and cannot tell you">
        True fast-flux detection requires resolving a domain repeatedly over hours or days and
        watching the IP set churn. This tool takes a single live snapshot and reports traits that are
        merely <em>compatible</em> with flux hosting (many A records, diverse reverse DNS, short
        TTLs). Treat every indicator here as a weak signal, never as proof.
      </InfoNote>

      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={analyze}
        loading={loading}
        placeholder="Enter a domain (e.g., example.com)"
        accent="indigo"
        label="Snapshot"
      />
      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          <div className="rounded-lg border-2 border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900">{result.domain}</h3>
              <Badge level={result.summary.level}>
                {result.indicators.length} indicator{result.indicators.length === 1 ? '' : 's'}
              </Badge>
            </div>
            <p className="text-sm text-gray-700">{result.summary.text}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="IPv4 addresses" value={result.ipv4.length} />
            <StatCard label="IPv6 addresses" value={result.ipv6.length} />
            <StatCard label="Nameservers" value={result.nameservers.length} />
            <StatCard label="rDNS providers" value={result.rdnsProviders.length} />
          </div>

          {result.indicators.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Observed indicators (single snapshot)</h3>
              {result.indicators.map((ind, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{ind.label}</span>
                    <Badge level={ind.signal === 'medium' ? 'medium' : 'info'}>
                      {ind.signal} signal
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{ind.detail}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Resolved addresses and reverse DNS</h3>
            {result.ptr.length === 0 && result.ipv4.length === 0 && result.ipv6.length === 0 ? (
              <p className="text-sm text-gray-600">The domain did not resolve to any IP addresses.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">IP address</th>
                      <th className="px-4 py-2 font-medium">Reverse DNS (PTR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.ptr.map((entry) => (
                      <tr key={entry.ip}>
                        <td className="px-4 py-2 font-mono text-gray-900">{entry.ip}</td>
                        <td className="px-4 py-2 text-gray-700">
                          {(entry.ptr || []).length ? entry.ptr.join(', ') : <span className="text-gray-400">no PTR record</span>}
                        </td>
                      </tr>
                    ))}
                    {result.ipv6.filter((ip) => !result.ptr.some((p) => p.ip === ip)).map((ip) => (
                      <tr key={ip}>
                        <td className="px-4 py-2 font-mono text-gray-900">{ip}</td>
                        <td className="px-4 py-2 text-gray-400">not checked</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {result.nameservers.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Nameservers</h3>
              <Mono>{result.nameservers.join('\n')}</Mono>
            </div>
          )}

          {result.soa ? (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">SOA record</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">Primary NS</p>
                  <p className="font-mono text-gray-900 break-all">{result.soa.nsname}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">Refresh</p>
                  <p className="font-mono text-gray-900">{result.soa.refresh}s</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">Retry</p>
                  <p className="font-mono text-gray-900">{result.soa.retry}s</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">Minimum TTL</p>
                  <p className="font-mono text-gray-900">{result.soa.minttl}s</p>
                </div>
              </div>
            </div>
          ) : (
            !result.dnsFailed && (
              <p className="text-sm text-gray-500">No SOA record was returned for this domain.</p>
            )
          )}
          {result.dnsFailed && (
            <p className="text-sm text-gray-500">
              The supplementary DNS lookup failed, so SOA/TTL details are unavailable.
            </p>
          )}
        </div>
      )}
    </ToolShell>
  );
}
