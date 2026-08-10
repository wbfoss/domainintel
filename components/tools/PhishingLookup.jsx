'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import {
  callTool,
  validateDomain,
  SUSPICIOUS_TLDS,
  tldOf,
} from '../../utils/security-tools';
import { ToolShell, QueryForm, ErrorNote, InfoNote, Badge, StatCard, IssueList } from './_shared';

// Well-known brand tokens frequently abused in look-alike phishing domains,
// mapped to the brand's legitimate registrable domains.
const BRAND_TOKENS = [
  { token: 'paypal', legit: ['paypal.com'] },
  { token: 'apple', legit: ['apple.com'] },
  { token: 'google', legit: ['google.com'] },
  { token: 'microsoft', legit: ['microsoft.com'] },
  { token: 'amazon', legit: ['amazon.com'] },
  { token: 'netflix', legit: ['netflix.com'] },
  { token: 'facebook', legit: ['facebook.com'] },
  { token: 'instagram', legit: ['instagram.com'] },
  { token: 'whatsapp', legit: ['whatsapp.com'] },
  { token: 'coinbase', legit: ['coinbase.com'] },
  { token: 'binance', legit: ['binance.com'] },
  { token: 'chase', legit: ['chase.com'] },
  { token: 'wellsfargo', legit: ['wellsfargo.com'] },
  { token: 'fedex', legit: ['fedex.com'] },
  { token: 'dhl', legit: ['dhl.com', 'dhl.de'] },
  { token: 'usps', legit: ['usps.com'] },
  { token: 'steam', legit: ['steampowered.com', 'steamcommunity.com'] },
];

function brandConfusability(domain) {
  const bare = domain.replace(/\./g, '');
  for (const { token, legit } of BRAND_TOKENS) {
    if (bare.includes(token) && !legit.some((l) => domain === l || domain.endsWith(`.${l}`))) {
      return { token, legit };
    }
  }
  return null;
}

