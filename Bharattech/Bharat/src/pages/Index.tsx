import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Sparkles, Cpu } from "lucide-react";
import { attachHoverLift, attachMagnetic } from "@/lib/animations";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";
import { BackgroundPaths } from "@/components/ui/background-paths";

import { LandingAccordionItem } from "@/components/ui/interactive-image-accordion";
import { FeatureCarousel } from "@/components/ui/feature-carousel";
import { BouncyCardsFeatures } from "@/components/ui/bounce-card-features";
import SkewCards from "@/components/ui/gradient-card-showcase";
import { ContactCTA } from "@/components/ui/contact-cta";
import { SubsidiariesSection } from "@/components/ui/subsidiaries-section";
import { OversizedHeadline } from "@/components/ui/oversized-headline";
import { StatsOrb } from "@/components/ui/stats-orb";
import { BentoShowcase } from "@/components/ui/bento-showcase";
import { PullQuote } from "@/components/ui/pull-quote";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";

const tierIcons = [Cpu, Sparkles];

const Index = () => {
  const tiersRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanups: (() => void)[] = [];
    if (tiersRef.current) {
      tiersRef.current.querySelectorAll<HTMLElement>("[data-tier-card]").forEach((el) => {
        cleanups.push(attachHoverLift(el, { lift: 6, scale: 1.015 }));
      });
    }
    if (ctaRef.current) {
      ctaRef.current.querySelectorAll<HTMLElement>("a").forEach((el) => {
        cleanups.push(attachHoverLift(el, { lift: 2, scale: 1.03 }));
        cleanups.push(attachMagnetic(el, { strength: 0.25 }));
      });
    }
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />

      {/* ─── HERO (blue gradient background) ─── */}
      <HeroGeometric
        badge="Bharattech"
        title1="Building the future"
        title2="of AI, for India."
      />

      {/* ─── PRODUCT TIERS ─── */}
      <section className="py-16 lg:py-20 bg-brand-bg2">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            {/* Left: Heading */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-6">01. India's AI Infrastructure</p>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight">
                A new way to{" "}
                <span className="text-brand-secondary">build</span> with the power of AI.
              </h2>
              <p className="mt-6 text-lg text-brand-muted leading-relaxed max-w-lg">
                Now it's easier than ever to access sovereign, affordable AI infrastructure — built in India, for India and the world.
              </p>
              <div ref={ctaRef} className="flex items-center gap-4 mt-10">
                <Link to="/employees#employee-access" className="inline-flex h-12 items-center px-8 rounded-full bg-white text-[#040406] text-sm font-semibold hover:bg-white/90 transition-colors">
                  Employee Login
                </Link>
                <Link to="/about" className="inline-flex h-12 items-center px-8 rounded-full border border-brand-border text-white text-sm font-medium hover:bg-white/10 transition-colors">
                  Learn more
                </Link>
              </div>
            </motion.div>

            {/* Right: Product tiers */}
            <motion.div ref={tiersRef} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.15 }} className="grid sm:grid-cols-2 gap-6 lg:pt-8">
              {[
                {
                  name: "BharatAI",
                  features: ["Sovereign LLM access", "Multi-language support", "Education-ready tools"],
                },
                {
                  name: "BharatAI+",
                  features: ["Unlimited GPU compute", "Enterprise integrations", "Custom model training"],
                },
              ].map((tier, i) => {
                const Icon = tierIcons[i];
                return (
                  <div
                    key={tier.name}
                    data-tier-card
                    className="rounded-2xl border border-brand-border bg-white/[0.03] p-6 flex flex-col"
                  >
                    <div className="h-10 w-10 rounded-xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mb-5">
                      <Icon className="h-5 w-5 text-brand-secondary" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-5">{tier.name}</h3>
                    <ul className="space-y-3 mb-6">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-brand-muted">
                          <svg className="h-4 w-4 text-brand-secondary flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5L13 4.5" /></svg>
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/platforms" className="mt-auto inline-flex items-center gap-2 text-xs uppercase tracking-wider text-brand-muted hover:text-white transition-colors font-medium">
                      <span className="w-5 h-5 rounded-full border border-brand-border flex items-center justify-center text-[10px]">+</span>
                      More Info
                    </Link>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── OVERSIZED SCROLLING HEADLINE ─── */}
      <OversizedHeadline
        eyebrow="Our Philosophy"
        text="even user focused value"
        description="As a tight-knit team of experts, we create memorable and emotional digital experiences, sovereign AI infrastructure, and native apps for India and beyond."
      />

      {/* ─── INTERACTIVE IMAGE ACCORDION (services) ─── */}
      <section className="py-20 lg:py-28">
        <LandingAccordionItem />
      </section>

      {/* ─── STATS + ORB ─── */}
      <StatsOrb />

      {/* ─── SUBSIDIARIES (Collegecue, Rivinity, RECAG) ─── */}
      <SubsidiariesSection />

      {/* ─── BENTO PRODUCT SHOWCASE (dark) ─── */}
      <BentoShowcase />

      {/* ─── FEATURE CAROUSEL ─── */}
      <section className="py-20 lg:py-28">
        <FeatureCarousel />
      </section>

      {/* ─── BOUNCY CARDS FEATURES ─── */}
      <section className="py-20 lg:py-28">
        <BouncyCardsFeatures />
      </section>

      {/* ─── GRADIENT CARD SHOWCASE ─── */}
      <section className="py-20 lg:py-28">
        <SkewCards />
      </section>

      {/* ─── PULL QUOTE / TESTIMONIAL ─── */}
      <PullQuote />

      {/* ─── CONTACT CTA ─── */}
      <ContactCTA />

      {/* ─── CTA BANNER ─── */}
      <BackgroundPaths title="Join Us Today" />

      <Footer />
    </div>
  );
};

export default Index;
