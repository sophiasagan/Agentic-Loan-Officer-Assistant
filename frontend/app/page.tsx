'use client';

import { useState } from 'react';
import LoanForm from '@/components/LoanForm';
import ResultPanel from '@/components/ResultPanel';
import type { LoanAnalysisResponse } from '@/lib/types';

export default function HomePage() {
  const [result, setResult] = useState<LoanAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page heading */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Loan Analysis</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Enter member details below to run an AI-powered loan analysis.
        </p>
      </div>

      {/* Two-column layout: form (sticky) + result panel */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Left column — sticky loan form */}
        <div className="w-full lg:w-[420px] lg:shrink-0 lg:sticky lg:top-24">
          <LoanForm
            onResult={(r) => {
              setResult(r);
              setError(null);
            }}
            onLoading={setLoading}
            onError={setError}
          />
        </div>

        {/* Right column — result panel */}
        <div className="flex-1 min-w-0">
          <ResultPanel result={result} loading={loading} error={error} />
        </div>
      </div>
    </div>
  );
}
