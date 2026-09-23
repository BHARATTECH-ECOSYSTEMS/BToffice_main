import React from "react";

export default function PolicyStatsCards({ policyCount, complianceCount }) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
        <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <img src="/assets/policy.png" alt="policy" className="h-20 w-20 object-contain" />
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">
              Documents
            </p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Policies</h2>
            <p className="mt-1 text-sm text-slate-500">Company policy documents</p>
            <div className="mt-2 text-3xl font-bold text-blue-600">{policyCount}</div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
        <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <img src="/assets/compliance.png" alt="compliance" className="h-20 w-20 object-contain" />
          <div>
            <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">
              Documents
            </p>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Compliances</h2>
            <p className="mt-1 text-sm text-slate-500">Compliance reports & files</p>
            <div className="mt-2 text-3xl font-bold text-blue-600">{complianceCount}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
