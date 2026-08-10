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
  Mono,
  IssueList,
} from './_shared';
import { callTool, validateDomain } from '../../utils/security-tools';

const MODERN_PROTOCOLS = ['TLSv1.3', 'TLSv1.2'];

function protocolLevel(protocol) {
  if (protocol === 'TLSv1.3') return 'low';
  if (protocol === 'TLSv1.2') return 'info';
  return 'critical';
}

function computeAssessment(tls) {
  const issues = [];
  let score = 100;

  const protocol = tls.protocol || '';
  if (protocol === 'TLSv1.3') {
    // best current protocol, no penalty
  } else if (protocol === 'TLSv1.2') {
    score -= 5;
    issues.push({
      severity: 'info',
      message: 'Negotiated TLS 1.2 — still acceptable, but TLS 1.3 is preferred.',
    });
  } else {
    score -= 40;
    issues.push({
      severity: 'critical',
      message: `Negotiated ${protocol || 'an unknown protocol'} — outdated and considered weak. TLS 1.2+ is required.`,
    });
  }

  const cert = tls.certificate || {};
  if (cert.expired) {
    score -= 50;
    issues.push({
      severity: 'critical',
      message: `Certificate is EXPIRED (valid until ${cert.validTo}).`,
    });
  } else if (typeof cert.daysRemaining === 'number' && cert.daysRemaining < 30) {
    score -= 15;
    issues.push({
      severity: 'medium',
      message: `Certificate expires in ${cert.daysRemaining} day${cert.daysRemaining === 1 ? '' : 's'} — renew soon.`,
    });
  }

  if (!tls.authorized) {
    score -= 40;
    issues.push({
      severity: 'critical',
      message: `Certificate chain failed validation${tls.authError ? `: ${tls.authError}` : '.'}`,
    });
  }

  score = Math.max(0, score);
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';
  const level =
    score >= 90 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical';
  return { grade, score, level, issues };
}

function Row({ label, value, badge }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 text-right break-all flex items-center gap-2 justify-end">
        {value ?? '—'}
        {badge}
      </span>
    </div>
  );
}

const HEADER_CHECKS = [
  { key: 'hsts', label: 'Strict-Transport-Security (HSTS)' },
  { key: 'csp', label: 'Content-Security-Policy' },
  { key: 'xFrameOptions', label: 'X-Frame-Options' },
  { key: 'xContentTypeOptions', label: 'X-Content-Type-Options' },
  { key: 'referrerPolicy', label: 'Referrer-Policy' },
];

