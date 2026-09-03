import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Container,
  Grid,
  Chip,
  LinearProgress,
  Paper,
  Divider,
  Stack,
  useTheme,
  alpha,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import api from "../api/axios";
import keycloak from "../auth/keycloak";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";


/* ---------------- STYLED COMPONENTS ---------------- */

const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha("#FF9800", 0.12)} 0%, ${alpha(
    "#2196F3",
    0.08
  )} 100%)`,
  borderRadius: 28,
  padding: "48px 40px",
  marginBottom: 40,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
}));

const CertificateCard = styled(Card)(({ theme }) => ({
  borderRadius: 28,
  border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
  transition: "0.4s ease",
  "&:hover": {
    transform: "translateY(-10px)",
    boxShadow: `0 30px 60px ${alpha(theme.palette.primary.main, 0.3)}`,
  },
}));

const PremiumButton = styled(Button)(({ theme }) => ({
  borderRadius: 24,
  padding: "14px 28px",
  fontWeight: 700,
  textTransform: "none",
  background: `linear-gradient(135deg, ${theme.palette.primary.main}, #FF9800)`,
  color: "#fff",
  "&:hover": {
    background: `linear-gradient(135deg, #FF9800, ${theme.palette.primary.main})`,
  },
}));

const EmptyStateCard = styled(Paper)(({ theme }) => ({
  borderRadius: 32,
  padding: 80,
  textAlign: "center",
  border: `3px dashed ${alpha(theme.palette.primary.main, 0.25)}`,
}));

/* ---------------- COMPONENT ---------------- */

const MyCertificates = () => {
  const theme = useTheme();
  const [certificates, setCertificates] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        // ✅ ALWAYS refresh token before API call
        await keycloak.updateToken(30);

        const res = await api.get("/certificates/my");
        console.log("API RESPONSE:", res.data);
        setCertificates(res.data.certificates || []);
      } catch (err) {
        console.error(err);
        toast.error("Failed to load certificates");
      } finally {
        setLoading(false);
      }
    };

    // ✅ Wait until Keycloak is initialized
    if (keycloak?.authenticated) {
      fetchCertificates();
    } else {
      setLoading(false);
    }
  }, []);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  if (loading) {
    return (
      <Container sx={{ py: 12, textAlign: "center" }}>
        <CircularProgress size={64} />
        <Typography mt={3} fontWeight={700}>
          Loading certificates…
        </Typography>
        <LinearProgress
          sx={{
            mt: 3,
            height: 6,
            borderRadius: 4,
            backgroundColor: alpha(theme.palette.primary.main, 0.1),
          }}
        />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Toaster position="bottom-right" />

      <HeroSection
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h3"
            fontWeight={900}
            sx={{
              background: `linear-gradient(45deg, ${theme.palette.primary.main}, #FF9800)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            My Certificates
          </Typography>

          <Typography color="text.secondary" mt={2}>
            All your verified achievements in one place
          </Typography>

          <Chip
            label={`${certificates.length} Certificates`}
            color="primary"
            sx={{ mt: 2, fontWeight: 700 }}
          />
        </Box>

        {/* ✅ ADD BUTTON HERE */}
        <Button
          variant="contained"
          sx={{ height: "fit-content" }}
          onClick={() => navigate("/generate-certificate")}
        >
          Generate Certificate
        </Button>
      </HeroSection>

      {certificates.length === 0 ? (
        <EmptyStateCard elevation={0}>
          <Typography variant="h4" fontWeight={800}>
            No Certificates Yet
          </Typography>
          <Typography mt={2} color="text.secondary">
            Complete courses or internships to unlock certificates.
          </Typography>
        </EmptyStateCard>
      ) : (
        <Grid container spacing={4}>
          {Array.isArray(certificates) &&
           certificates.map((cert) => (
            <Grid item xs={12} md={6} lg={4} key={cert._id}>
              <CertificateCard elevation={0}>
                <CardContent sx={{ p: 4 }}>
                  <Typography variant="h5" fontWeight={800} mb={1}>
                    {cert.title}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography fontWeight={600}>
                    {formatDate(cert.issuedAt)}
                  </Typography>

                  <Stack spacing={2} mt={4}>
                    <PremiumButton
                      fullWidth
                      onClick={async () => {
                        try {
                          const res = await api.get(
                            cert.fileUrl.replace("/certificates", ""),
                            {
                              responseType: "blob",
                            }
                          );

                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          window.open(url);
                        } catch (err) {
                          toast.error("Failed to open certificate");
                        }
                      }}
                      target="_blank"
                    >
                      View Certificate
                    </PremiumButton>

                    <Button
                      variant="outlined"
                      color="primary"
                      fullWidth
                      sx={{ borderRadius: 24, fontWeight: 700 }}
                      onClick={async () => {
                        try {
                          const res = await api.get(
                            cert.fileUrl.replace("/certificates", ""),
                            {
                              responseType: "blob",
                            }
                          );

                          const url = window.URL.createObjectURL(new Blob([res.data]));
                          window.open(url);
                        } catch (err) {
                          toast.error("Failed to open certificate");
                        }
                      }}
                      download
                    >
                      Download PDF
                    </Button>
                  </Stack>
                </CardContent>
              </CertificateCard>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default MyCertificates;
