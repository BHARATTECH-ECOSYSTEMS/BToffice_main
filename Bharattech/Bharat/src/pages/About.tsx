import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronDown, Star, Users, Target, Globe, Lightbulb, Shield, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { attachMagnetic, attachTilt, countUpOnScroll } from "@/lib/animations";
import teamCollab from "@/assets/team-collab.jpg";
import peopleCandid from "@/assets/people-candid.jpg";
import visionHero from "@/assets/vision-hero.jpg";

const partners = ["Collegecue", "Rivinity", "RECAG", "BT Origin", "BharatAI"];

const stats = [
  { to: 90, suffix: "%", label: "Client satisfaction" },
  { to: 180, suffix: "+", label: "Projects delivered" },
  { to: 10, suffix: "K+", label: "Lives impacted" },
];

const accordion = [
  { title: "Sovereign by design", body: "Our LLM and GPU network are built and operated entirely within India — your data never leaves the country." },
  { title: "Scalable & future-ready", body: "From a single GPU to a national grid, our infrastructure scales linearly with your workload and ambition." },
  { title: "People-centric approach", body: "Every product decision starts with the user — students, researchers and enterprises across India." },
  { title: "Security & compliance first", body: "ISO 9001:2015, GDPR and SOC 2 aligned operations, with end-to-end encryption baked into every workflow." },
];

const team = [
  { name: "Aarav Mehta", role: "Founder & CEO" },
  { name: "Isha Verma", role: "Head of AI Research" },
  { name: "Rohan Kapoor", role: "Chief Architect" },
  { name: "Neha Iyer", role: "Head of People" },
];

const values = [
  { icon: Target, title: "Mission Driven", desc: "Sovereign, accessible AI for India and the world." },
  { icon: Users, title: "People First", desc: "A diverse team of AI, engineering and design minds." },
  { icon: Globe, title: "Global Impact", desc: "Built in India, designed to serve communities worldwide." },
  { icon: Lightbulb, title: "Always Curious", desc: "We push boundaries while keeping safety at the core." },
];

