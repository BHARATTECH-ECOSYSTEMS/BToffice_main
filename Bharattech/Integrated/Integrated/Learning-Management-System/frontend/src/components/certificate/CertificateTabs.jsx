import React from "react";

export default function CertificateTabs({ isAdmin, tab, onTabChange, loading, certificateCount }) {
  return (
    <div
      className="mx-auto mb-6 w-full rounded-2xl border border-white/50 bg-white/80 p-1.5 shadow-[0_16px_38px_rgba(15,23,42,0.08)] backdrop-blur-xl"
      style={{ maxWidth: "1080px" }}
    >
      <div
        className={`grid min-h-[56px] gap-1 ${isAdmin ? "grid-cols-2" : "grid-cols-1"}`}
        role="tablist"
        aria-label="Certificate navigation"
      >
        {isAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 0}
            onClick={() => onTabChange(0)}
            className={`min-h-[46px] rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 cursor-pointer ${
              tab === 0
                ? "bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
              </svg>
              <span>Issued Certificate</span>
            </span>
          </button>
        )}

        <button
          type="button"
          role="tab"
          aria-selected={tab === 1}
          onClick={() => onTabChange(1)}
          className={`min-h-[46px] rounded-xl px-4 py-3 text-sm font-bold transition-all duration-200 cursor-pointer ${
            tab === 1
              ? "bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
          }`}
        >
          <span className="flex items-center justify-center gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 3-6.7" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4v6h6" />
            </svg>
            <span>History</span>
            {!loading && certificateCount > 0 && (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-extrabold leading-none text-blue-700">
                {certificateCount}
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
