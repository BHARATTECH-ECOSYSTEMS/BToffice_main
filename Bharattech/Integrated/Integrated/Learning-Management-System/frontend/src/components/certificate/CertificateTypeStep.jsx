import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { FileText, ShieldCheck, GraduationCap, BookOpen } from "lucide-react";

export const certificateOptions = [
  {
    value: "Bonafide Certificate",
    label: "Bonafide Certificate",
    description: "Official proof of enrollment and institutional association",
    icon: FileText,
  },
  {
    value: "Character Certificate",
    label: "Character Certificate",
    description: "Verification of conduct and profile details",
    icon: ShieldCheck,
  },
  {
    value: "Transfer Certificate",
    label: "Transfer Certificate",
    description: "For migration, transfer, or institutional exit workflow",
    icon: GraduationCap,
  },
  {
    value: "Course Completion",
    label: "Course Completion",
    description: "Certificate for successful completion of a program",
    icon: BookOpen,
  },
];

export default function CertificateTypeStep({ form, setForm }) {
  return (
    <Box
      sx={{
        mt: 4,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" },
        gap: 2.5,
      }}
    >
      {certificateOptions.map((item) => {
        const Icon = item.icon;
        const selected = form.title === item.value;

        return (
          <Paper
            key={item.value}
            elevation={0}
            onClick={() => setForm((current) => ({ ...current, title: item.value }))}
            sx={{
              p: 2.25,
              borderRadius: "18px",
              border: selected ? "1.5px solid #2563eb" : "1px solid #e5e7eb",
              background: selected ? "linear-gradient(to right, #eff6ff, #dbeafe)" : "#ffffff",
              cursor: "pointer",
              transition: "all 0.22s ease",
              boxShadow: selected ? "0 12px 28px rgba(37,99,235,0.14)" : "0 4px 12px rgba(15,23,42,0.04)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2.25 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: "14px",
                  display: "grid",
                  placeItems: "center",
                  background: selected ? "rgba(255,255,255,0.68)" : "#f8fafc",
                  color: selected ? "#1d4ed8" : "#374151",
                  flexShrink: 0,
                }}
              >
                <Icon size={22} />
              </Box>

              <Box>
                <Typography sx={{ fontSize: { xs: 16, md: 17 }, fontWeight: 700, color: "#111827" }}>
                  {item.label}
                </Typography>
                <Typography sx={{ mt: 0.5, color: "#6b7280", fontSize: { xs: 14, md: 14 } }}>
                  {item.description}
                </Typography>
              </Box>
            </Box>
          </Paper>
        );
      })}
    </Box>
  );
}
