import React, { useCallback, useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useAuth } from "../LMS/context/AuthContext";
import GenerateCertificate from "./GenerateCertificate";
import CertificateHistory from "./CertificateHistory";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jwt");

  const role =
    localStorage.getItem("userRole") || localStorage.getItem("role") || "";

  return {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(role && { "x-demo-role": role }),
  };
};

const MyCertificatesPage = () => {
  const { hasRole } = useAuth();

  const isAdmin = hasRole("admin") || hasRole("Admin");
  const canDeleteCertificates = hasRole(["superadmin", "admin"]);

  const [tab, setTab] = useState(0);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingCertificateId, setDeletingCertificateId] = useState(null);
  const [error, setError] = useState("");

  const contentMaxWidth = 1080;

  const fetchCertificates = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const endpoint = isAdmin
        ? `${API_BASE_URL}/certificates`
        : `${API_BASE_URL}/certificates/my`;

      const res = await fetch(endpoint, {
        headers: getAuthHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to load certificates");
      }

      const certificateList = Array.isArray(data)
        ? data
        : Array.isArray(data.certificates)
          ? data.certificates
          : [];

      setCertificates(certificateList);
    } catch (err) {
      console.error("Failed to fetch certificates:", err);

      const message =
        err instanceof Error ? err.message : "Failed to load certificates";

      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  const deleteCertificate = useCallback(
    async (certificateId) => {
      if (!canDeleteCertificates || !certificateId) return;

      setDeletingCertificateId(certificateId);

      try {
        const res = await fetch(
          `${API_BASE_URL}/certificates/${certificateId}`,
          {
            method: "DELETE",
            headers: getAuthHeaders(),
          },
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.message || "Failed to delete certificate");
        }

        setCertificates((current) =>
          current.filter((certificate) => certificate._id !== certificateId),
        );

        toast.success("Certificate deleted successfully");
      } catch (err) {
        console.error("Failed to delete certificate:", err);

        toast.error(
          err instanceof Error ? err.message : "Failed to delete certificate",
        );
      } finally {
        setDeletingCertificateId(null);
      }
    },
    [canDeleteCertificates],
  );

  useEffect(() => {
    if (!isAdmin || tab === 1) {
      fetchCertificates();
    }
  }, [tab, isAdmin, fetchCertificates]);

  const handleTabChange = (newValue) => {
    if (!isAdmin) {
      setTab(1);
      return;
    }

    setTab(newValue);
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 transition-all duration-300 sm:px-5 md:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <main>
          {/* =========================================================
              BHARAT HERO
              PRESERVED FROM YOUR ORIGINAL CODE
          ========================================================== */}
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

          {/* =========================================================
              CONTENT
          ========================================================== */}
          <div className="mx-auto w-full" style={{ maxWidth: "1280px" }}>
            {/* =======================================================
                TABS
                MUI REMOVED — PURE TAILWIND
            ======================================================== */}
            <div
              className="mx-auto mb-6 w-full rounded-2xl border border-white/50 bg-white/80 p-1.5 shadow-[0_16px_38px_rgba(15,23,42,0.08)] backdrop-blur-xl"
              style={{ maxWidth: `${contentMaxWidth}px` }}
            >
              <div
                className={`grid min-h-[56px] gap-1 ${
                  isAdmin ? "grid-cols-2" : "grid-cols-1"
                }`}
                role="tablist"
                aria-label="Certificate navigation"
              >
                {/* Issued Certificate */}
                {isAdmin && (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === 0}
                    onClick={() => handleTabChange(0)}
                    className={`
                      min-h-[46px]
                      rounded-xl
                      px-4
                      py-3
                      text-sm
                      font-bold
                      transition-all
                      duration-200
                      focus:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-blue-500
                      focus-visible:ring-offset-1
                      ${
                        tab === 0
                          ? "bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 shadow-sm"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                      }
                    `}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 5v14M5 12h14"
                        />
                      </svg>

                      <span>Issued Certificate</span>
                    </span>
                  </button>
                )}

                {/* History */}
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 1}
                  onClick={() => handleTabChange(1)}
                  className={`
                    min-h-[46px]
                    rounded-xl
                    px-4
                    py-3
                    text-sm
                    font-bold
                    transition-all
                    duration-200
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-blue-500
                    focus-visible:ring-offset-1
                    ${
                      tab === 1
                        ? "bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 shadow-sm"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                    }
                  `}
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 12a9 9 0 1 0 3-6.7"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 4v6h6"
                      />
                    </svg>

                    <span>History</span>

                    {!loading && certificates.length > 0 && (
                      <span
                        className="
                          rounded-full
                          bg-blue-100
                          px-2
                          py-0.5
                          text-[10px]
                          font-extrabold
                          leading-none
                          text-blue-700
                        "
                      >
                        {certificates.length}
                      </span>
                    )}
                  </span>
                </button>
              </div>
            </div>

            {/* =======================================================
                ERROR STATE
            ======================================================== */}
            {error && !loading && (
              <div
                className="
                  mx-auto
                  mb-5
                  flex
                  w-full
                  max-w-[1080px]
                  flex-col
                  gap-3
                  rounded-2xl
                  border
                  border-red-200
                  bg-red-50
                  p-4
                  sm:flex-row
                  sm:items-center
                  sm:justify-between
                "
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 text-sm font-bold text-red-600">
                    !
                  </div>

                  <div>
                    <p className="text-sm font-bold text-red-800">
                      Unable to load certificates
                    </p>

                    <p className="mt-1 text-xs text-red-700/80">{error}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={fetchCertificates}
                  className="
                    rounded-lg
                    border
                    border-red-200
                    bg-white
                    px-4
                    py-2
                    text-xs
                    font-bold
                    text-red-700
                    transition
                    hover:bg-red-100
                    focus:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-red-400
                  "
                >
                  Try Again
                </button>
              </div>
            )}

            {/* =======================================================
                GENERATE CERTIFICATE
            ======================================================== */}
            {isAdmin && tab === 0 && (
              <GenerateCertificate
                fetchCertificates={fetchCertificates}
                setTab={setTab}
              />
            )}

            {/* =======================================================
                CERTIFICATE HISTORY
            ======================================================== */}
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

      {/* =============================================================
          TOASTER
      ============================================================= */}
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
