import React from "react";
import { X, Loader2 } from "lucide-react";
import { Btn, cx } from "../ui/ButtonPrimitive";
import { getPdfViewerSrc } from "../../hooks/usePolicyCompliance";

export default function PolicyViewerModal({
  selectedPdf,
  closePdfViewer,
  isAdmin,
  hasScrolledToBottom,
  setHasScrolledToBottom,
  isAgreed,
  setIsAgreed,
  handleAcceptPolicy,
  accepting,
}) {
  if (!selectedPdf) return null;

  const totalPages = Number(selectedPdf?.pages || 1);
  const frameHeight =
    window.innerWidth < 640
      ? Math.max(3000, totalPages * 1600)
      : Math.max(2200, totalPages * 1400);

  const canAccept = isAgreed && !accepting && !selectedPdf?.userAccepted;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-4 sm:px-6">
          <h2 className="min-w-0 break-words text-lg font-bold text-slate-800 sm:text-xl md:text-2xl">
            {selectedPdf.name}
          </h2>
          <button
            onClick={closePdfViewer}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-500 transition hover:bg-red-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className="flex-1 overflow-y-auto bg-gray-200"
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollTop + target.clientHeight >= target.scrollHeight - 8) {
              setHasScrolledToBottom(true);
            }
          }}
        >
          <iframe
            src={getPdfViewerSrc(selectedPdf)}
            title="PDF Viewer"
            style={{ height: `${frameHeight}px` }}
            className="w-full border-0"
          />
        </div>

        {!isAdmin && hasScrolledToBottom && (
          <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => setIsAgreed(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-green-600"
                />
                <div>
                  <p className="font-medium text-slate-800">
                    I have read the complete document and agree.
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Please confirm after reviewing the full PDF.
                  </p>
                </div>
              </div>

              <Btn
                variant={canAccept ? "success" : "outline"}
                onClick={handleAcceptPolicy}
                disabled={!canAccept}
                className={cx("min-w-[140px]", !canAccept && "text-slate-400")}
              >
                {accepting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                {selectedPdf.userAccepted ? "Accepted" : accepting ? "Saving..." : "Accept"}
              </Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
