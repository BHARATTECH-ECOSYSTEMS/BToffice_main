import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Check } from "lucide-react";

const features = [
  { title: "Privacy-First Architecture", desc: "All data stays within India's borders with sovereign data policies." },
  { title: "Affordable AI Compute", desc: "Distributed GPU network — up to 80% cheaper than global alternatives." },
  { title: "India-Optimized LLM", desc: "Understands India's languages, culture, and business context natively." },
  { title: "End-to-End Ecosystem", desc: "From student tools to enterprise AI — one integrated stack." },
  { title: "Open Research", desc: "Empowering India's brightest with open tools and communities." },
  { title: "Enterprise-Grade Security", desc: "Multi-layer security, compliance-ready infrastructure." },
];

const left = features.slice(0, 3);
const right = features.slice(3);

const WhySection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="research" ref={ref} className="py-28 bg-background">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent mb-4">
            Why Bharattech
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Advantages that make a{" "}
            <span className="text-gradient">real difference</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-x-12 gap-y-6 max-w-4xl mx-auto">
          {[left, right].map((col, colIdx) => (
            <div key={colIdx} className="space-y-5">
              {col.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 15 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 0.15 + (colIdx * 3 + i) * 0.07 }}
                  className="flex gap-4 p-5 rounded-xl border border-border bg-card hover:shadow-soft transition-shadow"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-accent" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-0.5">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhySection;
