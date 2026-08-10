'use client';

import { useState } from 'react';
import { Mail, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { callTool, validateDomain, findSpfRecord } from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, InfoNote, Badge, StatCard, Mono } from './_shared';

export default function MxLookup({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runLookup = async () => {
    setError('');
    setResult(null);
    let domain;
    try {
      domain = validateDomain(target);
    } catch (err) {
      setError(err.message);
      return;
    }
    setLoading(true);
    try {
      const data = await callTool('dns', { target: domain });
      const mx = [...(data.records?.MX || [])].sort((a, b) => a.priority - b.priority);

      // Resolve each MX exchange to its A records (cap to the first 5 by priority).
      const toResolve = mx.slice(0, 5);
      const resolutions = await Promise.allSettled(
        toResolve.map((m) => callTool('dns', { target: m.exchange }))
      );
      const mxWithResolution = mx.map((m, i) => {
        if (i >= toResolve.length) return { ...m, resolution: null }; // not checked
        const res = resolutions[i];
        if (res.status === 'fulfilled') {
          return { ...m, resolution: { ips: res.value.records?.A || [] } };
        }
        return { ...m, resolution: { ips: [], error: res.reason?.message || 'lookup failed' } };
      });

      const spf = findSpfRecord(data.records?.TXT || []);
      setResult({ domain: data.domain, mx: mxWithResolution, spf });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="MX Lookup"
      subtitle="Mail exchanger records, resolution checks, and email readiness"
      icon={Mail}
      accent="teal"
      onClose={onClose}
      width="max-w-3xl"
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={runLookup}
        loading={loading}
        placeholder="example.com"
        accent="teal"
        label="Lookup"
      />

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="MX Records"
              value={result.mx.length}
              level={result.mx.length === 0 ? 'high' : 'low'}
            />
            <StatCard
              label="SPF Record"
              value={result.spf ? 'Present' : 'Missing'}
              level={result.spf ? 'low' : 'medium'}
            />
          </div>

          {result.mx.length === 0 ? (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-800">
                No MX records found for <span className="font-mono font-semibold">{result.domain}</span>.
                This domain cannot receive email at standard mail exchangers. (Some servers fall back
                to the A record, but this is rare and unreliable.)
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Mail exchangers for {result.domain} (by priority)
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {result.mx.map((m, i) => (
                  <div key={i} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="inline-block w-10 text-right font-mono text-sm text-gray-500 shrink-0">
                          {m.priority}
                        </span>
                        <span className="font-mono text-sm text-gray-900 truncate">{m.exchange}</span>
                      </div>
                      {m.resolution === null ? (
                        <Badge level="unknown">not checked</Badge>
                      ) : m.resolution.ips.length > 0 ? (
                        <Badge level="low">
                          <CheckCircle className="w-3 h-3 mr-1" /> resolves
                        </Badge>
                      ) : (
                        <Badge level="high">
                          <XCircle className="w-3 h-3 mr-1" /> no A record
                        </Badge>
                      )}
                    </div>
                    {m.resolution?.ips?.length > 0 && (
                      <p className="mt-1 pl-[3.25rem] text-xs text-gray-500 font-mono">
                        {m.resolution.ips.join(', ')}
                      </p>
                    )}
                    {m.resolution?.error && (
                      <p className="mt-1 pl-[3.25rem] text-xs text-red-600">{m.resolution.error}</p>
                    )}
                  </div>
                ))}
              </div>
              {result.mx.length > 5 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                  Resolution checked for the first 5 exchangers only.
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Email readiness hint: SPF</h3>
            {result.spf ? (
              <Mono>{result.spf}</Mono>
            ) : (
              <InfoNote title="No SPF record found">
                No TXT record starting with "v=spf1" was found on {result.domain}. Without SPF,
                receiving servers cannot verify which hosts are allowed to send mail for this
                domain, which hurts deliverability and enables spoofing.
              </InfoNote>
            )}
          </div>
        </div>
      )}
    </ToolShell>
  );
}
