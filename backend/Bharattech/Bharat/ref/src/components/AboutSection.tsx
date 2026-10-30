import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import aboutImage from "@/assets/about-3d.jpg";

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="about" ref={ref} className="py-28 bg-background">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-3xl overflow-hidden shadow-elevated">
              <img
                src={aboutImage}
                alt="AI Infrastructure Network"
                className="w-full h-[400px] object-cover"
                loading="lazy"
                width={1200}
                height={800}
              />
            </div>
          </motion.div>

          {/* Right — Content */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent mb-4">
              About Bharattech
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-6">
              Foundational AI{" "}
              <span className="text-gradient">infrastructure</span>{" "}
              for a billion people.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Bharattech integrates a proprietary Large Language Model with a distributed
              GPU compute network — enabling affordable, scalable, and privacy-first AI
              solutions across education, research, and enterprise use cases.
            </p>
            <p className="text-muted-foreground leading-relaxed mb-8">
              Built on a nation-first, sovereign technology approach, we are committed
              to reducing dependency on external AI systems and creating an integrated
              ecosystem that makes advanced technology accessible to the broader population.
            </p>

            <div className="grid grid-cols-2 gap-6">
              {[
                { num: "100%", label: "Sovereign Technology" },
                { num: "80%", label: "Lower Compute Costs" },
                { num: "22+", label: "Indian Languages" },
                { num: "24/7", label: "Enterprise Support" },
              ].map((item) => (
                <div key={item.label}>
                  <div className="font-display text-2xl font-bold text-foreground">{item.num}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
