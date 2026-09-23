import React from "react";
import { Avatar, Box, Paper, Typography } from "@mui/material";
import { FileText, UserRound } from "lucide-react";

export default function CertificateReviewStep({ form, selectedUser }) {
  return (
    <Box sx={{ mt: 4 }}>
      <Box sx={{ display: "grid", gap: 2.5 }}>
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "18px",
            background: "#eff6ff",
            border: "1px solid #dbeafe",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 46,
                height: 46,
                borderRadius: "14px",
                display: "grid",
                placeItems: "center",
                background: "#fff",
                color: "#2563eb",
                flexShrink: 0,
              }}
            >
              <FileText size={20} />
            </Box>
            <Box>
              <Typography sx={{ color: "#6b7280", fontSize: 14 }}>
                Certificate Type
              </Typography>
              <Typography sx={{ color: "#111827", fontWeight: 700, fontSize: { xs: 16, md: 17 } }}>
                {form.title}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "18px",
            background: "#eff6ff",
            border: "1px solid #dbeafe",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                width: 46,
                height: 46,
                background: "#ffffff",
                color: "#2563eb",
                flexShrink: 0,
              }}
            >
              <UserRound size={20} />
            </Avatar>
            <Box>
              <Typography sx={{ color: "#6b7280", fontSize: 14 }}>
                Selected User
              </Typography>
              <Typography sx={{ color: "#111827", fontWeight: 700, fontSize: { xs: 16, md: 17 } }}>
                {selectedUser?.fullName || "No user selected"}
              </Typography>
              <Typography sx={{ color: "#6b7280", fontSize: 14 }}>
                {selectedUser?.email || selectedUser?.employeeId || ""}
              </Typography>
            </Box>
          </Box>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: "16px",
            border: "1px solid #bfdbfe",
            background: "#eff6ff",
            color: "#1e40af",
            fontSize: 14,
            lineHeight: 1.55,
          }}
        >
          Please verify all details before generating the certificate. Once generated, it will appear in certificate history for review and download.
        </Paper>
      </Box>
    </Box>
  );
}
