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
    gradient: "from-accent/20 to-accent/5",
  },
  {
    title: "Affordable GPU Compute",
    icon: Zap,
    desc: "Access enterprise-grade GPU infrastructure at a fraction of the cost.",
    span: "col-span-1",
    gradient: "from-primary/10 to-muted",
  },
  {
    title: "Multi-language Support",
    icon: Globe,
    desc: "Support for 22+ Indian languages out of the box with high accuracy NLP.",
    span: "col-span-1",
    gradient: "from-accent/15 to-muted",
  },
  {
    title: "Enterprise Security",
    icon: Shield,
    desc: "Bank-grade security with SOC 2, HIPAA, and GDPR compliance built in.",
    span: "col-span-1",
    gradient: "from-primary/10 to-accent/5",
  },
];

interface BounceCardProps {
  className?: string;
  children: React.ReactNode;
}

const BounceCard = ({ className, children }: BounceCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 0.97, rotate: "-1deg" }}
      className={cn(
        "group relative min-h-[250px] cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-8",
        className
      )}
    >
      {children}
    </motion.div>
  );
};

export const BouncyCardsFeatures = () => {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid lg:grid-cols-4 gap-6 mb-12">
          <div className="lg:col-span-2 flex flex-col justify-center">
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
              Grow faster with our{" "}
              <span className="text-accent">all-in-one</span> solution
            </h2>
            <a
              href="#"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Learn more →
            </a>
          </div>

          {features.slice(0, 2).map((f) => (
            <BounceCard key={f.title}>
              <f.icon className="h-8 w-8 text-accent mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
              <div
                className={cn(
                  "absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl bg-gradient-to-br p-4 transition-transform duration-300 group-hover:translate-y-4 group-hover:rotate-[2deg]",
                  f.gradient
                )}
              />
            </BounceCard>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {features.slice(2).map((f) => (
            <BounceCard key={f.title}>
              <f.icon className="h-8 w-8 text-accent mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {f.desc}
              </p>
              <div
                className={cn(
                  "absolute bottom-0 left-4 right-4 top-32 translate-y-8 rounded-t-2xl bg-gradient-to-br p-4 transition-transform duration-300 group-hover:translate-y-4 group-hover:rotate-[2deg]",
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
