import React from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { Btn, Label } from "../ui/ButtonPrimitive";

export default function UploadPolicyModal({
  isOpen,
  onClose,
  formData,
  handleChange,
  handleAddDocument,
  uploading,
}) {
  if (!isOpen) return null;

  const fieldClasses =
    "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="h-[5px] shrink-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />

        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-blue-600">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">
                Document
              </p>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Add Document</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div>
            <Label>Name</Label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter document name"
              className={fieldClasses}
            />
          </div>

          <div>
            <Label>Upload PDF</Label>
            <input
              type="file"
              name="pdf"
              accept=".pdf"
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-300 bg-white text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
            />
            {formData.pdf && (
              <p className="mt-1.5 truncate text-xs text-slate-500">Selected: {formData.pdf.name}</p>
            )}
          </div>

          <div>
            <Label>Pages</Label>
            <input
              type="number"
              name="pages"
              value={formData.pages}
              onChange={handleChange}
              placeholder="Enter total pages"
              className={fieldClasses}
            />
          </div>

          <div>
            <Label>Category</Label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className={fieldClasses}
            >
              <option value="">Select PDF category</option>
              <option value="Policies">Policies</option>
              <option value="Compliances">Compliances</option>
            </select>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-slate-100 px-6 py-5">
          <Btn variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Btn>
          <Btn variant="primary" onClick={handleAddDocument} disabled={uploading} className="flex-1">
            {uploading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            {uploading ? "Uploading..." : "Add"}
          </Btn>
        </div>
      </div>
    </div>
  );
}