export default function SSLConfigAssessment({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const assess = async () => {
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
      const tls = await callTool('tls', { target: domain });
      let http = null;
      let httpError = '';
      try {
        http = await callTool('http', { target: domain });
      } catch (err) {
        httpError = err.message;
      }
      if (!tls.reachable) {
        setResult({ domain, tls, http: null, httpError: '', assessment: null });
      } else {
        setResult({ domain, tls, http, httpError, assessment: computeAssessment(tls) });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cert = result?.tls?.certificate;
  const headers = result?.http?.securityHeaders;

  return (
    <ToolShell
      title="SSL/TLS Configuration Assessment"
      subtitle="Live TLS handshake and certificate inspection"
      icon={Lock}
      accent="green"
      onClose={onClose}
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={assess}
        loading={loading}
        placeholder="example.com"
        accent="green"
        label="Assess"
      />

      <ErrorNote>{error}</ErrorNote>

      {!result && !error && (
        <InfoNote title="What this checks">
          Performs a real TLS handshake to port 443 and reports the negotiated
          protocol, cipher, and certificate details, plus the security headers
          returned by a live HTTPS request. This is a snapshot of one handshake —
          servers can offer different parameters to different clients.
        </InfoNote>
      )}

      {result && !result.tls.reachable && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge level="critical">Unreachable</Badge>
            <span className="text-sm font-semibold text-red-800">{result.domain}:443</span>
          </div>
          <p className="text-sm text-red-700">
            A TLS connection could not be established
            {result.tls.error ? `: ${result.tls.error}` : '.'} The host may not
            serve HTTPS, may be firewalled, or may be down.
          </p>
        </div>
      )}

      {result?.assessment && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              label="Grade"
              value={result.assessment.grade}
              level={result.assessment.level}
            />
            <StatCard
              label="Protocol"
              value={result.tls.protocol || 'unknown'}
              level={protocolLevel(result.tls.protocol)}
            />
            <StatCard
              label="Days to expiry"
              value={
                cert?.expired
                  ? 'expired'
                  : typeof cert?.daysRemaining === 'number'
                    ? cert.daysRemaining
                    : '—'
              }
              level={
                cert?.expired
                  ? 'critical'
                  : typeof cert?.daysRemaining === 'number' && cert.daysRemaining < 30
                    ? 'medium'
                    : 'low'
              }
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Connection</h3>
            <div className="border border-gray-200 rounded-lg px-4 py-1">
              <Row
                label="Protocol"
                value={result.tls.protocol || 'unknown'}
                badge={
                  <Badge level={protocolLevel(result.tls.protocol)}>
                    {MODERN_PROTOCOLS.includes(result.tls.protocol) ? 'modern' : 'weak/outdated'}
                  </Badge>
                }
              />
              <Row
                label="Cipher"
                value={
                  result.tls.cipher
                    ? `${result.tls.cipher.name} (${result.tls.cipher.bits}-bit)`
                    : '—'
                }
              />
              <Row label="ALPN" value={result.tls.alpn || 'none negotiated'} />
              <Row
                label="HTTP/2"
                value={result.tls.http2 ? 'yes' : 'no'}
                badge={<Badge level={result.tls.http2 ? 'low' : 'unknown'}>{result.tls.http2 ? 'h2' : 'http/1.1'}</Badge>}
              />
              <Row
                label="Chain trusted"
                value={result.tls.authorized ? 'yes' : `no${result.tls.authError ? ` — ${result.tls.authError}` : ''}`}
                badge={
                  <Badge level={result.tls.authorized ? 'low' : 'critical'}>
                    {result.tls.authorized ? 'valid' : 'invalid'}
                  </Badge>
                }
              />
            </div>
          </div>

          {cert && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Certificate</h3>
              <div className="border border-gray-200 rounded-lg px-4 py-1">
                <Row label="Subject" value={cert.subject} />
                <Row label="Issuer" value={cert.issuer} />
                <Row label="Valid from" value={cert.validFrom} />
                <Row label="Valid to" value={cert.validTo} />
                <Row
                  label="Key size"
                  value={cert.keyBits ? `${cert.keyBits} bits` : '—'}
                />
              </div>
              {cert.fingerprint256 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 mb-1">SHA-256 fingerprint</p>
                  <Mono>{cert.fingerprint256}</Mono>
                </div>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Security headers (live HTTPS response)
            </h3>
            {headers ? (
              <div className="border border-gray-200 rounded-lg px-4 py-1">
                {HEADER_CHECKS.map(({ key, label }) => {
                  const v = headers[key];
                  const present = typeof v === 'boolean' ? v : Boolean(v);
                  return (
                    <Row
                      key={key}
                      label={label}
                      value={typeof v === 'string' && v ? v : present ? 'present' : 'absent'}
                      badge={
                        <Badge level={present ? 'low' : 'medium'}>
                          {present ? 'present' : 'absent'}
                        </Badge>
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg p-3">
                Security headers could not be fetched
                {result.httpError ? `: ${result.httpError}` : '.'}
              </p>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Findings ({result.assessment.issues.length})
            </h3>
            {result.assessment.issues.length > 0 ? (
              <IssueList issues={result.assessment.issues} />
            ) : (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                No problems found in this handshake: modern protocol, valid and
                trusted certificate.
              </p>
            )}
          </div>

          <InfoNote title="How the grade is computed">
            Starts at 100; deductions from this handshake only: legacy protocol
            −40 (TLS 1.2 −5), expired certificate −50 (expiring &lt;30 days −15),
            untrusted chain −40. Score {result.assessment.score}/100 → grade{' '}
            {result.assessment.grade}. This reflects a single live handshake, not
            a full scan of every protocol and cipher the server accepts.
          </InfoNote>
        </div>
      )}
    </ToolShell>
  );
}
