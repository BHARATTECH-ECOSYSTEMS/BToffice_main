import { motion } from "framer-motion";
import { MapPin, ArrowRight } from "lucide-react";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
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
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section id="careers" className="scroll-mt-28 py-24 lg:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl text-center mx-auto mb-16">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-6">Careers</p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.08] tracking-tight mb-6">
              Help us shape the <span className="text-accent">future</span>.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Developing safe and beneficial AI requires people from a diverse range of disciplines and backgrounds. Join our growing team.
            </p>
          </motion.div>

          {/* Image */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="rounded-2xl overflow-hidden mb-20">
            <img src={indiaLandscape} alt="Bharattech careers" className="w-full h-[280px] sm:h-[360px] lg:h-[440px] object-cover" loading="lazy" />
          </motion.div>

          {/* Openings */}
          <h2 className="font-display text-2xl font-bold text-foreground mb-8">Open Roles</h2>
          <div className="space-y-4">
            {openings.map((job, i) => (
              <motion.div
                key={job.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center justify-between p-6 rounded-xl border border-border bg-card hover:border-accent/40 transition-colors cursor-pointer"
              >
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-accent transition-colors">{job.title}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-muted-foreground">{job.team}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                    <span className="text-xs text-muted-foreground">•</span>
                    <span className="text-xs text-muted-foreground">{job.type}</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
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
