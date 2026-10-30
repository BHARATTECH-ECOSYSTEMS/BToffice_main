import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import hero3d from "@/assets/hero-3d.jpg";

const tiers = [
  {
    name: "BharatAI",
    features: ["Sovereign LLM access", "Multi-language support", "Education-ready tools"],
  },
  {
    name: "BharatAI+",
    features: ["Unlimited GPU compute", "Enterprise integrations", "Custom model training"],
  },
];

const HeroSection = () => {
  return (
    <section className="relative bg-card pt-8 pb-0 overflow-hidden">
      <div className="max-w-7xl mx-auto px-8">
        {/* Top content area */}
        <div className="grid lg:grid-cols-2 gap-8 items-start pt-12 pb-16">
          {/* Left — Headline */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground mb-6">
              01. India's AI Infrastructure
            </p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.5rem] xl:text-[5.5rem] font-800 leading-[0.95] tracking-tight text-foreground">
              A new way to{" "}
              <span className="text-gradient">build</span> with the
              power of AI.
            </h1>
            <p className="mt-8 text-base text-muted-foreground max-w-md leading-relaxed">
              Now it's easier than ever to access sovereign, affordable AI
              infrastructure — built in India, for India and the world.
            </p>

            <div className="flex items-center gap-4 mt-10">
              <Link to="/employees#employee-access" className="inline-flex h-12 items-center px-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
                Employee Login
              </Link>
              <Link to="/about" className="inline-flex h-12 items-center px-8 rounded-full border border-border text-foreground text-sm font-semibold hover:bg-secondary transition-colors">
                Learn more
              </Link>
            </div>
          </motion.div>

          {/* Right — Feature tiers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid sm:grid-cols-2 gap-8 lg:pt-16"
          >
            {tiers.map((tier) => (
              <div key={tier.name}>
                <h3 className="font-display text-base font-semibold text-foreground mb-4">
                  {tier.name}
                </h3>
                <ul className="space-y-3">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/platforms" className="flex items-center gap-2 mt-5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                  <span className="w-8 h-8 rounded-full border border-border flex items-center justify-center group-hover:bg-secondary transition-colors">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                  MORE INFO
                </Link>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Hero 3D Image */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="relative rounded-t-3xl overflow-hidden"
        >
          <img
            src={hero3d}
            alt="Bharattech AI Infrastructure visualization"
            className="w-full h-[340px] sm:h-[420px] lg:h-[500px] object-cover"
            width={1400}
            height={800}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card/60 via-transparent to-transparent" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
