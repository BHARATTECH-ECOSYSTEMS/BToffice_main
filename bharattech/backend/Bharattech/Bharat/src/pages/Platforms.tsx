import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Layers, GraduationCap, Sparkles, Database } from "lucide-react";
import { Link } from "react-router-dom";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { attachHoverLift, attachTilt } from "@/lib/animations";

const platforms = [
  {
    icon: GraduationCap,
    name: "Collegecue",
    description: "AI-powered education platform connecting students with personalized learning paths, mentors, and career guidance across India.",
    features: ["Smart Course Matching", "AI Tutoring", "Career Analytics"],
  },
  {
    icon: Sparkles,
    name: "Rivinity",
    description: "Enterprise AI suite delivering cutting-edge language models, automation tools, and analytics for businesses of all sizes.",
    features: ["Custom LLMs", "Workflow Automation", "Business Intelligence"],
  },
  {
    icon: Database,
    name: "RECAG",
    description: "Retrieval-Enhanced Conversational AI Gateway — our infrastructure backbone for building production-grade AI applications.",
    features: ["RAG Pipeline", "Vector Search", "Real-time Inference"],
  },
  {
    icon: Layers,
    name: "BharatAI",
    description: "Sovereign AI compute platform offering affordable GPU access, model hosting, and MLOps tools for the Indian developer ecosystem.",
    features: ["GPU Marketplace", "Model Hub", "One-Click Deploy"],
  },
];

const Platforms = () => {
  const getPlatformId = (name: string) => name.toLowerCase();
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-platform-card]");
    const cleanups = Array.from(cards).flatMap((el) => [
      attachHoverLift(el, { lift: 5, scale: 1.012 }),
      attachTilt(el, { max: 4 }),
    ]);
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />

      <section id="platforms" className="relative scroll-mt-28 py-14 lg:py-20 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-[500px] -z-0"
          style={{
            background: "linear-gradient(180deg, rgba(77,49,232,0.20) 0%, rgba(77,49,232,0.06) 50%, transparent 100%)",
          }}
        />
        <div className="relative max-w-[1200px] mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-6">Platforms</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-6">
              Our <span className="text-brand-secondary">ecosystem</span> of products.
            </h1>
            <p className="text-lg text-brand-muted leading-relaxed">
              A comprehensive suite of AI-powered platforms designed to serve education, enterprise, and infrastructure needs across India.
            </p>
          </motion.div>

          <div ref={gridRef} className="grid md:grid-cols-2 gap-8">
            {platforms.map((p, i) => (
              <motion.div
                key={p.name}
                data-platform-card
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                id={getPlatformId(p.name)}
                className="group scroll-mt-28 p-8 rounded-2xl border border-brand-border bg-white/[0.03] hover:border-brand-secondary/40 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center mb-5">
                  <p.icon className="h-5 w-5 text-brand-secondary" />
                </div>
                <h3 className="font-display text-2xl font-bold text-white mb-3">{p.name}</h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-6">{p.description}</p>
                <ul className="space-y-2 mb-6">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-brand-muted">
                      <svg className="h-4 w-4 text-brand-secondary flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8.5l3.5 3.5L13 4.5" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={`/platforms#${getPlatformId(p.name)}`} className="text-sm font-medium text-white hover:text-brand-secondary transition-colors inline-flex items-center gap-1.5">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Platforms;
