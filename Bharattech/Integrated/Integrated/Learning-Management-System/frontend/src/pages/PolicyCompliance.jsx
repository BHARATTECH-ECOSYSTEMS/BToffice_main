import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileX2,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  api.defaults.baseURL ||
  "http://localhost:5000/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");
const PDF_VIEWER_OPTIONS = "#toolbar=0&navpanes=0";

const withPdfViewerOptions = (url) => `${url}${PDF_VIEWER_OPTIONS}`;

const getUploadedPolicyFileName = (url) => {
  try {
    const parsedUrl = /^https?:\/\//i.test(url)
      ? new URL(url)
      : new URL(url.startsWith("/") ? url : `/${url}`, window.location.origin);
    const match = parsedUrl.pathname.match(/\/uploads\/policies\/([^/]+)$/i);
    return match ? decodeURIComponent(match[1]) : "";
  } catch {
    const match = String(url).match(/\/?uploads\/policies\/([^?#/]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  }
};

const getPolicyFileApiUrl = (filename) =>
  `${API_BASE_URL}/policies/file/${encodeURIComponent(filename)}`;

/* ---------------- SHARED UI PRIMITIVES ---------------- */
// Keeps every button/input/badge on this page (and ideally across the app)
// sharing one visual language: same radius, same shadow, same transitions.

const cx = (...classes) => classes.filter(Boolean).join(" ");

const Btn = ({
  as: Comp = "button",
  variant = "primary",
  size = "md",
  className,
  disabled,
  children,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-sm",
  };
  const variants = {
    primary:
      "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/25 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg hover:shadow-blue-600/30 focus-visible:ring-blue-500",
    success:
      "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-md shadow-green-600/25 hover:from-green-600 hover:to-green-700 hover:shadow-lg hover:shadow-green-600/30 focus-visible:ring-green-500",
    outline:
      "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-400",
    outlineBlue:
      "border-2 border-blue-500 bg-white text-blue-700 hover:bg-blue-50 focus-visible:ring-blue-400",
    danger:
      "bg-red-100 text-red-700 hover:bg-red-200 focus-visible:ring-red-400",
    ghost: "text-slate-500 hover:bg-slate-100 focus-visible:ring-slate-400",
  };
  return (
    <Comp
      disabled={disabled}
      className={cx(base, sizes[size], variants[variant], className)}
      {...props}
    >
      {children}
    </Comp>
  );
};

const Label = ({ children }) => (
  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
    {children}
  </label>
);

const fieldClasses =
  "w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

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

const EmptyState = ({ label }) => (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
    <FileX2 className="h-8 w-8" />
    <p className="text-sm">{label}</p>
  </div>
);

/* ---------------- MAIN COMPONENT ---------------- */

export default function PolicyCompliance() {
  const { hasRole, loading: authLoading } = useAuth();

  const isAdmin = hasRole("admin") || hasRole("Admin");

  const [openModal, setOpenModal] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isAgreed, setIsAgreed] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    pdf: null,
    pages: "",
    category: "",
  });

  const getPdfFrameHeight = (doc) => {
    const totalPages = Number(doc?.pages || 1);

    // Approximate enough vertical space so the outer modal scrollbar
    // truly reaches the final rendered PDF page before acceptance unlocks.
    return window.innerWidth < 640
      ? Math.max(3000, totalPages * 1600)
      : Math.max(2200, totalPages * 1400);
  };

  const getPdfViewerSrc = (doc) => {
    const rawUrl = doc?.pdfUrl || doc?.fileUrl || doc?.pdf || "";
    const uploadedPolicyFileName = rawUrl
      ? getUploadedPolicyFileName(rawUrl)
      : "";

    if (uploadedPolicyFileName) {
      return withPdfViewerOptions(getPolicyFileApiUrl(uploadedPolicyFileName));
    }

    if (doc?._id) {
      return withPdfViewerOptions(`${API_BASE_URL}/policies/${doc._id}/pdf`);
    }

    if (!rawUrl) return "";

    if (/^https?:\/\//i.test(rawUrl)) {
      const parsedUrl = new URL(rawUrl);

      if (/^(localhost|127\.0\.0\.1)$/i.test(parsedUrl.hostname)) {
        return withPdfViewerOptions(
          `${API_ORIGIN}${parsedUrl.pathname}${parsedUrl.search}`,
        );
      }

      return withPdfViewerOptions(rawUrl);
    }

    const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
    return withPdfViewerOptions(`${API_ORIGIN}${normalizedPath}`);
  };

  const fetchPolicies = async () => {
    try {
      const res = await api.get("/policies");
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch policies:", error);
      setDocuments([]);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    fetchPolicies();
  }, [authLoading]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Escape closes whichever modal is open
  useEffect(() => {
    if (!openModal && !selectedPdf) return;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (openModal) setOpenModal(false);
      if (selectedPdf) {
        setSelectedPdf(null);
        setIsAgreed(false);
        setHasScrolledToBottom(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openModal, selectedPdf]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: files ? files[0] : value,
    }));
  };

  const handleAddDocument = async () => {
    if (
      !formData.name ||
      !formData.pdf ||
      !formData.pages ||
      !formData.category
    ) {
      alert("Please fill all fields");
      return;
    }

    try {
      setUploading(true);

      const data = new FormData();
      data.append("name", formData.name);
      data.append("pdf", formData.pdf);
      data.append("pages", formData.pages);
      data.append("category", formData.category);

      await api.post("/policies", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      await fetchPolicies();

      setFormData({
        name: "",
        pdf: null,
        pages: "",
        category: "",
      });

      setOpenModal(false);
    } catch (error) {
      console.error("Upload failed:", error);
      alert(error?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await api.delete(`/policies/${id}`);
      await fetchPolicies();
    } catch (error) {
      console.error("Delete failed:", error);
      alert(error?.response?.data?.message || "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const handleAcceptPolicy = async () => {
    if (!selectedPdf) return;

    try {
      setAccepting(true);
      await api.post(`/policies/${selectedPdf._id}/accept`);
      await fetchPolicies();
      setToast({ message: "Policy accepted", type: "success" });
      setSelectedPdf(null);
      setIsAgreed(false);
      setHasScrolledToBottom(false);
    } catch (error) {
      console.error("Accept failed:", error);
      alert(error?.response?.data?.message || "Accept failed");
    } finally {
      setAccepting(false);
    }
  };

  const openPdfViewer = (doc) => {
    setSelectedPdf(doc);
    setIsAgreed(false);
    setHasScrolledToBottom(false);
  };

  const closePdfViewer = () => {
    setSelectedPdf(null);
    setIsAgreed(false);
    setHasScrolledToBottom(false);
  };

  const acceptedPolicies = useMemo(
    () =>
      documents.flatMap((doc) =>
        (doc.acceptedBy || []).map((item) => ({
          user: item.fullName || item.username || item.email || "Unknown User",
          role: item.role || "User",
          document: doc.name,
          date: item.acceptedAt,
        })),
      ),
    [documents],
  );

  const policyCount = documents.filter(
    (doc) => doc.category === "Policy PDF" || doc.category === "Policies",
  ).length;

  const complianceCount = documents.filter(
    (doc) =>
      doc.category === "Compliance PDF" || doc.category === "Compliances",
  ).length;

  const canAccept = isAgreed && !accepting && !selectedPdf?.userAccepted;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6 transition-all duration-300 md:px-6 lg:px-8">
      <div className="flex flex-col lg:flex-row">
        <main className="flex-1">
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
                  Policy / Compliance
                </h1>
                <p className="mt-2 text-xs text-blue-100/80 md:text-sm">
                  Manage company policies and compliance documents
                </p>
              </div>

              {isAdmin && (
                <Btn
                  variant="outlineBlue"
                  onClick={() => setOpenModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs cursor-pointer font-semibold"
                >
                  <Plus className="h-3.5 w-3.5 text-blue-700" />
                  <span>Add Document</span>
                </Btn>
              )}
            </div>
          </header>
          {isAdmin && (
            <div className="mb-5 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                Total Users Accepted:
                <span className="ml-2 text-green-600">
                  {acceptedPolicies.length}
                </span>
              </h2>
            </div>
          )}

          {/* STAT CARDS */}
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
              <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
                <img
                  src="/assets/policy.png"
                  alt="policy"
                  className="h-20 w-20 object-contain"
                />
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">
                    Documents
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Policies
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Company policy documents
                  </p>
                  <div className="mt-2 text-3xl font-bold text-blue-600">
                    {policyCount}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="h-[5px] bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
              <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
                <img
                  src="/assets/compliance.png"
                  alt="compliance"
                  className="h-20 w-20 object-contain"
                />
                <div>
                  <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500">
                    Documents
                  </p>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    Compliances
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Compliance reports & files
                  </p>
                  <div className="mt-2 text-3xl font-bold text-blue-600">
                    {complianceCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="mb-8 hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] lg:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50">
                  <tr className="text-sm text-slate-600">
                    <th className="px-6 py-4 text-left font-semibold">#</th>
                    <th className="px-6 py-4 text-left font-semibold">Name</th>
                    <th className="px-6 py-4 text-left font-semibold">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">PDF</th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Pages
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Status
                    </th>
                    {isAdmin && (
                      <th className="px-6 py-4 text-center font-semibold">
                        Delete
                      </th>
                    )}
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
                      <td colSpan={isAdmin ? 7 : 6}>
                        <EmptyState label="No documents available" />
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc, index) => (
                      <tr
                        key={doc._id}
                        className="border-t border-slate-100 transition-colors duration-150 hover:bg-indigo-50/60"
                      >
                        <td className="px-6 py-5 text-slate-500">
                          {index + 1}
                        </td>
                        <td className="px-6 py-5 font-medium text-slate-800">
                          {doc.name}
                        </td>
                        <td className="px-6 py-5">
                          <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700">
                            {doc.category}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <Btn
                            variant="primary"
                            size="sm"
                            onClick={() => openPdfViewer(doc)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Read
                          </Btn>
                        </td>
                        <td className="px-6 py-5 text-center text-slate-600">
                          {doc.pages}
                        </td>
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
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-sm">Loading documents...</p>
                </div>
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <EmptyState label="No documents available" />
              </div>
            ) : (
              documents.map((doc, index) => (
                <div
                  key={doc._id}
                  className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="break-words text-base font-bold tracking-tight text-slate-900">
                        {doc.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Document #{index + 1}
                      </p>
                    </div>
                    <StatusPill accepted={doc.userAccepted} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-indigo-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Category
                      </p>
                      <p className="mt-1 break-words text-sm font-medium text-slate-900">
                        {doc.category}
                      </p>
                    </div>

                    <div className="rounded-xl bg-indigo-50 px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Pages
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {doc.pages}
                      </p>
                    </div>
                  </div>

                  <div
                    className={cx(
                      "mt-4 grid gap-3",
                      isAdmin ? "sm:grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    <Btn variant="primary" onClick={() => openPdfViewer(doc)}>
                      <Eye className="h-3.5 w-3.5" />
                      Read
                    </Btn>

                    {isAdmin && (
                      <Btn
                        variant="danger"
                        onClick={() => handleDelete(doc._id)}
                        disabled={deletingId === doc._id}
                      >
                        {deletingId === doc._id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        {deletingId === doc._id ? "Deleting" : "Delete"}
                      </Btn>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* DESKTOP ACCEPTED POLICIES TABLE */}
          {isAdmin && (
            <div className="mb-8 hidden overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)] lg:block">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-4">
                <ShieldCheck className="h-5 w-5 text-slate-500" />
                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                  Accepted Policies
                </h2>
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
                        <td colSpan="4">
                          <EmptyState label="No user has accepted any policy yet" />
                        </td>
                      </tr>
                    ) : (
                      acceptedPolicies.map((item, index) => (
                        <tr
                          key={`${item.document}-${item.user}-${index}`}
                          className="border-t border-slate-100"
                        >
                          <td className="px-6 py-5 text-slate-700">
                            {item.user}
                          </td>
                          <td className="px-6 py-5 text-slate-700">
                            {item.role}
                          </td>
                          <td className="px-6 py-5 text-slate-700">
                            {item.document}
                          </td>
                          <td className="px-6 py-5 text-slate-500">
                            {new Date(item.date).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MOBILE ACCEPTED POLICIES */}
          {isAdmin && (
            <div className="space-y-4 lg:hidden">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                <ShieldCheck className="h-5 w-5 text-slate-500" />
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Accepted Policies
                </h2>
              </div>

              {acceptedPolicies.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/90 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <EmptyState label="No user has accepted any policy yet" />
                </div>
              ) : (
                acceptedPolicies.map((item, index) => (
                  <div
                    key={`${item.document}-${item.user}-${index}`}
                    className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
                  >
                    <div className="space-y-3">
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          User
                        </p>
                        <p className="mt-1 break-words text-sm font-medium text-slate-900">
                          {item.user}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Document
                        </p>
                        <p className="mt-1 break-words text-sm font-medium text-slate-900">
                          {item.document}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Role
                        </p>
                        <p className="mt-1 break-words text-sm font-medium text-slate-900">
                          {item.role}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 px-3 py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Accepted On
                        </p>
                        <p className="mt-1 break-words text-sm font-medium text-slate-900">
                          {new Date(item.date).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ADD DOCUMENT MODAL */}
          {openModal && isAdmin && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
              onClick={() => setOpenModal(false)}
            >
              <div
                className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-document-title"
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
                      <h2
                        id="add-document-title"
                        className="text-lg font-bold tracking-tight text-slate-900"
                      >
                        Add Document
                      </h2>
                    </div>
                  </div>
                  <button
                    onClick={() => setOpenModal(false)}
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
                      <p className="mt-1.5 truncate text-xs text-slate-500">
                        Selected: {formData.pdf.name}
                      </p>
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
                  <Btn
                    variant="outline"
                    onClick={() => setOpenModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Btn>
                  <Btn
                    variant="primary"
                    onClick={handleAddDocument}
                    disabled={uploading}
                    className="flex-1"
                  >
                    {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {uploading ? "Uploading..." : "Add"}
                  </Btn>
                </div>
              </div>
            </div>
          )}

          {/* PDF VIEWER MODAL */}
          {selectedPdf && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
              <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl sm:rounded-3xl">
                {/* HEADER */}
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

                {/* SCROLLABLE PDF CONTAINER */}
                <div
                  className="flex-1 overflow-y-auto bg-gray-200"
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    const reachedBottom =
                      target.scrollTop + target.clientHeight >=
                      target.scrollHeight - 8;

                    if (reachedBottom) {
                      setHasScrolledToBottom(true);
                    }
                  }}
                >
                  <iframe
                    src={getPdfViewerSrc(selectedPdf)}
                    title="PDF Viewer"
                    style={{ height: `${getPdfFrameHeight(selectedPdf)}px` }}
                    className="w-full border-0"
                  />
                </div>

                {/* AGREEMENT */}
                {!isAdmin && hasScrolledToBottom && (
                  <div className="flex-shrink-0 border-t border-slate-100 bg-white px-4 py-5 sm:px-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      {/* CHECKBOX */}
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

                      {/* ACCEPT BUTTON */}
                      <Btn
                        variant={canAccept ? "success" : "outline"}
                        onClick={handleAcceptPolicy}
                        disabled={!canAccept}
                        className={cx(
                          "min-w-[140px]",
                          !canAccept && "text-slate-400",
                        )}
                      >
                        {accepting && (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        )}
                        {selectedPdf.userAccepted
                          ? "Accepted"
                          : accepting
                            ? "Saving..."
                            : "Accept"}
                      </Btn>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {toast && (
        <div
          key={toast.message}
          className="toast-success flex items-center gap-2"
        >
          <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600" />
          <span className="font-medium text-gray-900">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
