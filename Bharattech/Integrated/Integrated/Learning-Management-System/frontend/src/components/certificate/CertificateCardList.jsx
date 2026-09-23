import React from "react";
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";

export default function CertificateCardList({
  certificates,
  glassPanel,
  apiOrigin,
  canDeleteCertificates,
  deletingCertificateId,
  onDelete
}) {
  return (
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
              href={`${apiOrigin}/${cert.filePath.replace(/^\/+/, "")}`}
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
                onClick={() => onDelete(cert)}
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
  );
}
