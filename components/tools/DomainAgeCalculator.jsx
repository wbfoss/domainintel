'use client';

import { useState } from 'react';
import { Clock, Calendar, AlertCircle, CheckCircle, Server } from 'lucide-react';
import { callTool, validateDomain } from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, InfoNote, Badge, StatCard, CopyButton } from './_shared';

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function DomainAgeCalculator({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
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
      const data = await callTool('rdap', { target: domain });
      setResult({ domain, ...data });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // All figures below come straight from the RDAP response.
  const ageInDays = typeof result?.ageInDays === 'number' ? result.ageInDays : null;
  const ageYears = ageInDays !== null ? Math.floor(ageInDays / 365) : null;
  const ageRemDays = ageInDays !== null ? ageInDays % 365 : null;
  const riskLevel =
    ageInDays === null ? 'unknown' : ageInDays < 30 ? 'critical' : ageInDays < 90 ? 'medium' : 'low';
  const riskCopy = {
    critical: 'Registered less than 30 days ago. Very new domains are disproportionately used in phishing and scam campaigns — treat with caution.',
    medium: 'Registered less than 90 days ago. Recently registered domains warrant extra verification.',
    low: 'This domain has an established registration history.',
    unknown: 'The registry did not return a registration date, so age-based risk cannot be assessed.',
  }[riskLevel];
  const riskBox = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    low: 'bg-green-50 border-green-200 text-green-800',
    unknown: 'bg-gray-50 border-gray-200 text-gray-700',
  }[riskLevel];

  return (
    <ToolShell
      title="Domain Age Calculator"
      subtitle="Exact domain age from live RDAP registry data"
      icon={Clock}
      accent="blue"
      onClose={onClose}
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={run}
        loading={loading}
        placeholder="Enter domain name (e.g., example.com)"
        accent="blue"
        label="Calculate Age"
      />

      <ErrorNote>{error}</ErrorNote>

      {result && !result.registered && (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-gray-500 mt-0.5 shrink-0" />
            <div className="text-sm text-gray-700">
              <p className="font-semibold text-gray-900 mb-1">
                {result.domain} — not registered / no RDAP record
              </p>
              <p>
                The registry returned no RDAP record for this domain. It is either unregistered or its
                registry does not publish RDAP data.
              </p>
              {result.status?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.status.map((s, i) => (
                    <Badge key={i} level="unknown">{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {result && result.registered && (
        <div className="space-y-4">
          {ageInDays !== null ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="Age in Days" value={ageInDays.toLocaleString()} level={riskLevel} />
              <StatCard label="Age" value={`${ageYears}y ${ageRemDays}d`} level={riskLevel} />
              <StatCard label="Risk Level" value={riskLevel.toUpperCase()} level={riskLevel} />
            </div>
          ) : (
            <InfoNote title="No registration date">
              This registry's RDAP record does not include a registration event, so the exact age
              cannot be computed.
            </InfoNote>
          )}

          <div className={`rounded-lg p-4 border ${riskBox}`}>
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              {riskLevel === 'low' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              Age-Based Risk Assessment
            </h3>
            <p className="text-sm">{riskCopy}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Registration Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <p className="text-gray-600">Domain</p>
                <p className="font-semibold text-gray-900 flex items-center gap-2">
                  {result.ldhName || result.domain} <CopyButton text={result.ldhName || result.domain} />
                </p>
              </div>
              <div>
                <p className="text-gray-600">Registrar</p>
                <p className="font-semibold text-gray-900">{result.registrar || 'Not disclosed'}</p>
              </div>
              <div>
                <p className="text-gray-600">Registration Date</p>
                <p className="font-semibold text-gray-900">{formatDate(result.registrationDate) || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-600">Expiration Date</p>
                <p className="font-semibold text-gray-900">{formatDate(result.expirationDate) || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-600">Last Changed</p>
                <p className="font-semibold text-gray-900">{formatDate(result.lastChanged) || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-gray-600">DNSSEC</p>
                <p className="font-semibold flex items-center gap-1.5">
                  {result.dnssec ? (
                    <><CheckCircle className="w-4 h-4 text-green-600" /> Signed</>
                  ) : (
                    <><AlertCircle className="w-4 h-4 text-yellow-600" /> Unsigned</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {result.status?.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm">EPP Status</h3>
              <div className="flex flex-wrap gap-1.5">
                {result.status.map((s, i) => (
                  <Badge key={i} level="info">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {result.nameservers?.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-2 text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                Nameservers ({result.nameservers.length})
              </h3>
              <ul className="text-sm font-mono text-gray-700 space-y-1">
                {result.nameservers.map((ns, i) => (
                  <li key={i}>{ns.toLowerCase()}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
