import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Check, LayoutGrid, Users, MessageSquare, Calendar, FileText, Lock, Sparkles, AlertCircle } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { setSSOUserFromDirectGrant } from "@/lib/sso";
import { attachMagnetic } from "@/lib/animations";

const tools = [
  {
    name: "BT Origin Workspace",
    tag: "Unified Workspace",
    icon: LayoutGrid,
    desc: "A single, secure workspace for documents, drives, calendars and project boards — everything our teams need to collaborate, in one place.",
    points: ["Cloud documents & drives", "Shared team calendars", "Project boards & tasks"],
  },
  {
    name: "BT Origin HRMS",
    tag: "People & Payroll",
    icon: Users,
    desc: "Our in-house HRMS handles onboarding, attendance, leaves, payroll and performance — fully digital, paperless, and built around the employee.",
    points: ["Digital onboarding", "Attendance & leaves", "Payroll & payslips"],
  },
  {
    name: "Zulip",
    tag: "Official Communication",
    icon: MessageSquare,
    desc: "Threaded, topic-based conversations keep work focused. Zulip is our official channel for all team, project, and org-wide communication.",
    points: ["Topic-based channels", "Async-friendly threads", "Org-wide announcements"],
  },
];

const stats = [
  { value: "100%", label: "Digital-first operations" },
  { value: "0", label: "Paper-based workflows" },
  { value: "24/7", label: "Workspace availability" },
  { value: "1", label: "Unified employee identity" },
];

const principles = [
  { icon: Sparkles, title: "Tech-first culture", desc: "Every workflow at Bharattech is engineered, automated, and measurable." },
  { icon: Lock, title: "Secure by default", desc: "SSO, role-based access and encrypted data across every internal tool." },
  { icon: Calendar, title: "Async by design", desc: "Tools chosen so deep work isn't interrupted by meetings or noise." },
  { icon: FileText, title: "Documented everything", desc: "Decisions, processes and knowledge live in writing — searchable forever." },
];

const env = import.meta.env as Record<string, string | undefined>;
const LMS_BACKEND_URL = env.VITE_API_BASE_URL || "http://localhost:5000/api";
const LMS_URL = env.VITE_LMS_URL || "http://localhost:5173";

