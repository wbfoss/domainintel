'use client';

import { useState } from 'react';
import { Key, Search, CheckCircle, XCircle } from 'lucide-react';
import { callTool, validateDomain } from '../../utils/security-tools';
import { ToolShell, ErrorNote, InfoNote, Badge, Mono, CopyButton } from './_shared';

const COMMON_SELECTORS = ['default', 'google', 'selector1', 'selector2', 'k1', 'dkim', 'mail'];
const SELECTOR_RE = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

// Parse DKIM tag=value pairs from a raw TXT record.
function parseDkimTags(raw) {
  const tags = {};
  raw.split(';').forEach((seg) => {
    const idx = seg.indexOf('=');
    if (idx === -1) return;
    const k = seg.slice(0, idx).trim().toLowerCase();
    const v = seg.slice(idx + 1).trim();
    if (k) tags[k] = v;
  });
  return tags;
}

export default function DkimLookup({ onClose }) {
  const [selector, setSelector] = useState('default');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runLookup = async () => {
    setError('');
    setResult(null);
    let cleanDomain;
    const cleanSelector = selector.trim();
    try {
      if (!SELECTOR_RE.test(cleanSelector)) {
        throw new Error('Please enter a valid DKIM selector (letters, digits, hyphens).');
      }
      cleanDomain = validateDomain(domain);
    } catch (err) {
      setError(err.message);
      return;
    }
    const queryName = `${cleanSelector}._domainkey.${cleanDomain}`;
    setLoading(true);
    try {
      const data = await callTool('dns', { target: queryName });
      const txt = data.records?.TXT || [];
      const record = txt.find((t) => /v=DKIM1/i.test(t) || /(^|;)\s*k=/i.test(t)) || null;
      setResult({
        queryName,
        selector: cleanSelector,
        domain: cleanDomain,
        record,
        tags: record ? parseDkimTags(record) : null,
        cname: data.records?.CNAME || [],
      });
    } catch (err) {
      // The dns action errors when the name doesn't exist — treat as "not found".
      setResult({ queryName, selector: cleanSelector, domain: cleanDomain, record: null, tags: null, cname: [], lookupError: err.message });
    } finally {
      setLoading(false);
    }
  };

  const TagRow = ({ label, present, value }) => (
    <div className="flex items-center justify-between px-4 py-2.5">
      <div className="flex items-center gap-2 min-w-0">
        {present ? (
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <XCircle className="w-4 h-4 text-gray-300 shrink-0" />
        )}
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
      <span className="text-sm font-mono text-gray-600 truncate max-w-[50%]">{value}</span>
    </div>
  );

  return (
    <ToolShell
      title="DKIM Lookup"
      subtitle="Fetch and parse a domain's DKIM public key record for a given selector"
      icon={Key}
      accent="teal"
      onClose={onClose}
      width="max-w-3xl"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runLookup();
        }}
        className="mb-5"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={selector}
            onChange={(e) => setSelector(e.target.value)}
            placeholder="selector (e.g., default)"
            disabled={loading}
            className="sm:w-48 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading || !domain.trim() || !selector.trim()}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? 'Analyzing…' : 'Lookup'}
          </button>
        </div>
      </form>

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600">
            Queried <span className="font-mono font-semibold text-gray-900">{result.queryName}</span> (TXT)
          </p>

          {result.record ? (
            <>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <Mono>{result.record}</Mono>
                </div>
                <div className="mt-2">
                  <CopyButton text={result.record} />
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Parsed tags</h3>
                  <Badge level={result.tags?.p ? 'low' : 'high'}>
                    {result.tags?.p ? 'Public key present' : 'No public key (revoked?)'}
                  </Badge>
                </div>
                <div className="divide-y divide-gray-100">
                  <TagRow
                    label="v — version"
                    present={!!result.tags?.v}
                    value={result.tags?.v || 'not set (DKIM1 implied)'}
                  />
                  <TagRow
                    label="k — key type"
                    present={!!result.tags?.k}
                    value={result.tags?.k || 'not set (rsa implied)'}
                  />
                  <TagRow
                    label="p — public key"
                    present={!!result.tags?.p}
                    value={
                      result.tags?.p
                        ? `${result.tags.p.length} base64 chars`
                        : 'empty — an empty p= means the key is revoked'
                    }
                  />
                </div>
              </div>
            </>
          ) : (
            <InfoNote title={`No DKIM record found for selector "${result.selector}"`}>
              No TXT record containing "v=DKIM1" or a "k=" tag was found at {result.queryName}
              {result.lookupError ? ` (${result.lookupError})` : ''}. This does not mean the domain
              has no DKIM — selectors vary by mail provider and are only discoverable from an
              actual email header (the "s=" tag of the DKIM-Signature). Common selectors to try:{' '}
              {COMMON_SELECTORS.join(', ')}.
            </InfoNote>
          )}

          {result.cname.length > 0 && !result.record && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                CNAME found at this name (key may be delegated)
              </h3>
              <Mono>{result.cname.join('\n')}</Mono>
            </div>
          )}
        </div>
      )}
    </ToolShell>
  );
}
