"use client";

import { motion } from "framer-motion";

/**
 * PullQuote
 * Large minimalist testimonial block (awsmd-inspired).
 */
export function PullQuote({
  quote = "Bharattech is a hands-on team who took care of every detail. They focus on the user and help improve retention. They've committed to AI development methods, and they look into user data and user behavior when building features. They excel in user experience and data-driven thinking.",
  author = "M • LTD",
  role = "Partner",
}: {
  quote?: string;
  author?: string;
  role?: string;
}) {
  return (
    <section className="py-16 lg:py-20 bg-brand-bg2">
      <div className="max-w-[1100px] mx-auto px-6">
        <div className="grid md:grid-cols-[1fr_3fr] gap-10 items-start">
          <span className="font-display text-7xl text-brand-glow leading-none">"</span>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <blockquote className="font-display text-2xl sm:text-3xl lg:text-4xl font-medium text-white leading-[1.3] tracking-tight">
              {quote}
            </blockquote>
            <div className="mt-10 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center text-white font-display font-bold">
                {author.charAt(0)}
              </div>
              <div>
                <div className="font-display font-semibold text-white">{author}</div>
                <div className="text-sm text-brand-muted">{role}</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default PullQuote;
