'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import clsx from 'clsx';
import type { HistoryRecord } from '@/lib/types';

interface HistoryCardProps {
  record: HistoryRecord;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

function formatLoanType(type: string): string {
  const map: Record<string, string> = {
    auto: 'Auto Loan',
    personal: 'Personal Loan',
    heloc: 'HELOC',
  };
  return map[type.toLowerCase()] ?? type;
}

function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}

function ChurnBadge({ churn }: { churn: string }) {
  const lower = churn.toLowerCase();
  const config =
    lower === 'low'
      ? 'bg-emerald-100 text-emerald-700'
      : lower === 'medium'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-rose-100 text-rose-700';

  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize',
        config
      )}
    >
      {lower} churn
    </span>
  );
}

export default function HistoryCard({ record }: HistoryCardProps) {
  const [expanded, setExpanded] = useState(false);

  const {
    analyzed_at,
    loan_type,
    loan_amount,
    term_months,
    approved,
    churn_risk,
    dti_projected,
    conditions,
    narrative,
    processing_steps,
    policy_violations,
  } = record;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-shadow hover:shadow-md">
      {/* Card header — always visible */}
      <div className="p-5">
        {/* Top row: date + approval badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-slate-400 font-medium">
              {formatDate(analyzed_at)}
            </p>
            <p className="text-base font-semibold text-slate-800 mt-0.5">
              {formatLoanType(loan_type)} — {formatCurrency(loan_amount)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {term_months} month term
            </p>
          </div>

          {/* Approved / Denied badge */}
          <div
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold shrink-0',
              approved
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'
            )}
          >
            {approved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {approved ? 'Approved' : 'Denied'}
          </div>
        </div>

        {/* DTI + churn risk inline */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-slate-500">
            DTI{' '}
            <span
              className={clsx(
                'font-semibold',
                dti_projected * 100 < 40
                  ? 'text-emerald-600'
                  : dti_projected * 100 <= 45
                  ? 'text-amber-600'
                  : 'text-rose-600'
              )}
            >
              {formatPercent(dti_projected)}
            </span>
          </span>
          <span className="text-slate-300 text-xs">·</span>
          <ChurnBadge churn={churn_risk} />
          {policy_violations.length > 0 && (
            <>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-rose-600 font-medium">
                {policy_violations.length} violation
                {policy_violations.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Expandable section toggle */}
      <div className="border-t border-slate-100">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3 text-xs text-slate-500 hover:bg-slate-50 transition-colors font-medium"
          aria-expanded={expanded}
        >
          <span>{expanded ? 'Hide details' : 'Show details'}</span>
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {expanded && (
          <div className="px-5 pb-5 space-y-4">
            {/* Policy violations */}
            {policy_violations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-2">
                  Policy Violations
                </h4>
                <ul className="space-y-1">
                  {policy_violations.map((v, i) => (
                    <li
                      key={i}
                      className="text-sm text-rose-700 flex items-start gap-1.5"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Conditions */}
            {conditions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Conditions
                </h4>
                <ul className="space-y-1">
                  {conditions.map((c, i) => (
                    <li
                      key={i}
                      className="text-sm text-slate-700 flex items-start gap-1.5"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Narrative */}
            {narrative && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Assessment
                </h4>
                <blockquote className="border-l-4 border-slate-200 pl-3 text-sm text-slate-600 italic leading-relaxed">
                  {narrative}
                </blockquote>
              </div>
            )}

            {/* Processing steps summary */}
            {processing_steps.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Agent Steps ({processing_steps.length})
                </h4>
                <ol className="space-y-1">
                  {processing_steps.map((step, i) => (
                    <li
                      key={i}
                      className="text-xs text-slate-500 flex items-center gap-2"
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold shrink-0">
                        {i + 1}
                      </span>
                      <span className="font-mono">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
