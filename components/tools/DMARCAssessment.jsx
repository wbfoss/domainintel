'use client';

import { useState } from 'react';
import { Mail } from 'lucide-react';
import {
  ToolShell,
  QueryForm,
  ErrorNote,
  InfoNote,
  Badge,
  StatCard,
  CopyButton,
  Mono,
  IssueList,
} from './_shared';
import {
  callTool,
  validateDomain,
  findDmarcRecord,
  parseDmarc,
} from '../../utils/security-tools';

const SEVERITY_PENALTY = { critical: 40, high: 25, medium: 12, low: 4 };
// A record can never grade above its policy strength.
const POLICY_CAP = { reject: 100, quarantine: 89, none: 74 };

function computeGrade(parsed) {
  let score = 100;
  for (const issue of parsed.issues) {
    score -= SEVERITY_PENALTY[issue.severity] || 0;
  }
  const cap = POLICY_CAP[parsed.policy] ?? 39; // missing/unknown policy caps at F territory
  score = Math.max(0, Math.min(score, cap));
  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 75) grade = 'B';
  else if (score >= 60) grade = 'C';
  else if (score >= 40) grade = 'D';
  else grade = 'F';
  const level =
    score >= 90 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical';
  return { grade, score, level };
}

function policyBadgeLevel(policy) {
  if (policy === 'reject') return 'low';
  if (policy === 'quarantine') return 'medium';
  if (policy === 'none') return 'high';
  return 'critical';
}

function TagRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-100 last:border-b-0">
      <span className="text-sm text-gray-600 shrink-0">{label}</span>
      <span className="text-sm font-mono text-gray-900 text-right break-all">
        {value ?? '—'}
      </span>
    </div>
  );
}

export default function DMARCAssessment({ onClose }) {
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
      // DMARC lives at the _dmarc subdomain, not the bare domain.
      const dns = await callTool('dns', { target: `_dmarc.${domain}` });
      const txt = dns?.records?.TXT || [];
      const rawDmarc = findDmarcRecord(txt);
      if (!rawDmarc) {
        setResult({ domain, found: false });
      } else {
        const parsed = parseDmarc(rawDmarc);
        setResult({ domain, found: true, parsed, grade: computeGrade(parsed) });
      }
    } catch (err) {
      // A missing _dmarc record commonly surfaces as an NXDOMAIN-style DNS error.
      if (/enotfound|nxdomain|not\s*found|no\s+records/i.test(err.message)) {
        setResult({ domain, found: false });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="DMARC Assessment"
      subtitle="Live DMARC policy lookup (queries _dmarc.<domain>)"
      icon={Mail}
      accent="purple"
      onClose={onClose}
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={analyze}
        loading={loading}
        placeholder="example.com"
        accent="purple"
        label="Assess"
      />

      <ErrorNote>{error}</ErrorNote>

      {!result && !error && (
        <InfoNote title="What this checks">
          Fetches the live TXT record at <code>_dmarc.&lt;domain&gt;</code> and
          parses the DMARC policy (RFC 7489): enforcement level, subdomain policy,
          coverage percentage, reporting addresses, and alignment modes.
        </InfoNote>
      )}

      {result && !result.found && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge level="critical">No DMARC record</Badge>
              <span className="text-sm font-semibold text-red-800">
                _dmarc.{result.domain}
              </span>
            </div>
            <p className="text-sm text-red-700">
              No TXT record starting with <code>v=DMARC1</code> was found at{' '}
              <code>_dmarc.{result.domain}</code>. Without DMARC, receivers have no
              instruction on what to do with mail that fails SPF/DKIM, and the
              domain owner gets no visibility into spoofing attempts.
            </p>
          </div>
          <InfoNote title="How to fix">
            Publish a TXT record at <code>_dmarc.{result.domain}</code>, starting
            with monitoring mode, e.g.{' '}
            <code>v=DMARC1; p=none; rua=mailto:dmarc@{result.domain}</code>, then
            tighten to <code>p=quarantine</code> and finally <code>p=reject</code>{' '}
            once reports look clean.
          </InfoNote>
        </div>
      )}

      {result?.found && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Grade" value={result.grade.grade} level={result.grade.level} />
            <StatCard
              label="Policy (p)"
              value={result.parsed.policy || 'missing'}
              level={policyBadgeLevel(result.parsed.policy)}
            />
            <StatCard
              label="Coverage (pct)"
              value={`${result.parsed.pct}%`}
              level={result.parsed.pct < 100 ? 'medium' : 'low'}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Raw record — _dmarc.{result.domain}
              </h3>
              <CopyButton text={result.parsed.raw} />
            </div>
            <Mono>{result.parsed.raw}</Mono>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Parsed tags</h3>
            <div className="border border-gray-200 rounded-lg px-4 py-1">
              <TagRow label="Version (v)" value={result.parsed.version} />
              <TagRow label="Policy (p)" value={result.parsed.policy} />
              <TagRow
                label="Subdomain policy (sp)"
                value={result.parsed.subdomainPolicy || 'inherits p'}
              />
              <TagRow label="Percentage (pct)" value={`${result.parsed.pct}%`} />
              <TagRow label="Aggregate reports (rua)" value={result.parsed.rua} />
              <TagRow label="Forensic reports (ruf)" value={result.parsed.ruf} />
              <TagRow label="DKIM alignment (adkim)" value={result.parsed.adkim} />
              <TagRow label="SPF alignment (aspf)" value={result.parsed.aspf} />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Issues ({result.parsed.issues.length})
            </h3>
            {result.parsed.issues.length > 0 ? (
              <IssueList issues={result.parsed.issues} />
            ) : (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                No issues detected in this DMARC record.
              </p>
            )}
          </div>

          <InfoNote title="How the grade is computed">
            Starts at 100, subtracts per issue (critical −40, high −25, medium −12,
            low −4), then caps by policy strength: reject (no cap) &gt; quarantine
            (max 89) &gt; none (max 74) &gt; missing (max 39). Score{' '}
            {result.grade.score}/100 → grade {result.grade.grade}.
          </InfoNote>
        </div>
      )}
    </ToolShell>
  );
}
