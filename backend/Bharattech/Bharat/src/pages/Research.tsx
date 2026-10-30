import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Brain, Shield, Cpu, FileText, Layers, Globe, Lightbulb, BookOpen } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import StickyTabs from "@/components/ui/sticky-section-tabs";
import { ResearchHero } from "@/components/ui/research-hero";
import { attachHoverLift, attachTilt } from "@/lib/animations";

const ResearchSection = ({ icon: Icon, title, description, papers }: {
  icon: React.ElementType;
  title: string;
  description: string;
  papers: { title: string; summary: string }[];
}) => {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!gridRef.current) return;
    const cards = gridRef.current.querySelectorAll<HTMLElement>("[data-paper-card]");
    const cleanups = Array.from(cards).flatMap((el) => [
      attachHoverLift(el, { lift: 4, scale: 1.01 }),
      attachTilt(el, { max: 3 }),
    ]);
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-start gap-4 mb-8">
        <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-brand-secondary" />
        </div>
        <div>
          <h3 className="font-display text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-brand-muted leading-relaxed max-w-2xl">{description}</p>
        </div>
      </div>
      <div ref={gridRef} className="grid md:grid-cols-2 gap-6">
        {papers.map((p) => (
          <div key={p.title} data-paper-card className="p-6 rounded-2xl border border-brand-border bg-white/[0.03] hover:border-brand-secondary/40 transition-colors cursor-pointer group">
            <h4 className="font-display text-lg font-semibold text-white mb-2 group-hover:text-brand-secondary transition-colors">{p.title}</h4>
            <p className="text-sm text-brand-muted leading-relaxed">{p.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const Research = () => {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />

      <div id="research" className="scroll-mt-28" />

      {/* Hero */}
      <ResearchHero
        eyebrow="Research"
        title1="Powering Sovereign"
        title2="AI Research"
        tagline={["Innovation.", "Implementation.", "Impact."]}
      />

      {/* Sticky Tabs Research Sections */}
      <section id="documentation" className="scroll-mt-28">
        <div id="blog" className="scroll-mt-28">
          <StickyTabs>
            <StickyTabs.Item title="Multilingual AI" id="multilingual">
              <ResearchSection
                icon={Globe}
                title="Multilingual LLMs for Indic Languages"
                description="Building language models that understand 22+ Indian languages with native fluency, enabling AI access for over a billion people."
                papers={[
                  { title: "BharatLM: A Foundation Model for Indic Languages", summary: "A comprehensive study on training large language models across 22 official Indian languages with state-of-the-art performance." },
                  { title: "Cross-Lingual Transfer in Low-Resource Settings", summary: "Novel techniques for transferring knowledge between high-resource and low-resource Indic language pairs." },
                  { title: "Multilingual Code-Switching Detection", summary: "Handling natural code-switching patterns common in Indian multilingual communication contexts." },
                  { title: "Indic Script Tokenization", summary: "Efficient tokenization strategies for Devanagari, Tamil, Telugu, and other Indic scripts." },
                ]}
              />
            </StickyTabs.Item>

            <StickyTabs.Item title="AI Safety" id="safety">
              <ResearchSection
                icon={Shield}
                title="AI Safety & Alignment Framework"
                description="Our approach to building safe AI systems with robust alignment techniques tailored for diverse cultural contexts."
                papers={[
                  { title: "Cultural Alignment in AI Systems", summary: "Addressing bias and alignment challenges unique to India's diverse cultural landscape." },
                  { title: "Robust Safety Guardrails for Multilingual Models", summary: "Implementing content safety measures that work across multiple languages and cultural contexts." },
                  { title: "Red-Teaming Sovereign AI", summary: "Comprehensive adversarial testing frameworks for nationally deployed AI infrastructure." },
                  { title: "Interpretability in Large-Scale Indic Models", summary: "Making model decisions transparent and explainable for regulatory compliance." },
                ]}
              />
            </StickyTabs.Item>

            <StickyTabs.Item title="Infrastructure" id="infrastructure">
              <ResearchSection
                icon={Cpu}
                title="Efficient GPU Compute for Emerging Markets"
                description="Novel architecture for reducing inference costs by 60% while maintaining model performance at scale."
                papers={[
                  { title: "Cost-Efficient Inference at Scale", summary: "Reducing GPU compute costs through innovative batching and quantization strategies." },
                  { title: "Edge AI for Rural Connectivity", summary: "Deploying lightweight models on edge devices for areas with limited internet access." },
                  { title: "Distributed Training on Heterogeneous Hardware", summary: "Maximizing training throughput across mixed GPU clusters common in emerging markets." },
                  { title: "Green AI: Sustainable Compute Practices", summary: "Minimizing the carbon footprint of large-scale AI training in tropical climates." },
                ]}
              />
            </StickyTabs.Item>

            <StickyTabs.Item title="Sovereign AI" id="sovereign">
              <ResearchSection
                icon={Layers}
                title="Sovereign AI Infrastructure Blueprint"
                description="A whitepaper on building nation-scale AI infrastructure that respects data sovereignty and privacy regulations."
                papers={[
                  { title: "Data Sovereignty Framework for AI", summary: "Legal and technical frameworks for keeping Indian data within national boundaries." },
                  { title: "Privacy-Preserving Federated Learning", summary: "Training models across institutions without sharing sensitive data." },
                  { title: "National AI Compute Grid", summary: "Architecture for a distributed national compute grid connecting universities and research labs." },
                  { title: "Open-Source AI for Digital Public Infrastructure", summary: "Building open AI components for India's digital public goods ecosystem." },
                ]}
              />
            </StickyTabs.Item>
          </StickyTabs>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Research;
