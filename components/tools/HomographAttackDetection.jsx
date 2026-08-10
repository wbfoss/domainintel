'use client';

import { useState } from 'react';
import { Eye, AlertTriangle, ExternalLink } from 'lucide-react';
import { callTool, normalizeDomain } from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, InfoNote, Badge, StatCard, CopyButton } from './_shared';

const MAX_VARIATIONS = 30;

// Confusable Unicode characters that render like common ASCII letters
// (Cyrillic / Greek lookalikes — the ones actually usable in IDN labels).
const HOMOGRAPH_MAPPINGS = {
  a: ['а', 'ɑ', 'α'],
  c: ['с', 'ϲ'],
  e: ['е', 'ё'],
  h: ['һ'],
  i: ['і', 'ι'],
  j: ['ј'],
  k: ['к', 'κ'],
  l: ['ӏ', 'ɩ'],
  m: ['м'],
  n: ['п'],
  o: ['о', 'ο'],
  p: ['р', 'ρ'],
  r: ['г'],
  s: ['ѕ'],
  t: ['т'],
  u: ['υ'],
  v: ['ν'],
  w: ['ԝ'],
  x: ['х', 'χ'],
  y: ['у', 'γ'],
};

function getChanges(original, variation) {
  const changes = [];
  for (let i = 0; i < Math.min(original.length, variation.length); i++) {
    if (original[i] !== variation[i]) {
      changes.push({ position: i, original: original[i], replacement: variation[i] });
    }
  }
  return changes;
}

// Real Unicode single/double substitution variants of the domain label.
function generateHomographVariations(domain) {
  const variations = [];
  const domainParts = domain.split('.');
  const label = domainParts[0];
  const tld = domainParts.slice(1).join('.');

  const push = (newLabel) => {
    if (variations.length >= MAX_VARIATIONS || newLabel === label) return;
    const fullDomain = newLabel + (tld ? '.' + tld : '');
    if (variations.some((v) => v.domain === fullDomain)) return;
    variations.push({
      domain: fullDomain,
      type: 'Unicode Homograph',
      changes: getChanges(label, newLabel),
    });
  };

  // Single-character substitutions first (most convincing lookalikes).
  for (let i = 0; i < label.length && variations.length < MAX_VARIATIONS; i++) {
    const subs = HOMOGRAPH_MAPPINGS[label[i]] || [];
    for (const sub of subs) {
      push(label.slice(0, i) + sub + label.slice(i + 1));
    }
  }
  // Then double substitutions until the cap.
  for (let i = 0; i < label.length && variations.length < MAX_VARIATIONS; i++) {
    const subsI = HOMOGRAPH_MAPPINGS[label[i]] || [];
    for (const si of subsI) {
      for (let j = i + 1; j < label.length && variations.length < MAX_VARIATIONS; j++) {
        const subsJ = HOMOGRAPH_MAPPINGS[label[j]] || [];
        for (const sj of subsJ) {
          push(label.slice(0, i) + si + label.slice(i + 1, j) + sj + label.slice(j + 1));
        }
      }
    }
  }
  return variations;
}

// Flags non-ASCII confusables actually present in the input string.
function detectHomographs(text) {
  const suspicious = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char.charCodeAt(0) > 127) {
      for (const [ascii, homographs] of Object.entries(HOMOGRAPH_MAPPINGS)) {
        if (homographs.includes(char)) {
          suspicious.push({
            position: i,
            character: char,
            looksSimilarTo: ascii,
            codePoint: 'U+' + char.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'),
          });
        }
      }
    }
  }
  return suspicious;
}

// Unicode domains must be checked in punycode (ACE) form. The browser's URL
// parser performs the real IDNA conversion.
function toPunycode(domain) {
  try {
    return new URL('http://' + domain).hostname;
  } catch {
    return null;
  }
}

