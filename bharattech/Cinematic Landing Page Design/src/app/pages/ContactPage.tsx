import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, MapPin, MessageSquare, Users, FlaskConical, Send } from 'lucide-react';

const reasons = [
  { icon: MessageSquare, label: 'General Enquiry', value: 'general' },
  { icon: FlaskConical, label: 'Research Collaboration', value: 'research' },
  { icon: Users, label: 'Partnership', value: 'partnership' },
  { icon: Mail, label: 'Press & Media', value: 'press' },
];

export const ContactPage = () => {
  const [selected, setSelected] = useState('general');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-white" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>

      {/* ─── Hero ─── */}
      <section className="relative pt-28 pb-16 px-8 lg:px-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,rgba(106,53,255,0.07),transparent_70%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-5"
          >
            Contact
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl lg:text-6xl font-semibold tracking-tight text-[#09090B] leading-tight mb-6"
          >
            Let's start a conversation
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-[17px] text-[#52525B] leading-relaxed"
          >
            Whether you are a researcher, developer, enterprise, or just curious about what we are building — we would love to hear from you.
          </motion.p>
        </div>
      </section>

      {/* ─── Contact Form ─── */}
      <section className="py-16 px-8 lg:px-16">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-12">

          {/* Left: Info */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-semibold text-[#09090B] mb-6 tracking-tight">Get in touch</h2>

              <div className="flex flex-col gap-5">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDE9FF] flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-[#6A35FF]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#09090B] mb-0.5">Email</p>
                    <a href="mailto:hello@bharattechorigin.com" className="text-[14px] text-[#6A35FF] hover:underline">
                      hello@bharattechorigin.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#EDE9FF] flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-[#6A35FF]" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#09090B] mb-0.5">Location</p>
                    <p className="text-[14px] text-[#71717A]">India · Remote-first globally</p>
                  </div>
                </div>
              </div>

              <div className="mt-10 p-6 bg-[#FAFAFA] rounded-2xl border border-[#E4E4E7]">
                <p className="text-[13px] font-semibold text-[#09090B] mb-2">Research collaborations</p>
                <p className="text-[13px] text-[#71717A] leading-relaxed">
                  We actively collaborate with universities, research institutions, and independent researchers. If you are working in AI infrastructure, memory systems, or any of our six research domains — let us know.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right: Form */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:col-span-3"
          >
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="h-full flex flex-col items-center justify-center text-center py-20 gap-5"
              >
                <div className="w-16 h-16 rounded-full bg-[#EDE9FF] flex items-center justify-center">
                  <Send size={24} className="text-[#6A35FF]" />
                </div>
                <h3 className="text-2xl font-semibold text-[#09090B]">Message sent</h3>
                <p className="text-[15px] text-[#71717A] max-w-sm">
                  Thank you for reaching out. We will get back to you within 2 business days.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-[#6A35FF] text-sm font-medium hover:underline"
                >
                  Send another message
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Reason for contact */}
                <div>
                  <label className="block text-[13px] font-semibold text-[#09090B] mb-3">
                    Reason for contact
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {reasons.map(r => {
                      const Icon = r.icon;
                      return (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setSelected(r.value)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left text-sm font-medium transition-all duration-150 ${
                            selected === r.value
                              ? 'border-[#6A35FF] bg-[#EDE9FF] text-[#6A35FF]'
                              : 'border-[#E4E4E7] text-[#3F3F46] hover:border-[#6A35FF]/30 bg-white'
                          }`}
                        >
                          <Icon size={15} />
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#09090B] mb-2">First name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[#E4E4E7] text-[14px] outline-none focus:border-[#6A35FF]/50 focus:ring-2 focus:ring-[#6A35FF]/10 bg-white"
                      placeholder="Ada"
                    />
                  </div>
                  <div>
                    <label className="block text-[13px] font-semibold text-[#09090B] mb-2">Last name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[#E4E4E7] text-[14px] outline-none focus:border-[#6A35FF]/50 focus:ring-2 focus:ring-[#6A35FF]/10 bg-white"
                      placeholder="Lovelace"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#09090B] mb-2">Email address</label>
                  <input
                    type="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-[#E4E4E7] text-[14px] outline-none focus:border-[#6A35FF]/50 focus:ring-2 focus:ring-[#6A35FF]/10 bg-white"
                    placeholder="you@organization.com"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#09090B] mb-2">Organization <span className="text-[#A1A1AA] font-normal">(optional)</span></label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 rounded-xl border border-[#E4E4E7] text-[14px] outline-none focus:border-[#6A35FF]/50 focus:ring-2 focus:ring-[#6A35FF]/10 bg-white"
                    placeholder="Your institution or company"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#09090B] mb-2">Message</label>
                  <textarea
                    required
                    rows={5}
                    className="w-full px-4 py-3 rounded-xl border border-[#E4E4E7] text-[14px] outline-none focus:border-[#6A35FF]/50 focus:ring-2 focus:ring-[#6A35FF]/10 bg-white resize-none"
                    placeholder="Tell us what you are working on, what you are interested in, or how we can help..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-[#6A35FF] text-white rounded-xl font-semibold text-[15px] hover:bg-[#7C3AED] transition-colors shadow-[0_4px_20px_rgba(106,53,255,0.3)] flex items-center justify-center gap-2"
                >
                  <Send size={16} />
                  Send message
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
};
