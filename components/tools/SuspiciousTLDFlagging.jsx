'use client';

import { useState } from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle, Download } from 'lucide-react';
import { callTool, validateDomain } from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, InfoNote, Badge, StatCard } from './_shared';

const BULK_CAP = 20;

// Categorized TLD reference data (curated from abuse-report reputation).
const tldCategories = {
  highRisk: {
    tlds: ['.tk', '.ml', '.ga', '.cf', '.click', '.download', '.review', '.top', '.win', '.bid',
           '.stream', '.trade', '.racing', '.loan', '.date', '.men', '.cricket', '.party', '.science',
           '.webcam', '.accountant', '.faith', '.link', '.work', '.gq'],
    description: 'Frequently used in phishing, malware distribution, and scam campaigns',
    riskLevel: 'critical',
  },
  mediumRisk: {
    tlds: ['.xyz', '.site', '.online', '.website', '.space', '.live', '.life', '.world', '.today',
           '.email', '.help', '.cloud', '.company', '.business', '.support', '.tech', '.store'],
    description: 'Higher than average abuse rates, require additional verification',
    riskLevel: 'medium',
  },
  lowRisk: {
    tlds: ['.com', '.org', '.net', '.edu', '.gov', '.mil', '.int'],
    description: 'Traditional TLDs with established reputation and stricter registration policies',
    riskLevel: 'low',
  },
  premiumTlds: {
    tlds: ['.io', '.dev', '.app', '.ai', '.co', '.me', '.tv', '.design', '.studio'],
    description: 'Premium TLDs with higher registration costs and generally legitimate use',
    riskLevel: 'very-low',
  },
  countryCode: {
    tlds: ['.us', '.uk', '.ca', '.au', '.de', '.fr', '.jp', '.cn', '.ru', '.br', '.in', '.it', '.es'],
    description: 'Country code TLDs with varying risk levels based on registration policies',
    riskLevel: 'varies',
  },
  newGeneric: {
    tlds: ['.shop', '.blog', '.news', '.club', '.info', '.pro', '.biz', '.name', '.mobi'],
    description: 'Newer generic TLDs with moderate risk profiles',
    riskLevel: 'low-medium',
  },
};

function analyzeTLD(domainName) {
  const parts = domainName.toLowerCase().split('.');
  const tld = '.' + parts[parts.length - 1];
  for (const [category, data] of Object.entries(tldCategories)) {
    if (data.tlds.includes(tld)) {
      return { tld, category, description: data.description, tldRisk: data.riskLevel };
    }
  }
  return {
    tld,
    category: 'unknown',
    description: 'Uncommon or new TLD - risk level uncertain',
    tldRisk: 'unknown',
  };
}

const RISK_ORDER = ['very-low', 'low', 'low-medium', 'medium', 'high', 'critical'];
function escalate(level, steps = 1) {
  const base = RISK_ORDER.includes(level) ? level : 'medium'; // unknown/varies escalate from medium
  const idx = RISK_ORDER.indexOf(base);
  return RISK_ORDER[Math.min(idx + steps, RISK_ORDER.length - 1)];
}

const RISK_BADGE = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'low-medium': 'bg-yellow-50 text-yellow-700 border-yellow-100',
  low: 'bg-green-100 text-green-800 border-green-200',
  'very-low': 'bg-blue-100 text-blue-800 border-blue-200',
  unknown: 'bg-gray-100 text-gray-800 border-gray-200',
  varies: 'bg-purple-100 text-purple-800 border-purple-200',
};
const riskBadge = (risk) => RISK_BADGE[risk] || RISK_BADGE.unknown;

