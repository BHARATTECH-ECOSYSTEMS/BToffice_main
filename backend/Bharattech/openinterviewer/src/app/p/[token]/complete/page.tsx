'use client';

import { useParams } from 'next/navigation';
import { Check } from 'lucide-react';

export default function CompletePage() {
  const params = useParams();
  const token = params.token;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-5">
      <div className="oi-rise w-full max-w-md text-center px-5 sm:px-6 py-8 bg-white border border-slate-200 shadow-card rounded-2xl">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700" aria-hidden="true">
          <Check size={22} strokeWidth={2.5} />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3">
          Interview Completed 🎉
        </h1>
        <p className="text-slate-600 text-sm font-medium">
          Thank you for participating in this research interview.
        </p>
      </div>
    </div>
  );
}
