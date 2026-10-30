import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";
import { useState } from "react";

export const ContactCTA = () => {
  const [email, setEmail] = useState("");

  return (
    <section className="relative overflow-hidden">
      {/* Deep violet gradient background matching hero */}
      <div
        className="relative isolate"
        style={{
          background:
            "radial-gradient(150% 100% at 50% 22%, #6A58FF 0%, #4D31E8 45%, #040406 100%)",
        }}
      >
        {/* Soft glow accents */}
        <div className="pointer-events-none absolute -top-24 right-10 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

        <div className="relative max-w-[1200px] mx-auto px-6 py-14 lg:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-white/10 backdrop-blur-sm border border-white/15 mb-8">
              <Mail className="h-4 w-4 text-white" />
            </div>

            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.05] tracking-tight">
              Let Your Work Speak For Itself.
              <br />
              We'll Handle The Words.
            </h2>

            <p className="mt-6 text-base sm:text-lg text-white/70 leading-relaxed max-w-xl">
              We're here to help you navigate your digital journey. Get in touch
              with us today to discuss how we can take your business to the next level.
            </p>

            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-10 flex items-stretch gap-2 max-w-xl rounded-md bg-white/10 backdrop-blur-sm border border-white/15 p-1.5"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter Your Mail.."
                className="flex-1 bg-transparent px-4 text-sm text-white placeholder:text-white/50 focus:outline-none"
              />
              <button
                type="submit"
                className="h-11 px-6 rounded-md bg-white text-foreground text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Sign Up
              </button>
              <button
                type="submit"
                aria-label="Submit"
                className="h-11 w-11 rounded-md bg-[#4D31E8] text-white flex items-center justify-center hover:opacity-85 transition-opacity"
              >
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactCTA;
