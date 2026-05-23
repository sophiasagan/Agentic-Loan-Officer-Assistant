'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { LoanAnalysisResponse } from '@/lib/types';
import ProcessingSteps from './ProcessingSteps';

interface ResultPanelProps {
  result: LoanAnalysisResponse | null;
  loading: boolean;
  error: string | null;
}

function formatPercent(decimal: number): string {
  return `${(decimal * 100).toFixed(1)}%`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatLoanType(type: string): string {
  const map: Record<string, string> = {
    auto: 'Auto Loan',
    personal: 'Personal Loan',
    heloc: 'HELOC',
  };
  return map[type.toLowerCase()] ?? type;
}

function DTICard({ dti }: { dti: number }) {
  const pct = dti * 100;
  const color =
    pct < 40
      ? { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Healthy' }
      : pct <= 45
      ? { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Elevated' }
      : { bg: 'bg-rose-50', text: 'text-rose-700', label: 'High' };

  return (
    <div className={clsx('rounded-xl p-4 flex flex-col gap-1', color.bg)}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Projected DTI
      </span>
      <span className={clsx('text-2xl font-bold', color.text)}>
        {formatPercent(dti)}
      </span>
      <span className={clsx('text-xs font-medium', color.text)}>
        {color.label}
      </span>
    </div>
  );
}

function ChurnCard({ churn }: { churn: string }) {
  const lower = churn.toLowerCase();
  const config =
    lower === 'low'
      ? { bg: 'bg-emerald-50', text: 'text-emerald-700' }
      : lower === 'medium'
      ? { bg: 'bg-amber-50', text: 'text-amber-700' }
      : { bg: 'bg-rose-50', text: 'text-rose-700' };

  return (
    <div className={clsx('rounded-xl p-4 flex flex-col gap-1', config.bg)}>
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Churn Risk
      </span>
      <span className={clsx('text-2xl font-bold capitalize', config.text)}>
        {lower}
      </span>
      <span className={clsx('text-xs font-medium', config.text)}>
        Retention
      </span>
    </div>
  );
}

function PolicyCard({ violations }: { violations: string[] }) {
  const passed = violations.length === 0;
  return (
    <div
      className={clsx(
        'rounded-xl p-4 flex flex-col gap-1',
        passed ? 'bg-emerald-50' : 'bg-rose-50'
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Policy
      </span>
      <span
        className={clsx(
          'text-xl font-bold',
          passed ? 'text-emerald-700' : 'text-rose-700'
        )}
      >
        {passed ? '✓ Passed' : '✗ Violations'}
      </span>
      <span
        className={clsx(
          'text-xs font-medium',
          passed ? 'text-emerald-600' : 'text-rose-600'
        )}
      >
        {passed ? 'All checks clear' : `${violations.length} issue${violations.length !== 1 ? 's' : ''}`}
      </span>
    </div>
  );
}

// Skeleton pulse components for loading state
function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={clsx('bg-slate-200 rounded animate-pulse', className)} />
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      {/* Agent running banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
        <div className="flex-shrink-0">
          <svg
            className="animate-spin h-6 w-6 text-blue-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-blue-800">
            🤖 Agent is running
            <span className="inline-block">
              <AnimatedDots />
            </span>
          </p>
          <p className="text-sm text-blue-600 mt-0.5">
            Fetching member profile, running risk models, and checking policy. This typically takes 20–40 seconds.
          </p>
        </div>
      </div>

      {/* Approval banner skeleton */}
      <SkeletonBlock className="h-20 rounded-2xl" />

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-3 gap-3">
        <SkeletonBlock className="h-24 rounded-xl" />
        <SkeletonBlock className="h-24 rounded-xl" />
        <SkeletonBlock className="h-24 rounded-xl" />
      </div>

      {/* Narrative skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
        <SkeletonBlock className="h-4 w-24" />
        <SkeletonBlock className="h-3 w-full" />
        <SkeletonBlock className="h-3 w-5/6" />
        <SkeletonBlock className="h-3 w-4/6" />
      </div>

      {/* Processing steps skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <SkeletonBlock className="h-4 w-40" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <SkeletonBlock className="h-8 w-8 rounded-full shrink-0" />
            <SkeletonBlock className="h-3 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedDots() {
  return <span className="animated-dots" />;
}

export default function ResultPanel({
  result,
  loading,
}: ResultPanelProps) {
  // Empty state
  if (!result && !loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center py-20 px-8 text-center">
        <div className="text-6xl mb-5" role="img" aria-label="Bank">
          🏦
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">
          Ready to analyze
        </h2>
        <p className="text-slate-500 text-sm max-w-xs">
          Fill in the member details on the left and click &quot;Analyze Loan →&quot; to run an AI-powered assessment.
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Result state
  if (!result) return null;

  const {
    member_id,
    loan_type,
    loan_amount,
    approved,
    churn_risk,
    dti_projected,
    policy_violations,
    conditions,
    narrative,
    processing_steps,
  } = result;

  return (
    <div className="space-y-4">
      {/* 1. Approval banner */}
      <div
        className={clsx(
          'rounded-2xl px-6 py-5 flex items-center gap-4',
          approved
            ? 'bg-emerald-500 text-white'
            : 'bg-rose-500 text-white'
        )}
      >
        <div className="text-3xl" aria-hidden="true">
          {approved ? '✅' : '❌'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-2xl font-extrabold tracking-tight">
              {approved ? 'APPROVED' : 'DENIED'}
            </span>
          </div>
          <p className="text-sm mt-0.5 opacity-90">
            Member <span className="font-semibold">{member_id}</span> ·{' '}
            {formatLoanType(loan_type)} · {formatCurrency(loan_amount)}
          </p>
        </div>
        {approved ? (
          <CheckCircle2 className="h-8 w-8 opacity-80 shrink-0" />
        ) : (
          <XCircle className="h-8 w-8 opacity-80 shrink-0" />
        )}
      </div>

      {/* 2. Three metric cards */}
      <div className="grid grid-cols-3 gap-3">
        <DTICard dti={dti_projected} />
        <ChurnCard churn={churn_risk} />
        <PolicyCard violations={policy_violations} />
      </div>

      {/* 3. Policy violations alert */}
      {policy_violations.length > 0 && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-5 py-4">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm mb-1">Policy Violations</p>
            <ul className="space-y-1">
              {policy_violations.map((v, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  {v}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 4. Conditions */}
      {conditions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">
            Conditions
          </h3>
          <ul className="space-y-2">
            {conditions.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                <ChevronRight className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 5. Assessment / narrative */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">
          Assessment
        </h3>
        <blockquote className="border-l-4 border-blue-200 pl-4 text-slate-700 text-sm leading-relaxed italic">
          {narrative}
        </blockquote>
      </div>

      {/* 6. Processing steps */}
      {processing_steps.length > 0 && (
        <ProcessingSteps steps={processing_steps} />
      )}

      {/* 7. Link to full history */}
      <div className="text-right">
        <Link
          href={`/history?member=${encodeURIComponent(member_id)}`}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          View full history for {member_id}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
