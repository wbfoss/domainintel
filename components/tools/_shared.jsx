'use client';

import { AlertTriangle, X, Search, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';

// Static Tailwind class maps per accent (dynamic `bg-${x}` classes get purged).
const ACCENT = {
  blue:   { iconBg: 'bg-blue-100',   iconText: 'text-blue-600',   ring: 'focus:ring-blue-500',   btn: 'bg-blue-600 hover:bg-blue-700' },
  purple: { iconBg: 'bg-purple-100', iconText: 'text-purple-600', ring: 'focus:ring-purple-500', btn: 'bg-purple-600 hover:bg-purple-700' },
  yellow: { iconBg: 'bg-yellow-100', iconText: 'text-yellow-600', ring: 'focus:ring-yellow-500', btn: 'bg-yellow-600 hover:bg-yellow-700' },
  green:  { iconBg: 'bg-green-100',  iconText: 'text-green-600',  ring: 'focus:ring-green-500',  btn: 'bg-green-600 hover:bg-green-700' },
  red:    { iconBg: 'bg-red-100',    iconText: 'text-red-600',    ring: 'focus:ring-red-500',    btn: 'bg-red-600 hover:bg-red-700' },
  indigo: { iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', ring: 'focus:ring-indigo-500', btn: 'bg-indigo-600 hover:bg-indigo-700' },
  orange: { iconBg: 'bg-orange-100', iconText: 'text-orange-600', ring: 'focus:ring-orange-500', btn: 'bg-orange-600 hover:bg-orange-700' },
  teal:   { iconBg: 'bg-teal-100',   iconText: 'text-teal-600',   ring: 'focus:ring-teal-500',   btn: 'bg-teal-600 hover:bg-teal-700' },
};
const accentOf = (a) => ACCENT[a] || ACCENT.blue;

// Modal shell used by every tool.
export function ToolShell({ title, subtitle, icon: Icon, accent = 'blue', onClose, children, width = 'max-w-3xl' }) {
  const a = accentOf(accent);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className={`bg-white rounded-lg shadow-xl ${width} w-full max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`${a.iconBg} p-2 rounded-lg`}>
              <Icon className={`w-6 h-6 ${a.iconText}`} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{title}</h2>
              {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// Single-line query form with a submit button.
export function QueryForm({ value, onChange, onSubmit, loading, placeholder, accent = 'blue', label = 'Analyze', disabled }) {
  const a = accentOf(accent);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="mb-5"
    >
      <div className="flex gap-3">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={loading}
          className={`flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 ${a.ring} focus:border-transparent`}
        />
        <button
          type="submit"
          disabled={loading || disabled || !value.trim()}
          className={`px-5 py-2.5 ${a.btn} text-white rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap`}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          {loading ? 'Analyzing…' : label}
        </button>
      </div>
    </form>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
      <p className="text-red-700 text-sm">{children}</p>
    </div>
  );
}

export function InfoNote({ title, children }) {
  return (
    <div className="mb-5 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
      {title && <p className="font-semibold mb-1">{title}</p>}
      <p>{children}</p>
    </div>
  );
}

const RISK_STYLES = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-green-100 text-green-800 border-green-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  unknown: 'bg-gray-100 text-gray-700 border-gray-200',
};

export function Badge({ level = 'info', children }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${RISK_STYLES[level] || RISK_STYLES.info}`}>
      {children}
    </span>
  );
}

export function StatCard({ label, value, level }) {
  const color = {
    critical: 'text-red-600', high: 'text-orange-600', medium: 'text-yellow-600',
    low: 'text-green-600', info: 'text-blue-600', unknown: 'text-gray-600',
  }[level] || 'text-gray-900';
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 text-center">
      <p className="text-xs text-gray-600 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

export function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-gray-400 hover:text-gray-700"
      title="Copy"
    >
      {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

// Renders a monospace record block.
export function Mono({ children }) {
  return (
    <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap break-all">
      {children}
    </div>
  );
}

export function IssueList({ issues }) {
  if (!issues?.length) return null;
  return (
    <div className="space-y-2">
      {issues.map((issue, i) => (
        <div key={i} className={`rounded-lg p-3 border text-sm ${RISK_STYLES[issue.severity] || RISK_STYLES.info}`}>
          <span className="font-semibold uppercase text-xs mr-2">{issue.severity}</span>
          {issue.message}
        </div>
      ))}
    </div>
  );
}