export default function PhishingLookup({ onClose }) {
  const [target, setTarget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const runAssessment = async () => {
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
      // Gather real signals in parallel; tolerate individual failures.
      const [rdapRes, dnsblRes, httpRes] = await Promise.allSettled([
        callTool('rdap', { target: domain }),
        callTool('dnsbl', { target: domain }),
        callTool('http', { target: domain }),
      ]);

      const rdap = rdapRes.status === 'fulfilled' ? rdapRes.value : null;
      const dnsbl = dnsblRes.status === 'fulfilled' ? dnsblRes.value : null;
      const http = httpRes.status === 'fulfilled' ? httpRes.value : null;

      const signals = []; // {severity, message} — severity drives the score
      let score = 0;

      // 1. Domain age via RDAP (newly-registered domains are a top phishing signal).
      if (rdap) {
        if (rdap.registered === false) {
          signals.push({
            severity: 'info',
            message: 'Domain does not appear to be registered (RDAP). Not an active phishing site, but it could be registered at any time.',
          });
        } else if (typeof rdap.ageInDays === 'number') {
          if (rdap.ageInDays <= 30) {
            score += 3;
            signals.push({
              severity: 'high',
              message: `Domain is only ${rdap.ageInDays} days old (registered ${rdap.registrationDate || 'recently'}). Very new domains are a leading phishing indicator.`,
            });
          } else if (rdap.ageInDays <= 180) {
            score += 1;
            signals.push({
              severity: 'medium',
              message: `Domain is ${rdap.ageInDays} days old — relatively new. Most phishing domains are under 6 months old.`,
            });
          } else {
            signals.push({
              severity: 'low',
              message: `Domain age is ${rdap.ageInDays} days (registered ${rdap.registrationDate || 'unknown'}) — established domains are less commonly used for phishing.`,
            });
          }
        } else {
          signals.push({
            severity: 'info',
            message: 'RDAP did not return a registration date, so domain age could not be assessed.',
          });
        }
      } else {
        signals.push({ severity: 'info', message: `RDAP lookup failed: ${rdapRes.reason?.message || 'unknown error'}. Domain age not assessed.` });
      }

      // 2. Real DNS blocklist hits.
      let dnsblListings = 0;
      if (dnsbl) {
        const checks = dnsbl.checks ? dnsbl.checks : [dnsbl];
        dnsblListings = checks.reduce((s, c) => s + (c.listedCount || 0), 0);
        if (dnsblListings > 0) {
          score += 2;
          const hits = checks
            .flatMap((c) => (c.results || []).filter((r) => r.listed).map((r) => `${r.provider} (${c.ip})`));
          signals.push({
            severity: 'high',
            message: `Resolved IP(s) are listed on ${dnsblListings} DNS blocklist${dnsblListings > 1 ? 's' : ''}: ${hits.join(', ')}.`,
          });
        } else if (dnsbl.resolved === false) {
          signals.push({ severity: 'info', message: 'Domain did not resolve to an IPv4 address, so blocklists could not be checked.' });
        } else {
          signals.push({ severity: 'low', message: 'No listings on the queried DNS blocklists (Spamhaus, Barracuda, SpamCop, SORBS, CBL, PSBL).' });
        }
      } else {
        signals.push({ severity: 'info', message: `DNSBL check failed: ${dnsblRes.reason?.message || 'unknown error'}.` });
      }

      // 3. Suspicious TLD.
      const tld = tldOf(domain);
      const suspiciousTld = SUSPICIOUS_TLDS.includes(tld);
      if (suspiciousTld) {
        score += 1;
        signals.push({
          severity: 'medium',
          message: `TLD ".${tld}" is disproportionately abused for phishing and spam campaigns.`,
        });
      }

      // 4. HTTP reachability / parking.
      if (http) {
        if (http.parking?.parked) {
          signals.push({
            severity: 'info',
            message: `Site appears to be parked${http.parking.indicators?.length ? ` (indicators: ${http.parking.indicators.join(', ')})` : ''} — likely not an active phishing page right now.`,
          });
        } else if (http.https?.reachable) {
          signals.push({
            severity: 'info',
            message: `Site is live over HTTPS (status ${http.https.status}${http.https.server ? `, server: ${http.https.server}` : ''}). Reachability alone is neutral.`,
          });
        } else {
          signals.push({
            severity: 'info',
            message: `Site is not reachable over HTTPS${http.https?.error ? ` (${http.https.error})` : ''} — no live page to serve phishing content at this moment.`,
          });
        }
      } else {
        signals.push({ severity: 'info', message: `HTTP probe failed: ${httpRes.reason?.message || 'unknown error'}.` });
      }

      // 5. Brand-confusability.
      const brand = brandConfusability(domain);
      if (brand) {
        score += 2;
        signals.push({
          severity: 'high',
          message: `Domain contains the brand token "${brand.token}" but is not ${brand.legit.join(' / ')}. Brand look-alike domains are a classic phishing pattern.`,
        });
      }

      const riskLevel = score >= 5 ? 'critical' : score >= 3 ? 'high' : score >= 1 ? 'medium' : 'low';

      setResult({ domain, riskLevel, score, signals, dnsblListings, rdap, suspiciousTld, brand });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const riskLabel = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };

  return (
    <ToolShell
      title="Phishing Risk Assessment"
      subtitle="Heuristic risk scoring from live RDAP, DNS blocklist, TLD, and HTTP signals"
      icon={Shield}
      accent="red"
      onClose={onClose}
      width="max-w-4xl"
    >
      <InfoNote title="Honest scope">
        Live phishing feeds (PhishTank/OpenPhish/Google Safe Browsing) require API keys and are not
        queried here; this is a heuristic risk assessment from open DNS/RDAP signals: domain age,
        real DNS blocklist listings, TLD reputation, site reachability/parking, and brand
        look-alike patterns. A low score does not guarantee a site is safe.
      </InfoNote>

      <QueryForm
        value={target}
        onChange={setTarget}
        onSubmit={runAssessment}
        loading={loading}
        placeholder="suspicious-domain.com"
        accent="red"
        label="Assess"
      />

      <ErrorNote>{error}</ErrorNote>

      {result && (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Heuristic risk for</p>
              <p className="font-mono font-semibold text-gray-900">{result.domain}</p>
            </div>
            <Badge level={result.riskLevel}>{riskLabel[result.riskLevel]} Risk</Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Risk Score" value={result.score} level={result.riskLevel} />
            <StatCard
              label="Domain Age (days)"
              value={
                typeof result.rdap?.ageInDays === 'number' ? result.rdap.ageInDays : 'n/a'
              }
              level={
                typeof result.rdap?.ageInDays === 'number' && result.rdap.ageInDays <= 30
                  ? 'high'
                  : 'info'
              }
            />
            <StatCard
              label="Blocklist Listings"
              value={result.dnsblListings}
              level={result.dnsblListings > 0 ? 'high' : 'low'}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Signals (each contributes to the score above)
            </h3>
            <IssueList issues={result.signals} />
          </div>
        </div>
      )}
    </ToolShell>
  );
}
