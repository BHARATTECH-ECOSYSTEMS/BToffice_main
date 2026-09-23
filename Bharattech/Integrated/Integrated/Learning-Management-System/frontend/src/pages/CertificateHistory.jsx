import React from "react";
import {
  Box,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { History, Award, CalendarDays } from "lucide-react";
import CertificateTableView from "../components/certificate/CertificateTableView";
import CertificateCardList from "../components/certificate/CertificateCardList";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const glassPanel = {
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  backdropFilter: "blur(16px)",
};

const CertificateHistory = ({
  certificates,
  loading,
  canDeleteCertificates = false,
  deletingCertificateId = null,
  onDeleteCertificate,
}) => {
  const contentMaxWidth = 1080;

  const handleDelete = (cert) => {
    if (!canDeleteCertificates || !onDeleteCertificate) return;

    const confirmed = window.confirm(
      `Delete ${cert.title || "this certificate"}? This action cannot be undone.`
    );

    if (confirmed) {
      onDeleteCertificate(cert._id);
    }
  };

  if (loading) {
    return (
      <Paper
        sx={{
          ...glassPanel,
          mx: "auto",
          width: "100%",
          maxWidth: `${contentMaxWidth}px`,
          p: 5,
          textAlign: "center",
        }}
      >
        <CircularProgress size={34} sx={{ color: "#2563eb", mb: 2 }} />
        <Typography fontWeight={700}>Loading certificates...</Typography>
      </Paper>
    );
  }

  const latestIssued =
    certificates.length > 0
      ? new Date(
          Math.max(...certificates.map((cert) => new Date(cert.issuedAt).getTime()))
        ).toLocaleDateString()
      : "No records";

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: `${contentMaxWidth}px` }}>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.3fr 0.7fr 0.7fr" }, gap: 2.5, mb: 3 }}>
        <Paper sx={{ ...glassPanel, p: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: "16px",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                boxShadow: "0 12px 24px rgba(37, 99, 235, 0.24)",
              }}
            >
              <History size={24} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: { xs: "1.875rem", sm: "2.25rem" }, fontWeight: 700, lineHeight: 1.1 }}>
                Certificate History
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5, fontSize: 16 }}>
                View and manage issued certificates
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ ...glassPanel, p: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 42, height: 42, borderRadius: "12px", display: "grid", placeItems: "center", background: "#eff6ff", color: "#2563eb" }}>
              <Award size={20} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Total issued</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>{certificates.length}</Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper sx={{ ...glassPanel, p: 2.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box sx={{ width: 42, height: 42, borderRadius: "12px", display: "grid", placeItems: "center", background: "#eff6ff", color: "#2563eb" }}>
              <CalendarDays size={20} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">Latest issued</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{latestIssued}</Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {certificates.length === 0 ? (
        <Paper sx={{ ...glassPanel, p: 5, textAlign: "center" }}>
          <Box sx={{ fontSize: 48, mb: 2 }}>🎓</Box>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>No Certificates Yet</Typography>
          <Typography color="text.secondary" sx={{ mt: 1, fontSize: 15 }}>Certificates issued to you will appear here</Typography>
        </Paper>
      ) : (
        <>
          <Paper sx={{ ...glassPanel, display: { xs: "none", lg: "block" }, overflow: "hidden" }}>
            <CertificateTableView
              certificates={certificates}
              apiOrigin={API_ORIGIN}
              canDeleteCertificates={canDeleteCertificates}
              deletingCertificateId={deletingCertificateId}
              onDelete={handleDelete}
            />
          </Paper>

          <CertificateCardList
            certificates={certificates}
            glassPanel={glassPanel}
            apiOrigin={API_ORIGIN}
            canDeleteCertificates={canDeleteCertificates}
            deletingCertificateId={deletingCertificateId}
            onDelete={handleDelete}
          />
        </>
      )}
    </Box>
  );
};

export default CertificateHistory;
