'use client';

import { useState } from 'react';
import { Globe } from 'lucide-react';
import { callTool, isIPv4 } from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, InfoNote, Mono, CopyButton } from './_shared';

export default function ReverseDnsLookup({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runLookup = async () => {
    setError('');
    setResult(null);
    const ip = target.trim();
    if (!isIPv4(ip)) {
      setError('Please enter a valid IPv4 address (e.g., 8.8.8.8).');
      return;
    }
    setLoading(true);
    try {
      const data = await callTool('ptr', { target: ip });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="Reverse DNS (PTR) Lookup"
      subtitle="Resolve an IPv4 address back to its PTR hostname(s)"
      icon={Globe}
      accent="teal"
      onClose={onClose}
      width="max-w-3xl"
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={runLookup}
        loading={loading}
        placeholder="8.8.8.8"
        accent="teal"
        label="Lookup"
      />

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            PTR records for <span className="font-mono font-semibold text-gray-900">{result.ip}</span>
          </p>

          {result.ptr?.length > 0 ? (
            <div className="space-y-2">
              {result.ptr.map((host, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <Mono>{host}</Mono>
                  </div>
                  <div className="mt-2">
                    <CopyButton text={host} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <InfoNote title="No PTR record">
              {result.error
                ? `The reverse lookup returned: ${result.error}`
                : `No PTR record is published for ${result.ip}.`}{' '}
              Many IPs have no reverse DNS — it must be set by whoever controls the IP block.
              Missing PTR mainly matters for mail servers, where receivers often reject IPs
              without matching forward/reverse DNS.
            </InfoNote>
          )}
        </div>
      )}
    </ToolShell>
  );
}
