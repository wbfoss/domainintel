'use client';

import { useState } from 'react';
import { Search, AlertTriangle, ExternalLink } from 'lucide-react';
import { callTool, validateDomain } from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, InfoNote, Badge, StatCard, CopyButton } from './_shared';

const MAX_VARIATIONS = 40;

// Pure string generation of common typo variants (omission / insertion /
// substitution / adjacent QWERTY keys). Registration status is NOT guessed
// here — it comes from the bulk-registered API.
function generateTyposquatVariations(domain) {
  const variations = [];
  const baseDomain = domain.toLowerCase();

  const substitutions = {
    a: ['e', 'o', 's', 'q'],
    e: ['a', 'i', 'o'],
    i: ['o', 'u', 'e'],
    o: ['i', 'u', 'a', '0'],
    u: ['i', 'o', 'y'],
    l: ['1', 'i'],
    m: ['n', 'rn'],
    n: ['m', 'h'],
    r: ['t'],
    t: ['r'],
    s: ['5', 'z'],
    z: ['s'],
    0: ['o'],
    1: ['l', 'i'],
  };

  // Character omission
  for (let i = 0; i < baseDomain.length; i++) {
    const omitted = baseDomain.slice(0, i) + baseDomain.slice(i + 1);
    if (omitted.length > 2 && omitted.includes('.')) {
      variations.push({ domain: omitted, type: 'Character Omission' });
    }
  }

  // Character insertion
  const commonInserts = ['a', 'e', 'i', 'o', 'u', 'l', 'r', 'n', 'm'];
  for (let i = 0; i <= baseDomain.length; i++) {
    commonInserts.forEach((char) => {
      const inserted = baseDomain.slice(0, i) + char + baseDomain.slice(i);
      if (inserted !== baseDomain && inserted.includes('.')) {
        variations.push({ domain: inserted, type: 'Character Insertion' });
      }
    });
  }

  // Character substitution
  for (let i = 0; i < baseDomain.length; i++) {
    const currentChar = baseDomain[i];
    if (substitutions[currentChar]) {
      substitutions[currentChar].forEach((newChar) => {
        const substituted = baseDomain.slice(0, i) + newChar + baseDomain.slice(i + 1);
        if (substituted !== baseDomain) {
          variations.push({ domain: substituted, type: 'Character Substitution' });
        }
      });
    }
  }

  // Adjacent key substitution (QWERTY keyboard)
  const qwertyMap = {
    q: ['w'], w: ['q', 'e'], e: ['w', 'r'], r: ['e', 't'], t: ['r', 'y'],
    y: ['t', 'u'], u: ['y', 'i'], i: ['u', 'o'], o: ['i', 'p'], p: ['o'],
    a: ['s'], s: ['a', 'd'], d: ['s', 'f'], f: ['d', 'g'], g: ['f', 'h'],
    h: ['g', 'j'], j: ['h', 'k'], k: ['j', 'l'], l: ['k'],
    z: ['x'], x: ['z', 'c'], c: ['x', 'v'], v: ['c', 'b'], b: ['v', 'n'],
    n: ['b', 'm'], m: ['n'],
  };

  for (let i = 0; i < baseDomain.length; i++) {
    const currentChar = baseDomain[i];
    if (qwertyMap[currentChar]) {
      qwertyMap[currentChar].forEach((newChar) => {
        const substituted = baseDomain.slice(0, i) + newChar + baseDomain.slice(i + 1);
        if (substituted !== baseDomain) {
          variations.push({ domain: substituted, type: 'Adjacent Key' });
        }
      });
    }
  }

  // De-duplicate and cap so the registration check stays fast.
  return variations
    .filter((v, index, self) => index === self.findIndex((t) => t.domain === v.domain))
    .slice(0, MAX_VARIATIONS);
}

const TYPE_LEVEL = {
  'Character Omission': 'medium',
  'Character Insertion': 'medium',
  'Character Substitution': 'medium',
  'Adjacent Key': 'medium',
};

export default function TyposquattingDetection({ onClose }) {
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
      const variations = generateTyposquatVariations(domain);
      if (variations.length === 0) {
        throw new Error('No typo variations could be generated for this domain.');
      }
      // Real registration signal via DNS/RDAP on the server.
      const { results } = await callTool('bulk-registered', {
        domains: variations.map((v) => v.domain),
      });
      const byDomain = new Map((results || []).map((r) => [r.domain, r]));
      const checked = variations.map((v) => {
        const r = byDomain.get(v.domain);
        return { ...v, registered: r?.registered === true, via: r?.via };
      });
      setResult({
        originalDomain: domain,
        checked,
        registered: checked.filter((v) => v.registered),
        available: checked.filter((v) => !v.registered),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolShell
      title="Typosquatting Detection"
      subtitle="Generate typo variants and check which are actually registered"
      icon={Search}
      accent="purple"
      onClose={onClose}
      width="max-w-4xl"
    >
      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={run}
        loading={loading}
        placeholder="Enter domain name (e.g., google.com)"
        accent="purple"
        label="Detect Variations"
      />

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard label="Variations Checked" value={result.checked.length} level="info" />
            <StatCard
              label="Registered"
              value={result.registered.length}
              level={result.registered.length > 0 ? 'high' : 'low'}
            />
            <StatCard label="Available" value={result.available.length} level="low" />
          </div>

          <InfoNote title="How this works">
            Up to {MAX_VARIATIONS} typo variants of {result.originalDomain} (omission, insertion,
            substitution, adjacent-key) were checked against live DNS/RDAP. A registered variant is
            a real, existing domain — a potential typosquat worth reviewing.
          </InfoNote>

          {result.registered.length > 0 ? (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Registered Typo Variants ({result.registered.length}) — higher risk
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {result.registered.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white rounded p-3 border border-red-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-sm truncate">{v.domain}</span>
                      <Badge level={TYPE_LEVEL[v.type] || 'medium'}>{v.type}</Badge>
                      {v.via && <Badge level="unknown">via {v.via}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <CopyButton text={v.domain} />
                      <a
                        href={`https://${v.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-700"
                        title="Open (caution: potentially malicious)"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-sm text-green-800">
              None of the checked typo variants are currently registered.
            </div>
          )}

          {result.available.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">
                Available Variants ({result.available.length}) — could be defensively registered
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {result.available.map((v, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-white rounded p-2 border border-gray-200"
                  >
                    <span className="font-mono text-xs text-gray-700 truncate">{v.domain}</span>
                    <CopyButton text={v.domain} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
