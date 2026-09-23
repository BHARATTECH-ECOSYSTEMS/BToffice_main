import React, { useMemo } from "react";
import { ShieldCheck, FileX2 } from "lucide-react";

export default function AcceptedPoliciesSection({ documents = [] }) {
  const acceptedPolicies = useMemo(
    () =>
      documents.flatMap((doc) =>
        (doc.acceptedBy || []).map((item) => ({
          user: item.fullName || item.username || item.email || "Unknown User",
          role: item.role || "User",
          document: doc.name,
          date: item.acceptedAt,
        }))
      ),
    [documents]
  );

  return (
    <>
      {/* DESKTOP TABLE */}
      <div className="mb-8 hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] lg:block">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-4">
          <ShieldCheck className="h-5 w-5 text-slate-500" />
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Accepted Policies</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50/60">
              <tr className="text-sm font-semibold text-slate-600">
                <th className="px-6 py-4 text-left">User</th>
                <th className="px-6 py-4 text-left">Role</th>
                <th className="px-6 py-4 text-left">Document</th>
                <th className="px-6 py-4 text-left">Accepted On</th>
              </tr>
            </thead>
            <tbody>
              {acceptedPolicies.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-10 text-center text-slate-400">
                    <FileX2 className="mx-auto h-6 w-6 mb-2" />
                    <p className="text-sm">No user has accepted any policy yet</p>
                  </td>
                </tr>
              ) : (
                acceptedPolicies.map((item, index) => (
                  <tr key={`${item.document}-${item.user}-${index}`} className="border-t border-slate-100">
                    <td className="px-6 py-5 text-slate-700">{item.user}</td>
                    <td className="px-6 py-5 text-slate-700">{item.role}</td>
                    <td className="px-6 py-5 text-slate-700">{item.document}</td>
                    <td className="px-6 py-5 text-slate-500">{new Date(item.date).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARDS */}
      <div className="space-y-4 lg:hidden">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm">
          <ShieldCheck className="h-5 w-5 text-slate-500" />
          <h2 className="text-base font-bold tracking-tight text-slate-900">Accepted Policies</h2>
        </div>

        {acceptedPolicies.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 text-center text-slate-400">
            <p className="text-sm">No user has accepted any policy yet</p>
          </div>
        ) : (
          acceptedPolicies.map((item, index) => (
            <div key={`${item.document}-${item.user}-${index}`} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="space-y-2 text-sm">
                <div><span className="text-slate-500 font-medium">User: </span>{item.user}</div>
                <div><span className="text-slate-500 font-medium">Role: </span>{item.role}</div>
                <div><span className="text-slate-500 font-medium">Document: </span>{item.document}</div>
                <div className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
