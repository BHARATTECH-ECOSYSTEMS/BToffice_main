import React from "react";
import { Eye, Trash2, Loader2, FileX2, CheckCircle2, Clock } from "lucide-react";
import { Btn, cx } from "../ui/ButtonPrimitive";

export default function PolicyTable({
  documents,
  pageLoading,
  isAdmin,
  openPdfViewer,
  handleDelete,
  deletingId,
}) {
  const StatusPill = ({ accepted }) =>
    accepted ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Accepted
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
        <Clock className="h-3.5 w-3.5" />
        Pending
      </span>
    );

  return (
    <>
      {/* DESKTOP TABLE */}
      <div className="mb-8 hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-slate-50">
              <tr className="text-sm text-slate-600">
                <th className="px-6 py-4 text-left font-semibold">#</th>
                <th className="px-6 py-4 text-left font-semibold">Name</th>
                <th className="px-6 py-4 text-left font-semibold">Category</th>
                <th className="px-6 py-4 text-left font-semibold">PDF</th>
                <th className="px-6 py-4 text-center font-semibold">Pages</th>
                <th className="px-6 py-4 text-center font-semibold">Status</th>
                {isAdmin && <th className="px-6 py-4 text-center font-semibold">Delete</th>}
              </tr>
            </thead>

            <tbody>
              {pageLoading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-16">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <p className="text-sm">Loading documents...</p>
                    </div>
                  </td>
                </tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-16 text-center text-slate-400">
                    <FileX2 className="mx-auto h-8 w-8 mb-2" />
                    <p className="text-sm">No documents available</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc, index) => (
                  <tr key={doc._id} className="border-t border-slate-100 transition-colors duration-150 hover:bg-indigo-50/60">
                    <td className="px-6 py-5 text-slate-500">{index + 1}</td>
                    <td className="px-6 py-5 font-medium text-slate-800">{doc.name}</td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <Btn variant="primary" size="sm" onClick={() => openPdfViewer(doc)}>
                        <Eye className="h-3.5 w-3.5" />
                        Read
                      </Btn>
                    </td>
                    <td className="px-6 py-5 text-center text-slate-600">{doc.pages}</td>
                    <td className="px-6 py-5 text-center">
                      <StatusPill accepted={doc.userAccepted} />
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-5 text-center">
                        <Btn
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(doc._id)}
                          disabled={deletingId === doc._id}
                          className="min-w-[96px]"
                        >
                          {deletingId === doc._id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          {deletingId === doc._id ? "Deleting" : "Delete"}
                        </Btn>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE CARDS */}
      <div className="mb-8 space-y-4 lg:hidden">
        {pageLoading ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center text-slate-400">
            <Loader2 className="mx-auto h-6 w-6 animate-spin mb-2" />
            <p className="text-sm">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="rounded-2xl border border-slate-200/90 bg-white p-8 text-center text-slate-400">
            <FileX2 className="mx-auto h-8 w-8 mb-2" />
            <p className="text-sm">No documents available</p>
          </div>
        ) : (
          documents.map((doc, index) => (
            <div key={doc._id} className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words text-base font-bold tracking-tight text-slate-900">{doc.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Document #{index + 1}</p>
                </div>
                <StatusPill accepted={doc.userAccepted} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Category</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{doc.category}</p>
                </div>
                <div className="rounded-xl bg-indigo-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Pages</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{doc.pages}</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Btn variant="primary" size="sm" onClick={() => openPdfViewer(doc)} className="flex-1">
                  <Eye className="h-3.5 w-3.5" /> Read
                </Btn>
                {isAdmin && (
                  <Btn
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(doc._id)}
                    disabled={deletingId === doc._id}
                    className="flex-1"
                  >
                    {deletingId === doc._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Delete
                  </Btn>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