const About = () => {
  const [openIdx, setOpenIdx] = useState(0);
  const ctaRefs = useRef<HTMLElement[]>([]);
  const statRefs = useRef<HTMLDivElement[]>([]);
  const teamRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanups = ctaRefs.current.filter(Boolean).map((el) => attachMagnetic(el, { strength: 0.25 }));
    return () => cleanups.forEach((c) => c());
  }, []);

  useEffect(() => {
    if (!teamRef.current) return;
    const cards = teamRef.current.querySelectorAll<HTMLElement>("[data-team-card]");
    const cleanups = Array.from(cards).map((el) => attachTilt(el, { max: 5 }));
    return () => cleanups.forEach((c) => c());
  }, []);

  useEffect(() => {
    stats.forEach((s, i) => {
      const el = statRefs.current[i];
      if (el) countUpOnScroll(el, s.to, { suffix: s.suffix });
    });
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />

      {/* HERO — Truvista-style */}
      <section id="about" className="relative scroll-mt-28 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-[700px] -z-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(77,49,232,0.22) 0%, rgba(77,49,232,0.08) 50%, transparent 100%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-6 pt-10 pb-14">
          <div id="story" className="grid scroll-mt-28 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 text-xs text-brand-muted mb-6">
                <span className="w-5 h-5 rounded-full bg-brand-primary/15 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-brand-secondary" />
                </span>
                Home / About Us
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.02] tracking-tight">
                Your Trusted Partner in <span className="text-brand-secondary">AI</span> Innovation
              </h1>
              <div className="flex items-center gap-3 mt-8">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-white/10 border-2 border-brand-bg flex items-center justify-center text-xs font-semibold text-white">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full bg-brand-primary border-2 border-brand-bg flex items-center justify-center text-xs font-semibold text-white">
                    +
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="space-y-5">
              <p className="text-base text-brand-muted leading-relaxed">
                We help organizations harness the power of sovereign AI to streamline operations, scale efficiently, and stay competitive in a fast-changing world.
              </p>
              <div className="rounded-3xl overflow-hidden">
                <img src={teamCollab} alt="Bharattech team" className="w-full h-[260px] object-cover" />
              </div>
              <Link
                ref={(el) => { if (el) ctaRefs.current[0] = el; }}
                to="/careers"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand-primary/15 text-brand-secondary text-sm font-semibold hover:bg-brand-primary/25 transition-colors"
              >
                Let's Work Together <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>

          {/* Trusted partners */}
          <div className="mt-16 flex flex-wrap items-center gap-x-10 gap-y-4">
            <span className="text-xs uppercase tracking-[0.2em] text-brand-muted">Our Trusted Partners</span>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-3">
              {partners.map((p) => (
                <span key={p} className="font-display text-base font-bold text-white/50">{p}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* DRIVEN BY INNOVATION */}
      <section id="contact" className="scroll-mt-28 py-14 lg:py-20 bg-brand-bg2">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-4">About Us</p>
              <h2 className="font-display text-4xl sm:text-5xl font-bold text-white leading-[1.05] tracking-tight">
                Driven by <span className="text-brand-secondary">innovation.</span> Powered by people.
              </h2>
              <p className="mt-6 text-base text-brand-muted leading-relaxed">
                With years of expertise across AI research, infrastructure, cloud architecture and education, we empower organizations to thrive in an increasingly competitive digital world — without compromising on sovereignty.
              </p>
              <Link
                ref={(el) => { if (el) ctaRefs.current[1] = el; }}
                to="/careers"
                className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-full bg-brand-primary/15 text-brand-secondary text-sm font-semibold hover:bg-brand-primary/25 transition-colors"
              >
                Learn More <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }} className="relative">
              <div className="rounded-3xl overflow-hidden bg-white/5 p-2">
                <img src={peopleCandid} alt="Bharattech leadership" className="w-full h-[380px] object-cover rounded-[1.4rem]" />
              </div>
              <div className="absolute -left-4 top-10 hidden sm:flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.06] border border-brand-border shadow-lg backdrop-blur-sm">
                <div className="w-9 h-9 rounded-full bg-brand-primary/15 flex items-center justify-center">
                  <Star className="h-4 w-4 text-brand-secondary fill-brand-secondary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">4.9 / 5</div>
                  <div className="text-[10px] text-brand-muted">From 200+ partners</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 mt-16">
            {stats.map((s, i) => (
              <div key={s.label}>
                <div
                  ref={(el) => { if (el) statRefs.current[i] = el; }}
                  className="font-display text-5xl sm:text-6xl font-bold text-white tracking-tight"
                >
                  0
                </div>
                <div className="text-sm text-brand-muted mt-2">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US — image + accordion */}
      <section className="py-14 lg:py-20 bg-brand-bg">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-14 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="rounded-3xl overflow-hidden">
              <img src={visionHero} alt="Bharattech in action" className="w-full h-[480px] object-cover" />
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-4">Why Choose Us</p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight mb-8">
                Built on trust, driven by <span className="text-brand-secondary">results.</span>
              </h2>
              <div className="space-y-3">
                {accordion.map((item, i) => (
                  <button
                    key={item.title}
                    onClick={() => setOpenIdx(openIdx === i ? -1 : i)}
                    className="w-full text-left rounded-2xl border border-brand-border bg-white/[0.03] hover:border-brand-secondary/40 transition-colors overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-5 py-4">
                      <span className="text-sm font-semibold text-white">{item.title}</span>
                      <ChevronDown className={`h-4 w-4 text-brand-muted transition-transform ${openIdx === i ? "rotate-180 text-brand-secondary" : ""}`} />
                    </div>
                    {openIdx === i && (
                      <div className="px-5 pb-4 text-sm text-brand-muted leading-relaxed">{item.body}</div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-14 lg:py-20 bg-brand-bg2">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-4">Our Team</p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.05] tracking-tight">
                Meet the people behind the <span className="text-brand-secondary">innovation.</span>
              </h2>
            </div>
            <p className="text-base text-brand-muted max-w-md leading-relaxed">
              A diverse team of strategists, engineers and researchers — united by a passion for solving real-world problems with sovereign AI.
            </p>
          </div>
          <div ref={teamRef} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((m, i) => (
              <motion.div
                key={m.name}
                data-team-card
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="rounded-3xl overflow-hidden bg-white/[0.04] border border-brand-border"
              >
                <div className="aspect-[4/5] bg-gradient-to-br from-brand-primary/30 to-brand-primary/8 flex items-center justify-center">
                  <span className="font-display text-5xl font-bold text-brand-secondary/60">{m.name[0]}</span>
                </div>
                <div className="p-5">
                  <div className="text-sm font-semibold text-white">{m.name}</div>
                  <div className="text-xs text-brand-muted mt-1">{m.role}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-14 lg:py-20 bg-brand-bg">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-4">Our Values</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
              The principles that guide every decision.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div key={v.title} className="p-6 rounded-2xl bg-white/[0.04] border border-brand-border">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/15 flex items-center justify-center mb-5">
                  <v.icon className="h-5 w-5 text-brand-secondary" />
                </div>
                <h3 className="font-display text-base font-semibold text-white mb-2">{v.title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-14 lg:py-20 bg-brand-bg2">
        <div className="max-w-[1100px] mx-auto px-6">
          <div
            className="relative overflow-hidden rounded-[2rem] p-10 sm:p-14 lg:p-20"
            style={{
              background:
                "radial-gradient(120% 80% at 70% 30%, #6A58FF 0%, #4D31E8 40%, #040406 100%)",
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.22),transparent_55%)]" />
            <div className="relative z-10 max-w-2xl">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70 mb-5">Work With Us</p>
              <h2 className="font-display text-white font-bold tracking-tight leading-[1.1] text-[clamp(1.75rem,4.5vw,3.25rem)]">
                Ready to take your organization to the next level with sovereign AI?
              </h2>
              <p className="mt-6 text-base sm:text-lg text-white/80 leading-relaxed">
                With years of experience in AI development, infrastructure, and education — we empower organizations to adopt cutting-edge sovereign technology.
              </p>
              <Link
                ref={(el) => { if (el) ctaRefs.current[2] = el; }}
                to="/careers"
                className="inline-flex items-center gap-2 mt-10 h-12 px-7 rounded-full bg-white text-[#040406] text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Get a Free Consultation <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default About;
