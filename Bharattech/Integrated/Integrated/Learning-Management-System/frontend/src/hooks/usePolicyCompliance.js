import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../LMS/context/AuthContext";
import api from "../api/axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || api.defaults.baseURL || "http://localhost:5000/api";
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

export const getPdfViewerSrc = (doc) => {
  const rawUrl = doc?.pdfUrl || doc?.fileUrl || doc?.pdf || "";
  const uploaded = rawUrl ? getUploadedPolicyFileName(rawUrl) : "";
  if (uploaded) return withPdfViewerOptions(`${API_BASE_URL}/policies/file/${encodeURIComponent(uploaded)}`);
  if (doc?._id) return withPdfViewerOptions(`${API_BASE_URL}/policies/${doc._id}/pdf`);
  if (!rawUrl) return "";
  if (/^https?:\/\//i.test(rawUrl)) {
    const parsed = new URL(rawUrl);
    if (/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
      return withPdfViewerOptions(`${API_ORIGIN}${parsed.pathname}${parsed.search}`);
    }
    return withPdfViewerOptions(rawUrl);
  }
  return withPdfViewerOptions(`${API_ORIGIN}${rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`}`);
};

export function usePolicyCompliance() {
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

  const fetchPolicies = async () => {
    try {
      const res = await api.get("/policies");
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setDocuments([]);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchPolicies();
  }, [authLoading]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setFormData((cur) => ({ ...cur, [name]: files ? files[0] : value }));
  };

  const handleAddDocument = async () => {
    if (!formData.name || !formData.pdf || !formData.pages || !formData.category) {
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
      await api.post("/policies", data, { headers: { "Content-Type": "multipart/form-data" } });
      await fetchPolicies();
      setFormData({ name: "", pdf: null, pages: "", category: "" });
      setOpenModal(false);
    } catch (err) {
      alert(err?.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setDeletingId(id);
      await api.delete(`/policies/${id}`);
      await fetchPolicies();
    } catch (err) {
      alert(err?.response?.data?.message || "Delete failed");
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
    } catch (err) {
      alert(err?.response?.data?.message || "Accept failed");
    } finally {
      setAccepting(false);
    }
  };

  const policyCount = documents.filter(d => d.category === "Policy PDF" || d.category === "Policies").length;
  const complianceCount = documents.filter(d => d.category === "Compliance PDF" || d.category === "Compliances").length;
  const totalAcceptedCount = documents.reduce((acc, d) => acc + (d.acceptedBy?.length || 0), 0);

  return {
    isAdmin, pageLoading, documents, policyCount, complianceCount, totalAcceptedCount,
    selectedPdf, setSelectedPdf, isAgreed, setIsAgreed,
    hasScrolledToBottom, setHasScrolledToBottom,
    openModal, setOpenModal, formData, setFormData,
    uploading, deletingId, accepting, toast, setToast,
    handleChange, handleAddDocument, handleDelete, handleAcceptPolicy,
    openPdfViewer: (doc) => {
      setSelectedPdf(doc);
      setIsAgreed(false);
      setHasScrolledToBottom(false);
    }
  };
}
