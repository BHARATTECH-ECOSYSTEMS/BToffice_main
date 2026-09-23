import React from "react";
import { Plus, CheckCircle } from "lucide-react";
import { Btn } from "../components/ui/ButtonPrimitive";
import PolicyStatsCards from "../components/policy/PolicyStatsCards";
import PolicyTable from "../components/policy/PolicyTable";
import AcceptedPoliciesSection from "../components/policy/AcceptedPoliciesSection";
import PolicyViewerModal from "../components/policy/PolicyViewerModal";
import UploadPolicyModal from "../components/policy/UploadPolicyModal";
import { usePolicyCompliance } from "../hooks/usePolicyCompliance";

export default function PolicyCompliance() {
  const {
    isAdmin, pageLoading, documents, policyCount, complianceCount,
    selectedPdf, setSelectedPdf, isAgreed, setIsAgreed,
    hasScrolledToBottom, setHasScrolledToBottom,
    openModal, setOpenModal, formData,
    uploading, deletingId, accepting, toast,
    handleChange, handleAddDocument, handleDelete, handleAcceptPolicy,
    openPdfViewer
  } = usePolicyCompliance();

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 transition-all duration-300 md:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row">
        <main className="flex-1">
          {/* TOAST */}
          {toast && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span>{toast.message}</span>
            </div>
          )}

          {/* HERO */}
          <header className="bharat-hero-banner relative mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-6 shadow-md md:p-8">
            <div className="bharat-hero-glow" />
            <div className="bharat-hero-beams" />

            <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-200">
                    BharatTech Platform
                  </span>
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                  Policy & Compliance
                </h1>
                <p className="mt-2 text-xs text-blue-100/80 md:text-sm">
                  Review and acknowledge BharatTech internal compliance documents
                </p>
              </div>

              {isAdmin && (
                <Btn
                  variant="outlineBlue"
                  onClick={() => setOpenModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs cursor-pointer font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-700" />
                  <span>Upload Document</span>
                </Btn>
              )}
            </div>
          </header>

          <PolicyStatsCards policyCount={policyCount} complianceCount={complianceCount} />

          <PolicyTable
            documents={documents}
            pageLoading={pageLoading}
            isAdmin={isAdmin}
            openPdfViewer={openPdfViewer}
            handleDelete={handleDelete}
            deletingId={deletingId}
          />

          {isAdmin && <AcceptedPoliciesSection documents={documents} />}

          <UploadPolicyModal
            isOpen={openModal && isAdmin}
            onClose={() => setOpenModal(false)}
            formData={formData}
            handleChange={handleChange}
            handleAddDocument={handleAddDocument}
            uploading={uploading}
          />

          <PolicyViewerModal
            selectedPdf={selectedPdf}
            closePdfViewer={() => {
              setSelectedPdf(null);
              setIsAgreed(false);
              setHasScrolledToBottom(false);
            }}
            isAdmin={isAdmin}
            hasScrolledToBottom={hasScrolledToBottom}
            setHasScrolledToBottom={setHasScrolledToBottom}
            isAgreed={isAgreed}
            setIsAgreed={setIsAgreed}
            handleAcceptPolicy={handleAcceptPolicy}
            accepting={accepting}
          />
        </main>
      </div>
    </div>
  );
}