// Analyze one domain: TLD classification (local reference data) enriched with
// live RDAP registration facts. On RDAP failure, fall back to TLD-only.
async function analyzeOne(domainName) {
  const tldAnalysis = analyzeTLD(domainName);
  let rdap = null;
  let rdapError = null;
  try {
    rdap = await callTool('rdap', { target: domainName });
  } catch (err) {
    rdapError = err.message;
  }

  let combinedRisk = tldAnalysis.tldRisk;
  const riskFactors = [];
  if (tldAnalysis.tldRisk === 'critical') riskFactors.push('Commonly abused TLD');
  if (tldAnalysis.tldRisk === 'medium') riskFactors.push('Elevated-abuse TLD');

  const registered = rdap?.registered === true;
  const ageInDays = registered && typeof rdap.ageInDays === 'number' ? rdap.ageInDays : null;

  if (registered) {
    if (ageInDays !== null && ageInDays < 30) {
      riskFactors.push(`Newly registered (${ageInDays} days old)`);
      combinedRisk = escalate(combinedRisk, 2);
    } else if (ageInDays !== null && ageInDays < 90) {
      riskFactors.push(`Recently registered (${ageInDays} days old)`);
      combinedRisk = escalate(combinedRisk, 1);
    }
    if (!rdap.dnssec) riskFactors.push('No DNSSEC');
    if ((rdap.status || []).some((s) => /hold|pending/i.test(s))) {
      riskFactors.push(`Suspicious EPP status: ${rdap.status.filter((s) => /hold|pending/i.test(s)).join(', ')}`);
      combinedRisk = escalate(combinedRisk, 2);
    }
  }

  return {
    domain: domainName,
    ...tldAnalysis,
    rdap,
    rdapError,
    registered,
    ageInDays,
    dnssec: rdap?.dnssec === true,
    registrar: rdap?.registrar || null,
    status: rdap?.status || [],
    combinedRisk,
    riskFactors,
  };
}

