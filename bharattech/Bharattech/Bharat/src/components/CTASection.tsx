import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ctaImage from "@/assets/cta-3d.jpg";

const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="careers" ref={ref} className="py-28 bg-card">
      <div className="max-w-7xl mx-auto px-8">
        <div className="relative rounded-3xl overflow-hidden bg-primary">
          <div className="absolute inset-0 opacity-20">
            <img src={ctaImage} alt="" className="w-full h-full object-cover" loading="lazy" width={1200} height={800} />
          </div>
          <div className="relative z-10 py-20 px-8 sm:px-16 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
                Let's build the future{" "}
                <br className="hidden sm:block" />
                together.
              </h2>
              <p className="text-primary-foreground/70 text-base max-w-lg mx-auto mb-10 leading-relaxed">
                Whether you're a developer, researcher, student, or enterprise leader —
                there's a place for you in the Bharattech ecosystem.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/careers" className="h-12 px-8 rounded-full bg-card text-foreground text-sm font-semibold hover:bg-card/90 transition-colors inline-flex items-center gap-2 group">
                  Join Our Team
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/about" className="h-12 px-8 rounded-full border border-primary-foreground/30 text-primary-foreground text-sm font-semibold hover:bg-primary-foreground/10 transition-colors inline-flex items-center">
                  Partner With Us
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
