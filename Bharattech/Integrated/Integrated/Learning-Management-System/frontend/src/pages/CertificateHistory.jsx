import React from "react";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { History, Award, CalendarDays, Trash2 } from "lucide-react";

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
    <Box
      sx={{
        mx: "auto",
        width: "100%",
        maxWidth: `${contentMaxWidth}px`,
      }}
    >
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.3fr 0.7fr 0.7fr" }, gap: 2.5, mb: 3 }}>
        <Paper
          sx={{
            ...glassPanel,
            p: 3,
          }}
        >
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

        <Paper
          sx={{
            ...glassPanel,
            p: 2.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "#eff6ff",
                color: "#2563eb",
              }}
            >
              <Award size={20} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Total issued
              </Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#111827" }}>
                {certificates.length}
              </Typography>
            </Box>
          </Stack>
        </Paper>

        <Paper
          sx={{
            ...glassPanel,
            p: 2.5,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "#eff6ff",
                color: "#2563eb",
              }}
            >
              <CalendarDays size={20} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Latest issued
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
                {latestIssued}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {certificates.length === 0 ? (
        <Paper
          sx={{
            ...glassPanel,
            p: 5,
            textAlign: "center",
          }}
        >
          <Box sx={{ fontSize: 48, mb: 2 }}>🎓</Box>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>
            No Certificates Yet
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1, fontSize: 15 }}>
            Certificates issued to you will appear here
          </Typography>
        </Paper>
      ) : (
        <>
          <Paper
            sx={{
              ...glassPanel,
              display: { xs: "none", lg: "block" },
              overflow: "hidden",
            }}
          >
            <TableContainer>
              <Table>
                <TableHead sx={{ background: "#f3f4f6" }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563", fontSize: 15 }}>Certificate Type</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563", fontSize: 15 }}>Issued By</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563", fontSize: 15 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: "#4b5563", fontSize: 15 }}>Action</TableCell>
                    {canDeleteCertificates && (
                      <TableCell sx={{ fontWeight: 700, color: "#4b5563", fontSize: 15 }}>Delete</TableCell>
                    )}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow
                      key={cert._id}
                      sx={{
                        "&:hover": {
                          backgroundColor: "#eff6ff",
                        },
                      }}
                    >
                      <TableCell sx={{ fontWeight: 700, color: "#111827" }}>
                        {cert.title}
                      </TableCell>
                      <TableCell sx={{ fontSize: 15 }}>{cert.issuedBy?.fullName || "Admin"}</TableCell>
                      <TableCell sx={{ fontSize: 15 }}>{new Date(cert.issuedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="contained"
                          size="small"
                          href={`${API_ORIGIN}/${cert.filePath.replace(/^\/+/, "")}`}
                          target="_blank"
                          sx={{
                            borderRadius: "10px",
                            textTransform: "none",
                            fontWeight: 700,
                            px: 2,
                            background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                            boxShadow: "0 10px 18px rgba(37,99,235,0.22)",
                            "&:hover": {
                              background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
                            },
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                      {canDeleteCertificates && (
                        <TableCell>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Trash2 size={15} />}
                            onClick={() => handleDelete(cert)}
                            disabled={deletingCertificateId === cert._id}
                            sx={{
                              borderRadius: "10px",
                              textTransform: "none",
                              fontWeight: 700,
                              px: 2,
                              color: "#dc2626",
                              borderColor: "#fecaca",
                              backgroundColor: "#fff",
                              "&:hover": {
                                borderColor: "#fca5a5",
                                backgroundColor: "#fef2f2",
                              },
                              "&.Mui-disabled": {
                                color: "#fca5a5",
                                borderColor: "#fee2e2",
                              },
                            }}
                          >
                            {deletingCertificateId === cert._id ? "Deleting..." : "Delete"}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>

          <Box sx={{ display: { xs: "grid", lg: "none" }, gap: 2 }}>
            {certificates.map((cert) => (
              <Paper
                key={cert._id}
                elevation={0}
                sx={{
                  ...glassPanel,
                  p: 2,
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#111827", mb: 1.25 }}>
                  {cert.title}
                </Typography>

                <List disablePadding>
                  <ListItem disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                      primary="Issued by"
                      secondary={cert.issuedBy?.fullName || "Admin"}
                      primaryTypographyProps={{ color: "#9ca3af", fontWeight: 700, fontSize: 12 }}
                      secondaryTypographyProps={{ color: "#111827", fontWeight: 600 }}
                    />
                  </ListItem>
                  <Divider />
                  <ListItem disableGutters sx={{ py: 0.5 }}>
                    <ListItemText
                      primary="Date"
                      secondary={new Date(cert.issuedAt).toLocaleDateString()}
                      primaryTypographyProps={{ color: "#9ca3af", fontWeight: 700, fontSize: 12 }}
                      secondaryTypographyProps={{ color: "#111827", fontWeight: 600 }}
                    />
                  </ListItem>
                </List>

                <Box
                  sx={{
                    mt: 2,
                    display: "grid",
                    gridTemplateColumns: canDeleteCertificates ? "1fr 1fr" : "1fr",
                    gap: 1.25,
                  }}
                >
                  <Button
                    fullWidth
                    variant="contained"
                    href={`${API_ORIGIN}/${cert.filePath.replace(/^\/+/, "")}`}
                    target="_blank"
                    sx={{
                      minHeight: 40,
                      borderRadius: "12px",
                      textTransform: "none",
                      fontWeight: 700,
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      boxShadow: "0 10px 18px rgba(37,99,235,0.22)",
                      "&:hover": {
                        background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
                      },
                    }}
                  >
                    View
                  </Button>

                  {canDeleteCertificates && (
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Trash2 size={16} />}
                      onClick={() => handleDelete(cert)}
                      disabled={deletingCertificateId === cert._id}
                      sx={{
                        minHeight: 40,
                        borderRadius: "12px",
                        textTransform: "none",
                        fontWeight: 700,
                        color: "#dc2626",
                        borderColor: "#fecaca",
                        backgroundColor: "#fff",
                        "&:hover": {
                          borderColor: "#fca5a5",
                          backgroundColor: "#fef2f2",
                        },
                        "&.Mui-disabled": {
                          color: "#fca5a5",
                          borderColor: "#fee2e2",
                        },
                      }}
                    >
                      {deletingCertificateId === cert._id ? "Deleting..." : "Delete"}
                    </Button>
                  )}
                </Box>
              </Paper>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
};

export default CertificateHistory;
