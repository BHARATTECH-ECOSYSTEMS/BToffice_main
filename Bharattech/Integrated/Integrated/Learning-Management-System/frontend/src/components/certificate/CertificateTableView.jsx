import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import { Trash2 } from "lucide-react";

export default function CertificateTableView({
  certificates,
  apiOrigin,
  canDeleteCertificates,
  deletingCertificateId,
  onDelete
}) {
  return (
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
                  href={`${apiOrigin}/${cert.filePath.replace(/^\/+/, "")}`}
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
                    onClick={() => onDelete(cert)}
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
  );
}
