import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const stats = [
  { prefix: "+", value: "300", label: "AI Models Trained" },
  { prefix: "", value: "1B+", label: "Population Served" },
  { prefix: "+", value: "50", label: "Research Partners" },
  { prefix: "", value: "3", label: "Platforms Launched" },
];

const StatsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-20 bg-card border-t border-border/40">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-16">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center lg:text-left"
            >
              <div className="font-display text-5xl lg:text-6xl font-bold text-foreground tracking-tight">
                <span className="text-accent">{stat.prefix}</span>
                {stat.value}
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