const Employees = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [accessRequested, setAccessRequested] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const ctaRefs = useRef<HTMLElement[]>([]);

  useEffect(() => {
    if (!loginError) return;
    const timer = setTimeout(() => setLoginError(null), 2500);
    return () => clearTimeout(timer);
  }, [loginError]);

  useEffect(() => {
    if (location.hash === "#employee-access") {
      window.requestAnimationFrame(() => {
        document.getElementById("employee-access")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.hash]);

  useEffect(() => {
    const cleanups = ctaRefs.current.filter(Boolean).map((el) => attachMagnetic(el, { strength: 0.25 }));
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />

      {/* HERO — Akrivia-style centered hero */}
      <section id="employees" className="relative scroll-mt-28 overflow-hidden">
        {/* Violet wash backdrop */}
        <div
          className="absolute inset-x-0 top-0 h-[900px] -z-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(77,49,232,0.32) 0%, rgba(77,49,232,0.16) 35%, rgba(77,49,232,0.05) 65%, transparent 100%)",
          }}
        />
        {/* Bright top glow */}
        <div
          className="absolute inset-x-0 top-0 h-[600px] -z-0"
          style={{
            background:
              "radial-gradient(60% 70% at 50% 0%, rgba(106,88,255,0.5) 0%, rgba(106,88,255,0.2) 35%, transparent 70%)",
          }}
        />
        {/* Vertical light beams (the highlighted effect) */}
        <div
          className="absolute inset-x-0 top-0 h-[820px] -z-0 pointer-events-none"
          style={{
            backgroundImage: [
              "linear-gradient(180deg, hsl(0 0% 100% / 0.5), hsl(0 0% 100% / 0) 70%)",
              "repeating-linear-gradient(90deg, transparent 0 22px, hsl(0 0% 100% / 0.3) 22px 23px, transparent 23px 60px, hsl(0 0% 100% / 0.2) 60px 61px, transparent 61px 110px, hsl(0 0% 100% / 0.4) 110px 112px, transparent 112px 170px)",
            ].join(","),
            backgroundBlendMode: "screen",
            maskImage:
              "radial-gradient(80% 70% at 50% 0%, black 0%, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(80% 70% at 50% 0%, black 0%, black 30%, transparent 75%)",
          }}
        />
        {/* Soft fade to page background at bottom */}
        <div
          className="absolute inset-x-0 top-[600px] h-[300px] -z-0"
          style={{
            background: "linear-gradient(180deg, transparent, #040406)",
          }}
        />

        <div className="relative max-w-[1100px] mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-primary/25 bg-white/[0.05] backdrop-blur-sm shadow-sm mb-9"
            >
              <Sparkles className="h-3.5 w-3.5 text-brand-secondary" />
              <span className="text-xs font-medium tracking-wide text-white/80">
                The most digital-first workplace in India
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display text-white font-bold tracking-tight leading-[1.05] text-[clamp(2.25rem,6vw,4.75rem)] max-w-3xl"
            >
              Looking for a Better Way to <span className="text-brand-secondary">Work Digitally?</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.12 }}
              className="mt-6 text-base sm:text-lg text-brand-muted max-w-xl leading-relaxed"
            >
              Simple, AI-powered, and fully unified workplace stack — built in-house at Bharattech for every employee, from day one.
            </motion.p>

            {/* Trust row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.18 }}
              className="mt-10 flex items-center gap-8"
            >
              {[
                { label: "Tech-First", sub: "Workplace 2026" },
                { label: "Async-Ready", sub: "Org Culture" },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/15 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-brand-secondary" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white leading-tight">{b.label}</div>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {[...Array(5)].map((_, i) => (
                        <svg key={i} viewBox="0 0 20 20" className="h-3 w-3 fill-brand-secondary">
                          <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Employee login — Keycloak (direct grant) with LMS-backend / mock fallback */}
            <motion.form
              id="employee-access"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              onSubmit={async (e) => {
                e.preventDefault();
                setAccessRequested(true);
                try {
                  // Validate credentials via LMS backend (server-to-server Keycloak call, no CORS issues)
                  const res = await fetch(`${LMS_BACKEND_URL}/auth/keycloak-login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password }),
                  });

                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    setLoginError(err.message || "Invalid username or password");
                    setAccessRequested(false);
                    return;
                  }

                  const data = await res.json() as {
                    access_token: string;
                    refresh_token?: string;
                    id_token?: string;
                    user: {
                      fullName: string; firstName: string; lastName: string;
                      username: string; email: string; role: string;
                    };
                  };

                  const u = data.user;

                  // Update Bharat navbar immediately
                  setSSOUserFromDirectGrant({
                    firstName: u.firstName || "",
                    lastName:  u.lastName  || "",
                    fullName:  u.fullName  || "",
                    email:     u.email     || "",
                    username:  u.username  || "",
                    role:      (u.role || "").toUpperCase(),
                  }, data.access_token);

                  // Build LMS URL with token + user so the dashboard bootstraps without
                  // a Keycloak browser session (Direct Access Grant doesn't set one)
                  const lmsParams = new URLSearchParams({
                    token: data.access_token,
                    user:  JSON.stringify(u),
                  });
                  if (data.refresh_token) lmsParams.set("refresh_token", data.refresh_token);
                  if (data.id_token)      lmsParams.set("id_token",      data.id_token);

                  // Open the LMS dashboard in a new tab
                  window.open(`${LMS_URL}/dashboard?${lmsParams.toString()}`, "_blank", "noopener,noreferrer");

                  navigate("/");
                  setAccessRequested(false);
                } catch (error) {
                  console.error("Login failed", error);
                  setLoginError("Login error. Please check your credentials and try again.");
                  setAccessRequested(false);
                }
              }}
              className="scroll-mt-28 mt-10 w-full max-w-md flex flex-col gap-3"
            >
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username or work email*"
                className="h-12 w-full px-5 rounded-xl bg-white/[0.04] border border-brand-border text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-secondary/50 transition-colors"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password*"
                className="h-12 w-full px-5 rounded-xl bg-white/[0.04] border border-brand-border text-sm text-white placeholder:text-brand-muted focus:outline-none focus:border-brand-secondary/50 transition-colors"
              />
              <button
                ref={(el) => { if (el) ctaRefs.current[0] = el; }}
                type="submit"
                disabled={accessRequested}
                className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-sm font-semibold text-white hover:opacity-95 transition-opacity disabled:opacity-70"
                style={{
                  background: "linear-gradient(135deg, #4D31E8 0%, #6A58FF 100%)",
                }}
              >
                {accessRequested ? "Logging in..." : "Login"} <ArrowRight className="h-4 w-4" />
              </button>
              <p className="text-xs text-brand-muted">
                Sign in with your Bharattech employee credentials.
              </p>
            </motion.form>

            {/* Trusted by strip */}
            <div className="mt-16 w-full">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12">
                <div className="text-left text-xs text-brand-muted leading-tight">
                  <div className="font-semibold text-white">Trusted by 200+</div>
                  <div>Bharattechies worldwide</div>
                </div>
                <div className="flex items-center gap-8 sm:gap-10 opacity-60">
                  {["Collegecue", "Rivinity", "RECAG", "BT Origin"].map((logo) => (
                    <span key={logo} className="font-display text-sm sm:text-base font-bold tracking-tight text-white">
                      {logo}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRINCIPLES */}
      <section className="py-14 lg:py-18 bg-brand-bg2">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-4">How we operate</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
              A tech-emphasised organization, end to end.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {principles.map((p) => (
              <div key={p.title} className="p-6 rounded-2xl bg-white/[0.04] border border-brand-border">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/15 flex items-center justify-center mb-5">
                  <p.icon className="h-5 w-5 text-brand-secondary" />
                </div>
                <h3 className="font-display text-base font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE STACK */}
      <section id="stack" className="py-14 lg:py-20 bg-brand-bg">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-4">The Bharattech stack</p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
                Everything our team needs, <span className="text-brand-secondary">all in one place.</span>
              </h2>
            </div>
            <p className="text-base text-brand-muted max-w-md leading-relaxed">
              Three core platforms power every Bharattechie's day — from the moment you join,
              to how you ship, to how you talk to the team.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tools.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative p-7 rounded-3xl bg-white/[0.03] border border-brand-border hover:border-brand-secondary/40 transition-colors"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: "linear-gradient(135deg, #4D31E8 0%, #6A58FF 100%)",
                  }}
                >
                  <t.icon className="h-5 w-5 text-white" />
                </div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brand-muted mb-2">{t.tag}</p>
                <h3 className="font-display text-xl font-bold text-white mb-3">{t.name}</h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-6">{t.desc}</p>
                <ul className="space-y-2.5">
                  {t.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-sm text-white/80">
                      <span className="mt-0.5 w-4 h-4 rounded-full bg-brand-primary/15 flex items-center justify-center flex-shrink-0">
                        <Check className="h-2.5 w-2.5 text-brand-secondary" strokeWidth={3} />
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* MESSAGE / CTA */}
      <section className="py-14 lg:py-20 bg-brand-bg2">
        <div className="max-w-[1100px] mx-auto px-6">
          <div
            className="relative overflow-hidden rounded-[2rem] p-10 sm:p-14 lg:p-20 text-center"
            style={{
              background: "radial-gradient(120% 80% at 70% 30%, #6A58FF 0%, #4D31E8 40%, #040406 100%)",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.22),transparent_55%)]" />
            <div className="relative z-10 max-w-3xl mx-auto">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60 mb-5">A note to every Bharattechie</p>
              <h2 className="font-display text-white font-bold tracking-tight leading-[1.1] text-[clamp(1.75rem,4.5vw,3.25rem)]">
                You're joining a company that takes its tools — and its people — seriously.
              </h2>
              <p className="mt-6 text-base sm:text-lg text-white/75 leading-relaxed">
                Whether you're a current employee or about to join us, expect a workplace
                where everything is digital, every process is documented, and every voice
                is heard on Zulip. Welcome to Bharattech.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Link
                  ref={(el) => { if (el) ctaRefs.current[1] = el; }}
                  to="/careers"
                  className="inline-flex items-center gap-2 h-12 px-7 rounded-full bg-white text-[#040406] text-sm font-semibold hover:bg-white/90 transition-colors"
                >
                  See open roles <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  ref={(el) => { if (el) ctaRefs.current[2] = el; }}
                  to="/about"
                  className="inline-flex items-center h-12 px-7 rounded-full border border-white/25 text-white text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  About Bharattech
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {loginError && (
        <div key={loginError} className="toast-error flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <span className="font-medium text-foreground">{loginError}</span>
        </div>
      )}
    </div>
  );
};

export default Employees;
