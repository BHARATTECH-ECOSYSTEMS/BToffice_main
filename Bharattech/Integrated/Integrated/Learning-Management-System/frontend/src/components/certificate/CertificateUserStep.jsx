import React from "react";
import { Avatar, Box, FormControl, FormLabel, InputBase, Paper, Typography } from "@mui/material";
import { Search, UserRound } from "lucide-react";

export default function CertificateUserStep({ search, setSearch, users, form, setForm }) {
  return (
    <Box sx={{ mt: 4 }}>
      <FormControl fullWidth>
        <FormLabel sx={{ mb: 1.5, color: "#111827", fontWeight: 700, fontSize: 15 }}>
          Find User
        </FormLabel>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 2,
            py: 1.15,
            borderRadius: "14px",
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            mb: 2.5,
            boxShadow: "0 3px 10px rgba(15,23,42,0.03)",
          }}
        >
          <Search size={18} color="#9ca3af" />
          <InputBase
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            sx={{ fontSize: 15, color: "#111827" }}
          />
        </Box>
      </FormControl>

      <Box sx={{ maxHeight: 430, overflowY: "auto", pr: 0.5 }}>
        <Box sx={{ display: "grid", gap: 2 }}>
          {users.map((user) => {
            const selected = form.userId === user._id;

            return (
              <Paper
                key={user._id}
                elevation={0}
                onClick={() => setForm((current) => ({ ...current, userId: user._id }))}
                sx={{
                  p: 2,
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 2.25 }}>
                  <Avatar
                    sx={{
                      width: 46,
                      height: 46,
                      background: selected ? "rgba(255,255,255,0.68)" : "#eff6ff",
                      color: selected ? "#1d4ed8" : "#2563eb",
                    }}
                  >
                    <UserRound size={20} />
                  </Avatar>

                  <Box>
                    <Typography sx={{ fontSize: { xs: 16, md: 17 }, fontWeight: 700, color: "#111827" }}>
                      {user.fullName || "Unnamed user"}
                    </Typography>
                    <Typography sx={{ mt: 0.35, color: "#6b7280", fontSize: 14 }}>
                      {user.email || user.employeeId || "User record"}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            );
          })}

          {users.length === 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                borderRadius: "18px",
                border: "1px dashed #d1d5db",
                textAlign: "center",
                color: "#6b7280",
                background: "#ffffff",
              }}
            >
              No matching users found
            </Paper>
          )}
        </Box>
      </Box>
    </Box>
  );
}