export default function HomographAttackDetection({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setResult(null);
    const domain = normalizeDomain(target);
    if (!domain || !domain.includes('.')) {
      setError('Please enter a valid domain name (e.g., paypal.com).');
      return;
    }
    setLoading(true);
    try {
      const inputSuspiciousChars = detectHomographs(domain);
      const variations = generateHomographVariations(domain)
        .map((v) => ({ ...v, punycode: toPunycode(v.domain) }))
        .filter((v) => v.punycode && v.punycode !== domain);
      if (variations.length === 0 && inputSuspiciousChars.length === 0) {
        throw new Error('No homograph variants could be generated — the domain has no substitutable characters.');
      }

      let checked = [];
      if (variations.length > 0) {
        // Real registration signal via DNS/RDAP on the server, using ACE form.
        const { results } = await callTool('bulk-registered', {
          domains: variations.map((v) => v.punycode),
        });
        const byDomain = new Map((results || []).map((r) => [r.domain, r]));
        checked = variations.map((v) => {
          const r = byDomain.get(v.punycode);
          return { ...v, registered: r?.registered === true, via: r?.via };
        });
      }

      setResult({
        originalDomain: domain,
        inputSuspiciousChars,
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
      title="Homograph Attack Detection"
      subtitle="Find registered lookalike domains using confusable Unicode characters"
      icon={Eye}
      accent="yellow"
      onClose={onClose}
      width="max-w-4xl"
    >
      <InfoNote title="What are homograph attacks?">
        Attackers register domains where Latin letters are swapped for visually identical Unicode
        characters — e.g. Cyrillic "а" instead of Latin "a". This tool generates such variants of
        your domain and checks (via live DNS/RDAP, in punycode form) which are actually registered.
      </InfoNote>

      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={run}
        loading={loading}
        placeholder="Enter domain name (e.g., paypal.com)"
        accent="yellow"
        label="Detect Homographs"
      />

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          {result.inputSuspiciousChars.length > 0 && (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Suspicious characters detected in your input
              </h3>
              <div className="space-y-2">
                {result.inputSuspiciousChars.map((c, i) => (
                  <div key={i} className="bg-white rounded p-3 border border-red-200 flex items-center gap-4 text-sm">
                    <span className="font-mono text-lg bg-gray-100 px-2 py-1 rounded">{c.character}</span>
                    <div>
                      <p><span className="font-semibold">Position:</span> {c.position}</p>
                      <p>
                        <span className="font-semibold">Looks like:</span>{' '}
                        <span className="font-mono">{c.looksSimilarTo}</span>{' '}
                        <span className="text-gray-500">({c.codePoint})</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.checked.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <StatCard label="Variants Checked" value={result.checked.length} level="info" />
              <StatCard
                label="Registered"
                value={result.registered.length}
                level={result.registered.length > 0 ? 'critical' : 'low'}
              />
              <StatCard label="Not Registered" value={result.available.length} level="low" />
            </div>
          )}

          {result.registered.length > 0 ? (
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Registered Homograph Domains ({result.registered.length}) — active threat surface
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {result.registered.map((v, i) => (
                  <div key={i} className="bg-white rounded p-3 border border-red-200">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{v.domain}</span>
                          <Badge level="critical">registered</Badge>
                          {v.via && <Badge level="unknown">via {v.via}</Badge>}
                        </div>
                        <p className="font-mono text-xs text-gray-500 mt-1 truncate">{v.punycode}</p>
                        <div className="text-xs text-gray-600 mt-1">
                          {v.changes.map((change, ci) => (
                            <span key={ci} className="bg-yellow-100 px-1 rounded mr-1">
                              {change.original}→{change.replacement}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <CopyButton text={v.punycode} />
                        <a
                          href={`https://${v.punycode}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-400 hover:text-gray-700"
                          title="Open (caution: potentially malicious)"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            result.checked.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200 text-sm text-green-800">
                None of the checked homograph variants of {result.originalDomain} are currently
                registered.
              </div>
            )
          )}

          {result.available.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">
                Unregistered Variants Checked ({result.available.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {result.available.map((v, i) => (
                  <div key={i} className="bg-white rounded p-2 border border-gray-200 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-gray-700">{v.domain}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        {v.changes.slice(0, 2).map((c) => `${c.original}→${c.replacement}`).join(' ')}
                      </span>
                    </div>
                    <CopyButton text={v.punycode} />
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
