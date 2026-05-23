'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Clock, AlertCircle } from 'lucide-react';
import { getMemberHistory } from '@/lib/api';
import type { LoanHistoryResponse } from '@/lib/types';
import HistoryCard from '@/components/HistoryCard';

function HistoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialMember = searchParams.get('member') ?? '';

  const [memberId, setMemberId] = useState(initialMember);
  const [inputValue, setInputValue] = useState(initialMember);
  const [history, setHistory] = useState<LoanHistoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setHistory(null);
    try {
      const data = await getMemberHistory(id.trim());
      setHistory(data);
      setMemberId(id.trim());
      // Update URL without full navigation
      router.replace(`/history?member=${encodeURIComponent(id.trim())}`, {
        scroll: false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load if member param is in URL
  useEffect(() => {
    if (initialMember) {
      loadHistory(initialMember);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadHistory(inputValue);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Member History</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Look up past loan analyses for any member.
        </p>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter Member ID (e.g. M001)"
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl px-6 py-3 transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
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
                Loading…
              </>
            ) : (
              'Load History'
            )}
          </button>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-5 py-4 mb-6">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Failed to load history</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 animate-pulse"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 bg-slate-200 rounded w-32" />
                <div className="h-6 bg-slate-200 rounded-full w-20" />
              </div>
              <div className="h-3 bg-slate-200 rounded w-48 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-36" />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {history && !loading && (
        <>
          {/* Count header */}
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-600 font-medium">
              {history.count === 0
                ? 'No analyses found'
                : `${history.count} analysis${history.count !== 1 ? 'es' : ''} for`}{' '}
              <span className="text-slate-900 font-semibold">
                {history.member_id}
              </span>
            </span>
          </div>

          {/* Empty state */}
          {history.count === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <div className="text-5xl mb-4">📂</div>
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                No history yet
              </h3>
              <p className="text-slate-500 text-sm">
                No loan analyses have been run for member{' '}
                <span className="font-medium">{memberId}</span>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.history.map((record) => (
                <HistoryCard key={record.id} record={record} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Initial empty state — no search yet */}
      {!history && !loading && !error && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-slate-700 mb-1">
            Enter a member ID
          </h3>
          <p className="text-slate-500 text-sm">
            Type a member ID above and click &quot;Load History&quot; to see past analyses.
          </p>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 rounded w-48" />
            <div className="h-16 bg-white rounded-2xl" />
          </div>
        </div>
      }
    >
      <HistoryContent />
    </Suspense>
  );
}
