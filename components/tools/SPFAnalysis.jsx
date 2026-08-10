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
  findSpfRecord,
  parseSpf,
} from '../../utils/security-tools';

const SEVERITY_PENALTY = { critical: 40, high: 25, medium: 12, low: 4 };

function gradeFromIssues(issues) {
  let score = 100;
  for (const issue of issues) {
    score -= SEVERITY_PENALTY[issue.severity] || 0;
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
  return { grade, score, level };
}

function allBadgeLevel(all) {
  if (all === '-') return 'low';
  if (all === '~') return 'medium';
  if (all === '?') return 'medium';
  if (all === '+') return 'critical';
  return 'high'; // no all mechanism
}

export default function SPFAnalysis({ onClose }) {
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
      const dns = await callTool('dns', { target: domain });
      const txt = dns?.records?.TXT || [];
      const rawSpf = findSpfRecord(txt);
      if (!rawSpf) {
        setResult({ domain, found: false, txtCount: txt.length });
      } else {
        const parsed = parseSpf(rawSpf);
        setResult({ domain, found: true, parsed, grade: gradeFromIssues(parsed.issues) });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="SPF Analysis"
      subtitle="Live SPF record lookup and RFC 7208 policy check"
      icon={Mail}
      accent="blue"
      onClose={onClose}
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={analyze}
        loading={loading}
        placeholder="example.com"
        accent="blue"
        label="Analyze"
      />

      <ErrorNote>{error}</ErrorNote>

      {!result && !error && (
        <InfoNote title="What this checks">
          Fetches the domain&apos;s live TXT records via DNS and parses the SPF
          record: mechanisms, qualifiers, the DNS lookup count against the
          10-lookup limit, and the final &quot;all&quot; policy.
        </InfoNote>
      )}

      {result && !result.found && (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Badge level="critical">No SPF record found</Badge>
              <span className="text-sm font-semibold text-red-800">{result.domain}</span>
            </div>
            <p className="text-sm text-red-700">
              No TXT record starting with <code>v=spf1</code> was found
              ({result.txtCount} TXT record{result.txtCount === 1 ? '' : 's'} returned).
              Without SPF, any server can send mail claiming to be from this domain
              and receivers cannot verify the source.
            </p>
          </div>
          <InfoNote title="How to fix">
            Publish a TXT record at the domain root, e.g.{' '}
            <code>v=spf1 include:&lt;your-mail-provider&gt; -all</code>. Use your
            email provider&apos;s documented include, and end with &quot;-all&quot;
            (or &quot;~all&quot; during rollout).
          </InfoNote>
        </div>
      )}

      {result?.found && (
        <div className="space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Grade" value={result.grade.grade} level={result.grade.level} />
            <StatCard
              label="DNS lookups (limit 10)"
              value={`${result.parsed.dnsLookups}/10`}
              level={
                result.parsed.dnsLookups > 10
                  ? 'critical'
                  : result.parsed.dnsLookups > 8
                    ? 'medium'
                    : 'low'
              }
            />
            <StatCard
              label="Mechanisms"
              value={result.parsed.mechanisms.length}
              level="info"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">
                Raw SPF record — {result.domain}
              </h3>
              <CopyButton text={result.parsed.raw} />
            </div>
            <Mono>{result.parsed.raw}</Mono>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              &quot;all&quot; policy:
            </span>
            <Badge level={allBadgeLevel(result.parsed.all)}>
              {result.parsed.all ? `${result.parsed.all}all — ${result.parsed.allLabel}` : 'none set'}
            </Badge>
          </div>

          {result.parsed.mechanisms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Mechanisms</h3>
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-600">
                    <tr>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Value</th>
                      <th className="px-3 py-2 font-medium">Qualifier</th>
                      <th className="px-3 py-2 font-medium">DNS lookups</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {result.parsed.mechanisms.map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-gray-900">{m.type}</td>
                        <td className="px-3 py-2 font-mono text-gray-700 break-all">{m.value}</td>
                        <td className="px-3 py-2 text-gray-700">{m.qualifier || '—'}</td>
                        <td className="px-3 py-2 text-gray-700">{m.lookups}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Issues ({result.parsed.issues.length})
            </h3>
            {result.parsed.issues.length > 0 ? (
              <IssueList issues={result.parsed.issues} />
            ) : (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                No issues detected in this SPF record.
              </p>
            )}
          </div>

          <InfoNote title="How the grade is computed">
            Starts at 100 and subtracts per issue found in the live record:
            critical −40, high −25, medium −12, low −4. Score {result.grade.score}/100
            → grade {result.grade.grade}.
          </InfoNote>
        </div>
      )}
    </ToolShell>
  );
}
