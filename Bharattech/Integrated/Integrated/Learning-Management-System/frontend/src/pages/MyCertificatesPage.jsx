import React from "react";
import { Toaster } from "react-hot-toast";
import { useAuth } from "../LMS/context/AuthContext";
import GenerateCertificate from "./GenerateCertificate";
import CertificateHistory from "./CertificateHistory";
import CertificateTabs from "../components/certificate/CertificateTabs";
import { useMyCertificates } from "../hooks/useMyCertificates";

const MyCertificatesPage = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin") || hasRole("Admin");
  const canDeleteCertificates = hasRole(["superadmin", "admin"]);

  const {
    tab,
    setTab,
    certificates,
    loading,
    deletingCertificateId,
    error,
    fetchCertificates,
    deleteCertificate,
    handleTabChange
  } = useMyCertificates(isAdmin, canDeleteCertificates);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 transition-all duration-300 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <main>
          {/* Bharat Hero */}
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
                  Certificates
                </h1>
                <p className="mt-2 text-xs text-blue-100/80 md:text-sm">
                  {isAdmin
                    ? "Generate and manage certificates in the BharatTech workspace"
                    : "View certificates issued to your account"}
                </p>
              </div>
            </div>
          </header>

          <div className="mx-auto w-full" style={{ maxWidth: "1280px" }}>
            {/* Tabs */}
            <CertificateTabs
              isAdmin={isAdmin}
              tab={tab}
              onTabChange={handleTabChange}
              loading={loading}
              certificateCount={certificates.length}
            />

            {/* Error state */}
            {error && !loading && (
              <div className="mx-auto mb-5 flex w-full max-w-[1080px] flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                    !
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800">Unable to load certificates</p>
                    <p className="mt-1 text-xs text-red-700/80">{error}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchCertificates}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100 cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Generate Certificate */}
            {isAdmin && tab === 0 && (
              <GenerateCertificate
                fetchCertificates={fetchCertificates}
                setTab={setTab}
              />
            )}

            {/* Certificate History */}
            {(!isAdmin || tab === 1) && (
              <CertificateHistory
                certificates={certificates}
                loading={loading}
                canDeleteCertificates={canDeleteCertificates}
                deletingCertificateId={deletingCertificateId}
                onDeleteCertificate={deleteCertificate}
              />
            )}
          </div>
        </main>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 3500,
          style: {
            borderRadius: "16px",
            border: "1px solid rgba(226, 232, 240, 0.8)",
            background: "rgba(255,255,255,0.95)",
            color: "#0f172a",
            boxShadow: "0 16px 38px rgba(15,23,42,0.12)",
            backdropFilter: "blur(16px)",
          },
        }}
      />
    </div>
  );
};

export default MyCertificatesPage;
