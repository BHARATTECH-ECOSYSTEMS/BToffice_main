import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";

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

export function useMyCertificates(isAdmin, canDeleteCertificates) {
  const [tab, setTab] = useState(0);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingCertificateId, setDeletingCertificateId] = useState(null);
  const [error, setError] = useState("");

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

  return {
    tab,
    setTab,
    certificates,
    loading,
    deletingCertificateId,
    error,
    fetchCertificates,
    deleteCertificate,
    handleTabChange
  };
}
