'use client';

import { useState } from 'react';
import { Server } from 'lucide-react';
import { callTool, validateDomain } from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, CopyButton, Mono } from './_shared';

function RecordSection({ title, count, children }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">{count === 0 ? 'none' : `${count} record${count > 1 ? 's' : ''}`}</span>
      </div>
      <div className="p-3">
        {count === 0 ? <p className="text-sm text-gray-400 italic">none</p> : children}
      </div>
    </div>
  );
}

export default function DnsLookup({ onClose }) {
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
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const r = result?.records || {};
  const mx = [...(r.MX || [])].sort((a, b) => a.priority - b.priority);

  return (
    <ToolShell
      title="DNS Lookup"
      subtitle="Live DNS records — A, AAAA, MX, NS, TXT, CNAME, SOA"
      icon={Server}
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
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Records for <span className="font-mono font-semibold text-gray-900">{result.domain}</span>
          </p>

          <RecordSection title="A (IPv4)" count={(r.A || []).length}>
            <Mono>{(r.A || []).join('\n')}</Mono>
          </RecordSection>

          <RecordSection title="AAAA (IPv6)" count={(r.AAAA || []).length}>
            <Mono>{(r.AAAA || []).join('\n')}</Mono>
          </RecordSection>

          <RecordSection title="MX (Mail Exchange)" count={mx.length}>
            <div className="space-y-1">
              {mx.map((m, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="inline-block w-14 text-right font-mono text-gray-500">{m.priority}</span>
                  <span className="font-mono text-gray-900">{m.exchange}</span>
                </div>
              ))}
            </div>
          </RecordSection>

          <RecordSection title="NS (Nameservers)" count={(r.NS || []).length}>
            <Mono>{(r.NS || []).join('\n')}</Mono>
          </RecordSection>

          <RecordSection title="TXT" count={(r.TXT || []).length}>
            <div className="space-y-2">
              {(r.TXT || []).map((t, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Mono>{t}</Mono>
                  </div>
                  <div className="mt-2">
                    <CopyButton text={t} />
                  </div>
                </div>
              ))}
            </div>
          </RecordSection>

          <RecordSection title="CNAME" count={(r.CNAME || []).length}>
            <Mono>{(r.CNAME || []).join('\n')}</Mono>
          </RecordSection>

          <RecordSection title="SOA (Start of Authority)" count={r.SOA ? 1 : 0}>
            {r.SOA && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Primary NS</p>
                  <p className="font-mono text-gray-900 break-all">{r.SOA.nsname}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Serial</p>
                  <p className="font-mono text-gray-900">{r.SOA.serial}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Refresh</p>
                  <p className="font-mono text-gray-900">{r.SOA.refresh}s</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Retry</p>
                  <p className="font-mono text-gray-900">{r.SOA.retry}s</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Expire</p>
                  <p className="font-mono text-gray-900">{r.SOA.expire}s</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Minimum TTL</p>
                  <p className="font-mono text-gray-900">{r.SOA.minttl}s</p>
                </div>
              </div>
            )}
          </RecordSection>
        </div>
      )}
    </ToolShell>
  );
}
