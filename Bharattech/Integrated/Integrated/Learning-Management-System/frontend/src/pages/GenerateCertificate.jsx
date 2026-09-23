import React, { useEffect, useMemo, useState } from "react";
import { Box, Button, Divider, LinearProgress, Paper, Typography } from "@mui/material";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight } from "lucide-react";
import api from "../api/api";
import CertificateTypeStep from "../components/certificate/CertificateTypeStep";
import CertificateUserStep from "../components/certificate/CertificateUserStep";
import CertificateReviewStep from "../components/certificate/CertificateReviewStep";

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
  const [form, setForm] = useState({ userId: "", title: "" });
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
      toast.error(err?.response?.data?.message || "Failed to generate certificate");
    } finally {
      setLoading(false);
    }
  };

  const nextDisabled =
    (step === 1 && !form.title) || (step === 2 && !form.userId) || loading;

  const progress = (step / 3) * 100;
  const currentStepMeta = stepCopy[step];

  return (
    <Box sx={{ mx: "auto", width: "100%", maxWidth: "1080px" }}>
      <Box sx={{ ...glassPanel, p: { xs: 2.25, md: 3 }, mb: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.25 }}>
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

      <Paper elevation={0} sx={{ ...glassPanel, overflow: "hidden" }}>
        <Box sx={{ p: { xs: 2.25, md: 3 } }}>
          <Typography sx={{ fontSize: { xs: 18, md: 20 }, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
            {currentStepMeta.title}
          </Typography>
          <Typography sx={{ mt: 0.75, color: "#6b7280", fontSize: { xs: 15, md: 16 } }}>
            {currentStepMeta.subtitle}
          </Typography>

          {step === 1 && <CertificateTypeStep form={form} setForm={setForm} />}
          {step === 2 && <CertificateUserStep search={search} setSearch={setSearch} users={users} form={form} setForm={setForm} />}
          {step === 3 && <CertificateReviewStep form={form} selectedUser={selectedUser} />}
        </Box>

        <Divider />

        <Box sx={{ p: { xs: 2, md: 3 }, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexDirection: { xs: "column-reverse", sm: "row" } }}>
          <Button
            variant="outlined"
            onClick={() => setStep((cur) => cur - 1)}
            disabled={step === 1}
            startIcon={<ArrowLeft size={18} />}
            sx={{ minWidth: 120, minHeight: 42, borderRadius: "12px", textTransform: "none", fontWeight: 700, fontSize: 15, borderColor: "#d1d5db", color: "#4b5563", background: "#fff", width: { xs: "100%", sm: "auto" } }}
          >
            Back
          </Button>

          <Button
            variant="contained"
            onClick={step === 3 ? handleAssign : () => setStep((cur) => cur + 1)}
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
              "&:hover": { background: "linear-gradient(135deg, #1d4ed8, #1e40af)", boxShadow: "0 12px 24px rgba(37,99,235,0.3)" },
              "&.Mui-disabled": { background: "#93c5fd", color: "#fff" },
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
