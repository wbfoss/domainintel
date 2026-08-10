'use client';

import { useState } from 'react';
import { Target } from 'lucide-react';
import { callTool, validateDomain } from '../../utils/security-tools';
import {
  ToolShell,
  QueryForm,
  ErrorNote,
  InfoNote,
  Badge,
  StatCard,
} from './_shared';

function HeaderPill({ label, value }) {
  const present = Boolean(value);
  return (
    <div className={`rounded-lg border p-3 text-sm ${present ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
      <p className="font-medium text-gray-900">{label}</p>
      <p className={`mt-0.5 break-all ${present ? 'text-green-700' : 'text-gray-500'}`}>
        {present ? (typeof value === 'string' ? value : 'Present') : 'Not set'}
      </p>
    </div>
  );
}

export default function DomainParkingAnalysis({ onClose }) {
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
      const [httpRes, rdapRes] = await Promise.allSettled([
        callTool('http', { target: domain }),
        callTool('rdap', { target: domain }),
      ]);

      if (httpRes.status === 'rejected') {
        throw new Error(httpRes.reason?.message || 'HTTP analysis failed.');
      }
      const http = httpRes.value;
      const rdap = rdapRes.status === 'fulfilled' ? rdapRes.value : null;

      const parking = http.parking || { parked: false, indicators: [], nameservers: [] };
      const https = http.https || { reachable: false };
      const reachable = Boolean(https.reachable);
      const nsEvidence = parking.nameservers || [];
      const contentEvidence = parking.indicators || [];

      let verdict;
      if (parking.parked) {
        verdict = {
          level: nsEvidence.length ? 'high' : 'medium',
          title: 'Parked',
          text: nsEvidence.length
            ? `The domain is delegated to known parking nameservers (${nsEvidence.join(', ')})${contentEvidence.length ? ' and the page content matches parking patterns' : ''}.`
            : 'The served page content matches known parking-page patterns.',
        };
      } else if (!reachable) {
        verdict = {
          level: 'unknown',
          title: 'Unreachable',
          text: `The site could not be fetched over HTTPS${https.error ? ` (${https.error})` : ''}. No parking nameservers were detected, but without page content the parking status cannot be confirmed either way.`,
        };
      } else {
        verdict = {
          level: 'low',
          title: 'Not parked',
          text: 'The site responded and neither the nameservers nor the page content match known parking patterns.',
        };
      }

      setResult({
        domain,
        parking,
        https,
        reachable,
        securityHeaders: http.securityHeaders || null,
        verdict,
        ageInDays: rdap?.registered && typeof rdap.ageInDays === 'number' ? rdap.ageInDays : null,
        registered: rdap ? rdap.registered !== false : null,
        registrar: rdap?.registrar || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="Domain Parking Analysis"
      subtitle="Server-side parking detection from live nameservers and page content"
      icon={Target}
      accent="orange"
      onClose={onClose}
      width="max-w-4xl"
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={analyze}
        loading={loading}
        placeholder="Enter a domain (e.g., example.com)"
        accent="orange"
        label="Analyze"
      />
      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          <div className="rounded-lg border-2 border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-bold text-gray-900">{result.domain}</h3>
              <Badge level={result.verdict.level}>{result.verdict.title}</Badge>
            </div>
            <p className="text-sm text-gray-700">{result.verdict.text}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="HTTPS status"
              value={result.reachable ? result.https.status : '—'}
              level={result.reachable ? 'low' : 'unknown'}
            />
            <StatCard label="Parking NS matches" value={result.parking.nameservers?.length || 0} />
            <StatCard label="Content indicators" value={result.parking.indicators?.length || 0} />
            <StatCard
              label="Domain age"
              value={result.ageInDays !== null ? `${result.ageInDays} d` : 'unknown'}
            />
          </div>

          {(result.parking.indicators?.length > 0 || result.parking.nameservers?.length > 0) && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Parking evidence</h3>
              {result.parking.nameservers?.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-orange-900 mb-1">Known parking nameservers</p>
                  <p className="text-orange-800 font-mono break-all">
                    {result.parking.nameservers.join(', ')}
                  </p>
                </div>
              )}
              {result.parking.indicators?.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm">
                  <p className="font-medium text-orange-900 mb-1">Content indicators found on the page</p>
                  <ul className="list-disc list-inside text-orange-800 space-y-0.5">
                    {result.parking.indicators.map((ind, i) => (
                      <li key={i}>{ind}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">HTTP response</h3>
            {result.reachable ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">Status</p>
                  <p className="font-mono text-gray-900">{result.https.status}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <p className="text-xs text-gray-600">Server</p>
                  <p className="font-mono text-gray-900">{result.https.server || 'not disclosed'}</p>
                </div>
                {result.https.finalUrl && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 md:col-span-2">
                    <p className="text-xs text-gray-600">Final URL</p>
                    <p className="font-mono text-gray-900 break-all">{result.https.finalUrl}</p>
                  </div>
                )}
                {result.parking.title && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 md:col-span-2">
                    <p className="text-xs text-gray-600">Page title</p>
                    <p className="text-gray-900 break-all">{result.parking.title}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                The site did not respond over HTTPS{result.https.error ? ` — ${result.https.error}` : ''}. HTTP
                details and content-based checks are unavailable for this run.
              </p>
            )}
          </div>

          {result.reachable && result.securityHeaders && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Security headers</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <HeaderPill label="HSTS" value={result.securityHeaders.hsts} />
                <HeaderPill label="CSP" value={result.securityHeaders.csp} />
                <HeaderPill label="X-Frame-Options" value={result.securityHeaders.xFrameOptions} />
                <HeaderPill label="X-Content-Type-Options" value={result.securityHeaders.xContentTypeOptions} />
                <HeaderPill label="Referrer-Policy" value={result.securityHeaders.referrerPolicy} />
                <HeaderPill label="Permissions-Policy" value={result.securityHeaders.permissionsPolicy} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Parking pages rarely set security headers; a full set usually indicates an actively maintained site.
              </p>
            </div>
          )}

          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Registration context</h3>
            {result.registered === false ? (
              <p className="text-sm text-gray-600">RDAP reports this domain as not registered.</p>
            ) : result.ageInDays !== null ? (
              <p className="text-sm text-gray-600">
                Registered {result.ageInDays} days ago
                {result.registrar ? ` via ${result.registrar}` : ''}.{' '}
                {result.parking.parked && result.ageInDays < 90
                  ? 'A recently registered, parked domain is worth watching — parked pages are sometimes weaponized later.'
                  : result.parking.parked
                    ? 'Long-parked domains are usually speculative holdings rather than active threats.'
                    : ''}
              </p>
            ) : (
              <p className="text-sm text-gray-600">RDAP registration data was unavailable for this domain.</p>
            )}
          </div>

          <InfoNote title="How this verdict is made">
            The verdict comes entirely from this live check: delegation to known parking-provider
            nameservers and parking keywords in the fetched page, as detected server-side. No
            confidence percentages are invented — evidence is either present above or it is not.
          </InfoNote>
        </div>
      )}
    </ToolShell>
  );
}