export default function SuspiciousTLDFlagging({ onClose }) {
  const [target, setTarget] = useState('');
  const [bulkDomains, setBulkDomains] = useState('');
  const [mode, setMode] = useState('single');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setResults(null);

    let domains;
    try {
      if (mode === 'single') {
        domains = [validateDomain(target)];
      } else {
        const lines = bulkDomains.split('\n').map((d) => d.trim()).filter(Boolean);
        if (lines.length === 0) throw new Error('Please enter at least one domain.');
        domains = [];
        for (const line of lines.slice(0, BULK_CAP)) {
          domains.push(validateDomain(line)); // throws with the offending value's message
        }
      }
    } catch (err) {
      setError(err.message);
      return;
    }

    setLoading(true);
    try {
      const analyzed = [];
      // Small batches to avoid hammering RDAP endpoints.
      for (let i = 0; i < domains.length; i += 4) {
        const batch = await Promise.all(domains.slice(i, i + 4).map(analyzeOne));
        analyzed.push(...batch);
      }

      const statistics = { total: analyzed.length, critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
      for (const r of analyzed) {
        if (r.combinedRisk === 'critical') statistics.critical++;
        else if (r.combinedRisk === 'high') statistics.high++;
        else if (r.combinedRisk === 'medium' || r.combinedRisk === 'low-medium') statistics.medium++;
        else if (r.combinedRisk === 'low' || r.combinedRisk === 'very-low') statistics.low++;
        else statistics.unknown++;
      }
      setResults({ domains: analyzed, statistics });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportResults = () => {
    if (!results) return;
    const csv = [
      'Domain,TLD,Category,TLD Risk,Combined Risk,Registered,Age (days),DNSSEC,Registrar,Risk Factors',
      ...results.domains.map((d) =>
        [
          d.domain, d.tld, d.category, d.tldRisk, d.combinedRisk,
          d.rdapError ? 'rdap-failed' : d.registered,
          d.ageInDays ?? 'N/A', d.dnssec, d.registrar || 'N/A',
          d.riskFactors.join('; '),
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tld-analysis-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const bulkCount = bulkDomains.split('\n').filter((d) => d.trim()).length;

  return (
    <ToolShell
      title="Suspicious TLD Flagging"
      subtitle="TLD reputation combined with live RDAP registration facts"
      icon={AlertTriangle}
      accent="red"
      onClose={onClose}
      width="max-w-4xl"
    >
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setMode('single')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'single' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Single Domain
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            mode === 'bulk' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Bulk Analysis
        </button>
      </div>

      {mode === 'single' ? (
        <QueryForm
          value={target}
          onChange={setTarget}
          onSubmit={run}
          loading={loading}
          placeholder="Enter domain name (e.g., example.tk)"
          accent="red"
          label="Analyze"
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
          className="mb-5 space-y-3"
        >
          <textarea
            value={bulkDomains}
            onChange={(e) => setBulkDomains(e.target.value)}
            placeholder={'Enter domains (one per line)\nexample.tk\nsuspicious.ml\nlegitimate.com'}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows="5"
            disabled={loading}
          />
          <p className="text-xs text-gray-500">
            Bulk analysis is capped at {BULK_CAP} domains per run (each domain triggers a live RDAP
            lookup).{bulkCount > BULK_CAP ? ` Only the first ${BULK_CAP} of ${bulkCount} lines will be analyzed.` : ''}
          </p>
          <button
            type="submit"
            disabled={loading || !bulkDomains.trim()}
            className="w-full px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            {loading ? 'Analyzing…' : `Analyze ${Math.min(bulkCount, BULK_CAP)} Domain${Math.min(bulkCount, BULK_CAP) === 1 ? '' : 's'}`}
          </button>
        </form>
      )}

      <ErrorNote>{error}</ErrorNote>

      {results && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Total" value={results.statistics.total} />
            <StatCard label="Critical" value={results.statistics.critical} level="critical" />
            <StatCard label="High" value={results.statistics.high} level="high" />
            <StatCard label="Medium" value={results.statistics.medium} level="medium" />
            <StatCard label="Low" value={results.statistics.low} level="low" />
          </div>

          {results.domains.length > 1 && (
            <button
              onClick={exportResults}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Export Results as CSV
            </button>
          )}

          <div className="space-y-3">
            {results.domains.map((d, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">{d.domain}</h3>
                    <p className="text-sm text-gray-600">TLD: {d.tld}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border shrink-0 ${riskBadge(d.combinedRisk)}`}>
                    {d.combinedRisk.toUpperCase()} RISK
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 mb-3 text-sm">
                  <div>
                    <p className="text-gray-600 mb-0.5">TLD Category</p>
                    <p className="font-medium capitalize">
                      {d.category.replace(/([A-Z])/g, ' $1').trim()}{' '}
                      <span className={`ml-1 px-2 py-0.5 rounded text-xs font-medium border ${riskBadge(d.tldRisk)}`}>
                        {d.tldRisk.toUpperCase()}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-0.5">Registration (RDAP)</p>
                    {d.rdapError ? (
                      <p className="font-medium text-gray-500">Lookup failed — TLD-only classification</p>
                    ) : (
                      <p className="font-medium">{d.registered ? 'Registered' : 'Not registered / no RDAP record'}</p>
                    )}
                  </div>
                  {d.registered && (
                    <>
                      <div>
                        <p className="text-gray-600 mb-0.5">Domain Age</p>
                        <p className="font-medium">
                          {d.ageInDays !== null ? (
                            <>
                              {d.ageInDays.toLocaleString()} days
                              {d.ageInDays < 30 && <Badge level="critical"> NEW</Badge>}
                            </>
                          ) : (
                            'No registration date in RDAP'
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600 mb-0.5">DNSSEC</p>
                        <p className="font-medium flex items-center gap-1">
                          {d.dnssec ? (
                            <><CheckCircle className="w-4 h-4 text-green-600" /> Enabled</>
                          ) : (
                            <><XCircle className="w-4 h-4 text-red-600" /> Disabled</>
                          )}
                        </p>
                      </div>
                      {d.registrar && (
                        <div>
                          <p className="text-gray-600 mb-0.5">Registrar</p>
                          <p className="font-medium">{d.registrar}</p>
                        </div>
                      )}
                      {d.status.length > 0 && (
                        <div>
                          <p className="text-gray-600 mb-0.5">EPP Status</p>
                          <div className="flex flex-wrap gap-1">
                            {d.status.map((s, i) => (
                              <Badge key={i} level={/hold|pending/i.test(s) ? 'high' : 'info'}>{s}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="bg-gray-50 rounded p-3 text-sm">
                  <p className="text-gray-600 mb-1">Assessment</p>
                  <p className="text-gray-700">{d.description}</p>
                  {d.riskFactors.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {d.riskFactors.map((factor, i) => (
                        <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                          {factor}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Info className="w-5 h-5" />
              TLD Risk Categories Reference
            </h3>
            <div className="space-y-2 text-sm">
              {Object.entries(tldCategories).map(([category, data]) => (
                <div key={category} className="flex items-start gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border shrink-0 ${riskBadge(data.riskLevel)}`}>
                    {data.riskLevel.toUpperCase()}
                  </span>
                  <div>
                    <p className="font-medium capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</p>
                    <p className="text-gray-600 text-xs">{data.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
