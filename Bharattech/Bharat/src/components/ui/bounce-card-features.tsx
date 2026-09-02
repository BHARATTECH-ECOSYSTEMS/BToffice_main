import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Cpu, Zap, Globe, Shield } from "lucide-react";

const features = [
  {
    title: "Sovereign AI Models",
    icon: Cpu,
    desc: "Locally trained, multilingual large language models built for Indian languages and contexts.",
    span: "col-span-1",
    gradient: "from-[#4D31E8]/20 to-[#4D31E8]/5",
  },
  {
    title: "Affordable GPU Compute",
    icon: Zap,
    desc: "Access enterprise-grade GPU infrastructure at a fraction of the cost.",
    span: "col-span-1",
    gradient: "from-[#6A58FF]/15 to-white/5",
  },
  {
    title: "Multi-language Support",
    icon: Globe,
    desc: "Support for 22+ Indian languages out of the box with high accuracy NLP.",
    span: "col-span-1",
    gradient: "from-[#8F7BFF]/15 to-white/5",
  },
  {
    title: "Enterprise Security",
    icon: Shield,
    desc: "Bank-grade security with SOC 2, HIPAA, and GDPR compliance built in.",
    span: "col-span-1",
    gradient: "from-[#6A58FF]/10 to-[#4D31E8]/5",
  },
];

interface BounceCardProps {
  className?: string;
  children: React.ReactNode;
}

const BounceCard = ({ className, children }: BounceCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "group relative min-h-[250px] cursor-pointer overflow-hidden rounded-2xl border border-brand-border bg-white/[0.03] p-8",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const BouncyCardsFeatures = () => {
  return (
    <section className="py-16 bg-brand-bg">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-6 mb-12">
          <div className="lg:col-span-2 flex flex-col justify-center">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-4">
              Grow faster with our{" "}
              <span className="text-brand-secondary">all-in-one</span> solution
            </h2>
            <a
              href="#"
              className="text-sm font-medium text-brand-muted hover:text-white transition-colors"
            >
              Learn more →
            </a>
          </div>

          {features.slice(0, 2).map((f) => (
            <BounceCard key={f.title}>
              <f.icon className="h-8 w-8 text-brand-secondary mb-4" />
              <h3 className="font-display text-lg font-semibold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-brand-muted leading-relaxed">
                {f.desc}
              </p>
              <div
                className={cn(
                  "absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl bg-gradient-to-br p-4 transition-transform duration-300 group-hover:translate-y-4",
                  f.gradient
                )}
              />
            </BounceCard>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.slice(2).map((f) => (
            <BounceCard key={f.title}>
              <f.icon className="h-8 w-8 text-brand-secondary mb-4" />
              <h3 className="font-display text-lg font-semibold text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-brand-muted leading-relaxed">
                {f.desc}
              </p>
              <div
                className={cn(
                  "absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl bg-gradient-to-br p-4 transition-transform duration-300 group-hover:translate-y-4",
                  f.gradient
                )}
              />
            </BounceCard>
          ))}
        </div>
      </div>
    </section>
  );
};
