import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { attachHoverLift } from "@/lib/animations";
import indiaLandscape from "@/assets/india-landscape.jpg";

const openings = [
  { title: "Senior ML Engineer", team: "Research", location: "Bangalore, India", type: "Full-time" },
  { title: "Full Stack Developer", team: "Platform", location: "Remote, India", type: "Full-time" },
  { title: "AI Safety Researcher", team: "Safety", location: "Delhi, India", type: "Full-time" },
  { title: "Product Designer", team: "Design", location: "Bangalore, India", type: "Full-time" },
  { title: "DevOps Engineer", team: "Infrastructure", location: "Remote, India", type: "Full-time" },
  { title: "NLP Research Intern", team: "Research", location: "Hyderabad, India", type: "Internship" },
];

const Careers = () => {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!listRef.current) return;
    const rows = listRef.current.querySelectorAll<HTMLElement>("[data-job-row]");
    const cleanups = Array.from(rows).map((el) => attachHoverLift(el, { lift: 4, scale: 1.008 }));
    return () => cleanups.forEach((c) => c());
  }, []);

  return (
    <div className="min-h-screen bg-brand-bg">
      <Navbar />

      <section id="careers" className="relative scroll-mt-28 py-14 lg:py-20 overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 h-[400px] -z-0"
          style={{ background: "linear-gradient(180deg, rgba(77,49,232,0.18) 0%, rgba(77,49,232,0.05) 50%, transparent 100%)" }}
        />
        <div className="relative max-w-[1200px] mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl text-center mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.2em] text-brand-muted mb-6">Careers</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-6">
              Help us shape the <span className="text-brand-secondary">future</span>.
            </h1>
            <p className="text-lg text-brand-muted leading-relaxed">
              Developing safe and beneficial AI requires people from a diverse range of disciplines and backgrounds. Join our growing team.
            </p>
          </motion.div>

          {/* Image */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="rounded-2xl overflow-hidden mb-16 border border-brand-border">
            <img src={indiaLandscape} alt="Bharattech careers" className="w-full h-[280px] sm:h-[360px] lg:h-[440px] object-cover" loading="lazy" />
          </motion.div>

          {/* Openings */}
          <h2 className="font-display text-2xl font-bold text-white mb-8">Open Roles</h2>
          <div ref={listRef} className="space-y-4">
            {openings.map((job, i) => (
              <motion.div
                key={job.title}
                data-job-row
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center justify-between p-6 rounded-xl border border-brand-border bg-white/[0.03] hover:border-brand-secondary/40 transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="font-display text-lg font-semibold text-white group-hover:text-brand-secondary transition-colors">{job.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-brand-muted">{job.team}</span>
                    <span className="text-xs text-brand-muted">•</span>
                    <span className="text-xs text-brand-muted inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                    <span className="text-xs text-brand-muted">•</span>
                    <span className="text-xs text-brand-muted">{job.type}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-brand-muted group-hover:text-brand-secondary transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Careers;
