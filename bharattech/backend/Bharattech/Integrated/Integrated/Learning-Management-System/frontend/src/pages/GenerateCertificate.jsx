import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  InputBase,
  LinearProgress,
  Paper,
  Typography,
} from "@mui/material";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  FileText,
  GraduationCap,
  Search,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import api from "../api/api";

const certificateOptions = [
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

const stepCopy = {
  1: {
    title: "Select Certificate Type",
    subtitle: "Choose the type of certificate you want to generate",
  },
  2: {
    title: "Select User",
    subtitle: "Search and choose the user for this certificate",
  },
  3: {
    title: "Review & Generate",
    subtitle: "Review the details before generating the certificate",
  },
};

const glassPanel = {
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.88)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
  backdropFilter: "blur(16px)",
};

const GenerateCertificate = ({ fetchCertificates, setTab }) => {
  const [form, setForm] = useState({
    userId: "",
    title: "",
  });
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get("/user");
        const list = Array.isArray(res.data) ? res.data : [];
        setUsers(list);
        setAllUsers(list);
      } catch {
        toast.error("Failed to fetch users");
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      setUsers(allUsers);
      return;
    }

    setUsers(
      allUsers.filter((user) =>
        [user.fullName, user.email, user.employeeId]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(value))
      )
    );
  }, [search, allUsers]);

  const selectedUser = useMemo(
    () => allUsers.find((user) => user._id === form.userId),
    [allUsers, form.userId]
  );

  const handleAssign = async () => {
    if (!form.userId || !form.title) {
      toast.error("Please select a certificate type and user");
      return;
    }

    setLoading(true);

    try {
      await api.post("/certificates/generate", form);
      toast.success("Certificate generated successfully");
      await fetchCertificates();
      setForm({ userId: "", title: "" });
      setSearch("");
      setStep(1);
      setTab(1);
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Failed to generate certificate"
      );
    } finally {
      setLoading(false);
    }
  };

  const nextDisabled =
    (step === 1 && !form.title) ||
    (step === 2 && !form.userId) ||
    loading;

  const progress = (step / 3) * 100;
  const currentStepMeta = stepCopy[step];
  const wizardMaxWidth = 1080;

  return (
    <Box
      sx={{
        mx: "auto",
        width: "100%",
        maxWidth: `${wizardMaxWidth}px`,
      }}
    >
      <Box
        sx={{
          ...glassPanel,
          p: { xs: 2.25, md: 3 },
          mb: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            justifyContent: "space-between",
            alignItems: { xs: "flex-start", md: "center" },
            gap: 1,
            mb: 1.25,
          }}
        >
          <Typography sx={{ fontSize: { xs: 16, md: 18 }, fontWeight: 600, color: "#6b7280" }}>
            Step {step} of 3
          </Typography>
          <Typography sx={{ fontSize: { xs: 16, md: 20 }, fontWeight: 800, color: "#2563eb" }}>
            {Math.round(progress)}%
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 10,
            borderRadius: 999,
            backgroundColor: "#bfdbfe",
            "& .MuiLinearProgress-bar": {
              borderRadius: 999,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
            },
          }}
        />
      </Box>

      <Paper
        elevation={0}
        sx={{
          ...glassPanel,
          overflow: "hidden",
        }}
      >
        <Box sx={{ p: { xs: 2.25, md: 3 } }}>
          <Typography
            sx={{
              fontSize: { xs: 18, md: 20 },
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.2,
            }}
          >
            {currentStepMeta.title}
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              color: "#6b7280",
              fontSize: { xs: 15, md: 16 },
            }}
          >
            {currentStepMeta.subtitle}
          </Typography>

          {step === 1 && (
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
                      background: selected
                        ? "linear-gradient(to right, #eff6ff, #dbeafe)"
                        : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.22s ease",
                      boxShadow: selected
                        ? "0 12px 28px rgba(37,99,235,0.14)"
                        : "0 4px 12px rgba(15,23,42,0.04)",
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
          )}

          {step === 2 && (
            <Box sx={{ mt: 4 }}>
              <FormControl fullWidth>
                <FormLabel
                  sx={{
                    mb: 1.5,
                    color: "#111827",
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
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
                    sx={{
                      fontSize: 15,
                      color: "#111827",
                    }}
                  />
                </Box>
              </FormControl>

              <Box
                sx={{
                  maxHeight: 430,
                  overflowY: "auto",
                  pr: 0.5,
                }}
              >
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
                          background: selected
                            ? "linear-gradient(to right, #eff6ff, #dbeafe)"
                            : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.22s ease",
                          boxShadow: selected
                            ? "0 12px 28px rgba(37,99,235,0.14)"
                            : "0 4px 12px rgba(15,23,42,0.04)",
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
          )}

          {step === 3 && (
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
          )}
        </Box>

        <Divider />

        <Box
          sx={{
            p: { xs: 2, md: 3 },
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexDirection: { xs: "column-reverse", sm: "row" },
          }}
        >
          <Button
            variant="outlined"
            onClick={() => setStep((current) => current - 1)}
            disabled={step === 1}
            startIcon={<ArrowLeft size={18} />}
            sx={{
              minWidth: 120,
              minHeight: 42,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 15,
              borderColor: "#d1d5db",
              color: "#4b5563",
              background: "#fff",
              width: { xs: "100%", sm: "auto" },
            }}
          >
            Back
          </Button>

          <Button
            variant="contained"
            onClick={step === 3 ? handleAssign : () => setStep((current) => current + 1)}
            disabled={nextDisabled}
            endIcon={step === 3 ? null : <ArrowRight size={18} />}
            sx={{
              minWidth: { xs: "100%", sm: 220 },
              minHeight: 42,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 15,
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 12px 24px rgba(37,99,235,0.24)",
              "&:hover": {
                background: "linear-gradient(135deg, #1d4ed8, #1e40af)",
                boxShadow: "0 12px 24px rgba(37,99,235,0.3)",
              },
              "&.Mui-disabled": {
                background: "#93c5fd",
                color: "#fff",
              },
            }}
          >
            {step === 3 ? (loading ? "Generating..." : "Generate Certificate") : "Next"}
          </Button>
        </Box>
      </Paper>

    </Box>
  );
};

export default GenerateCertificate;
