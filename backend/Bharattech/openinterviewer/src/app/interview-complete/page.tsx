'use client';

import { CheckCircle2 } from 'lucide-react';

export default function InterviewComplete() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center shadow-lg">
        <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-blue-600 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-3">
          Interview Completed
        </h1>
        <p className="text-slate-600 text-sm font-medium leading-relaxed mb-4">
          Thank you for your time. Your responses have been successfully recorded and submitted.
        </p>
        <div className="border-t border-slate-100 my-6"></div>
        <p className="text-xs text-slate-450 font-medium">
          You can now close this tab or window.
        </p>
      </div>
    </div>
  );
}
