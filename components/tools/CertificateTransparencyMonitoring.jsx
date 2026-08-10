'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import {
  ToolShell,
  QueryForm,
  ErrorNote,
  InfoNote,
  Badge,
  StatCard,
} from './_shared';
import { callTool, validateDomain } from '../../utils/security-tools';

// Purely a display threshold on the real crt.sh count — not a verdict.
const HIGH_RECENT_ISSUANCE = 10;

function fmtDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

export default function CertificateTransparencyMonitoring({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const analyze = async () => {
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
      const data = await callTool('ct', { target: domain });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const highRecent = result && result.last30Days > HIGH_RECENT_ISSUANCE;

  return (
    <ToolShell
      title="Certificate Transparency Monitoring"
      subtitle="Certificates logged for a domain, sourced from crt.sh"
      icon={Lock}
      accent="blue"
      onClose={onClose}
      width="max-w-4xl"
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={analyze}
        loading={loading}
        placeholder="example.com"
        accent="blue"
        label="Search logs"
      />

      <ErrorNote>{error}</ErrorNote>

      {!result && !error && (
        <InfoNote title="What this checks">
          Queries public Certificate Transparency logs (via crt.sh) for
          certificates issued for this domain and its subdomains. CT logs reveal
          every publicly issued certificate — useful for spotting unexpected
          issuance and discovering subdomains.
        </InfoNote>
      )}

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total certificates" value={result.total} level="info" />
            <StatCard
              label="Last 30 days"
              value={result.last30Days}
              level={highRecent ? 'medium' : 'low'}
            />
            <StatCard label="Last 90 days" value={result.last90Days} level="info" />
            <StatCard
              label="Unique subdomains"
              value={result.uniqueSubdomains?.length || 0}
              level="info"
            />
          </div>

          {result.total === 0 && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge level="unknown">No certificates found</Badge>
                <span className="text-sm font-semibold text-gray-800">{result.domain}</span>
              </div>
              <p className="text-sm text-gray-700">
                crt.sh returned no logged certificates for this domain. Either no
                publicly trusted certificate has ever been issued for it, or the
                logs have not yet indexed one. Domains without HTTPS deployments
                commonly show zero entries.
              </p>
            </div>
          )}

          {result.total > 0 && (
            <>
              {highRecent ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge level="medium">Elevated recent issuance</Badge>
                  </div>
                  <p className="text-sm text-yellow-800">
                    {result.last30Days} certificates were logged in the last 30
                    days (threshold: {HIGH_RECENT_ISSUANCE}). This can be normal
                    for large infrastructures or frequent short-lived renewals,
                    but if you do not recognize the issuers or names below, verify
                    that all issuance was authorized.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                  Recent issuance volume looks normal: {result.last30Days}{' '}
                  certificate{result.last30Days === 1 ? '' : 's'} logged in the
                  last 30 days.
                </p>
              )}

              {result.issuerDistribution?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Issuers ({result.issuerDistribution.length})
                  </h3>
                  <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {result.issuerDistribution.map((entry, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between px-4 py-2 text-sm"
                      >
                        <span className="text-gray-900 break-all">{entry.issuer}</span>
                        <span className="text-gray-600 shrink-0 ml-4">
                          {entry.count} cert{entry.count === 1 ? '' : 's'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.uniqueSubdomains?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Subdomains seen in certificates ({result.uniqueSubdomains.length})
                  </h3>
                  <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {result.uniqueSubdomains.map((sub, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-800 break-all"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {result.certificates?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">
                    Recent certificates ({result.certificates.length} shown)
                  </h3>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs text-gray-600 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 font-medium">Common name</th>
                          <th className="px-3 py-2 font-medium">Issuer</th>
                          <th className="px-3 py-2 font-medium">Not before</th>
                          <th className="px-3 py-2 font-medium">Not after</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {result.certificates.map((cert, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono text-gray-900 break-all">
                              {cert.commonName || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-700 break-all">
                              {cert.issuer || '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                              {fmtDate(cert.notBefore)}
                            </td>
                            <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                              {fmtDate(cert.notAfter)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

          <InfoNote title="About this data">
            All counts and entries above come directly from crt.sh, an index of
            public Certificate Transparency logs. Logs are append-only but
            indexing can lag by hours, and expired or revoked certificates remain
            listed — presence in a log does not mean a certificate is currently
            in use.
          </InfoNote>
        </div>
      )}
    </ToolShell>
  );
}
