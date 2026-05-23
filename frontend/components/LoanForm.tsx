'use client';

import { useState } from 'react';
import { AlertCircle, DollarSign } from 'lucide-react';
import { analyzeLoan } from '@/lib/api';
import type { LoanAnalysisResponse, LoanType } from '@/lib/types';

interface LoanFormProps {
  onResult: (r: LoanAnalysisResponse) => void;
  onLoading: (b: boolean) => void;
  onError: (e: string | null) => void;
}

const LOAN_OPTIONS: {
  value: LoanType;
  label: string;
  maxAmount: number;
  maxLabel: string;
}[] = [
  { value: 'auto', label: 'Auto Loan', maxAmount: 75000, maxLabel: '$75,000' },
  {
    value: 'personal',
    label: 'Personal Loan',
    maxAmount: 25000,
    maxLabel: '$25,000',
  },
  { value: 'heloc', label: 'HELOC', maxAmount: 250000, maxLabel: '$250,000' },
];

const TERM_PRESETS = [24, 36, 48, 60, 72];

function formatAmountDisplay(value: string): string {
  const num = parseFloat(value.replace(/,/g, ''));
  if (isNaN(num)) return value;
  return num.toLocaleString('en-US');
}

export default function LoanForm({
  onResult,
  onLoading,
  onError,
}: LoanFormProps) {
  const [memberId, setMemberId] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('auto');
  const [loanAmountRaw, setLoanAmountRaw] = useState('');
  const [termMonths, setTermMonths] = useState<number>(60);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const selectedOption = LOAN_OPTIONS.find((o) => o.value === loanType)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const amount = parseFloat(loanAmountRaw.replace(/,/g, ''));

    // Client-side validation
    if (!memberId.trim()) {
      setLocalError('Member ID is required.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setLocalError('Please enter a valid loan amount.');
      return;
    }
    if (amount > selectedOption.maxAmount) {
      setLocalError(
        `Loan amount exceeds the maximum of ${selectedOption.maxLabel} for ${selectedOption.label}.`
      );
      return;
    }

    setLoading(true);
    onLoading(true);
    onError(null);

    try {
      const result = await analyzeLoan({
        member_id: memberId.trim(),
        loan_type: loanType,
        loan_amount: amount,
        term_months: termMonths,
      });
      onResult(result);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setLocalError(msg);
      onError(msg);
    } finally {
      setLoading(false);
      onLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-5">
        Loan Application
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Member ID */}
        <div>
          <label
            htmlFor="member-id"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Member ID
          </label>
          <input
            id="member-id"
            type="text"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            placeholder="e.g. M001"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            disabled={loading}
          />
        </div>

        {/* Loan Type */}
        <div>
          <label
            htmlFor="loan-type"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Loan Type
          </label>
          <select
            id="loan-type"
            value={loanType}
            onChange={(e) => setLoanType(e.target.value as LoanType)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 cursor-pointer"
            disabled={loading}
          >
            {LOAN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} (max {opt.maxLabel})
              </option>
            ))}
          </select>
        </div>

        {/* Loan Amount */}
        <div>
          <label
            htmlFor="loan-amount"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Loan Amount
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <input
              id="loan-amount"
              type="text"
              inputMode="numeric"
              value={loanAmountRaw}
              onChange={(e) => {
                // Allow digits and commas only
                const raw = e.target.value.replace(/[^0-9,]/g, '');
                setLoanAmountRaw(raw);
              }}
              onBlur={(e) => {
                // Format on blur
                const cleaned = e.target.value.replace(/,/g, '');
                const num = parseFloat(cleaned);
                if (!isNaN(num)) {
                  setLoanAmountRaw(formatAmountDisplay(cleaned));
                }
              }}
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              disabled={loading}
            />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            Maximum for {selectedOption.label}: {selectedOption.maxLabel}
          </p>
        </div>

        {/* Term Months */}
        <div>
          <label
            htmlFor="term-months"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Term (months)
          </label>
          {/* Preset buttons */}
          <div className="flex gap-2 mb-2 flex-wrap">
            {TERM_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTermMonths(t)}
                disabled={loading}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  termMonths === t
                    ? 'bg-blue-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            id="term-months"
            type="number"
            min={1}
            max={360}
            value={termMonths}
            onChange={(e) => setTermMonths(parseInt(e.target.value) || 1)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            disabled={loading}
          />
          <p className="text-xs text-slate-400 mt-1.5">
            Enter a custom number or click a preset above.
          </p>
        </div>

        {/* Error alert */}
        {localError && (
          <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <p className="text-sm">{localError}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl px-6 py-3.5 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
        >
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 text-white"
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
              Running analysis…
            </>
          ) : (
            'Analyze Loan →'
          )}
        </button>

        {/* Timing hint */}
        <p className="text-center text-xs text-slate-400">
          Analysis typically takes 20–40 seconds
        </p>
      </form>
    </div>
  );
}
