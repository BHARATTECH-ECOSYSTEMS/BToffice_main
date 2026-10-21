import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { GraduationCap, Bot, Server, ArrowUpRight } from "lucide-react";

const platforms = [
  {
    icon: GraduationCap,
    name: "Collegecue",
    tagline: "Student Lifecycle AI",
    description:
      "AI-powered platform transforming the student journey — from admissions and career guidance to skill development and placement.",
    features: ["AI Career Counselling", "Smart Admissions", "Skill Analytics", "Placement Engine"],
  },
  {
    icon: Bot,
    name: "Rivinity",
    tagline: "Multi-functional AI Suite",
    description:
      "Comprehensive AI suite delivering intelligent automation, content generation, and decision-making tools across industries.",
    features: ["AI Assistants", "Content Generation", "Process Automation", "Data Intelligence"],
  },
  {
    icon: Server,
    name: "RECAG",
    tagline: "GPU & AI Research Ecosystem",
    description:
      "Empowering researchers and developers with affordable GPU compute and collaborative AI research infrastructure.",
    features: ["GPU Marketplace", "Research Collaboration", "Low-cost Compute", "Model Training"],
  },
];

const PlatformsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="platforms" ref={ref} className="py-28 bg-card">
      <div className="max-w-7xl mx-auto px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16"
        >
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent mb-4">
            Our Ecosystem
          </p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Three platforms.{" "}
            <span className="text-gradient">One mission.</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {platforms.map((platform, i) => (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.12 }}
              className="group relative rounded-2xl border border-border bg-background p-8 hover:shadow-elevated transition-all duration-500"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:bg-accent/10 transition-colors">
                <platform.icon className="h-6 w-6 text-foreground group-hover:text-accent transition-colors" />
              </div>

              <h3 className="font-display text-xl font-bold text-foreground mb-1">
                {platform.name}
              </h3>
              <p className="text-xs uppercase tracking-wider text-accent font-medium mb-4">
                {platform.tagline}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                {platform.description}
              </p>

              <ul className="space-y-2.5 mb-8">
                {platform.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                    {f}
                  </li>
                ))}
              </ul>

              <button className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-accent transition-colors group/btn">
                Explore {platform.name}
                <ArrowUpRight className="h-4 w-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PlatformsSection;
