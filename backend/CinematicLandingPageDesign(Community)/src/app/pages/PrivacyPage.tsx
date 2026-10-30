import React from 'react';
import { motion } from 'motion/react';

const sections = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide directly to us, such as when you contact us through our website, subscribe to updates, or apply for a position at Bharattech Origin. This may include your name, email address, organization, and the content of your communications. We also collect limited technical information automatically when you visit our website, including IP address, browser type, and pages visited, solely for security and analytics purposes.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `We use the information we collect to respond to your enquiries, process applications, send requested updates and communications, improve our website and services, and comply with legal obligations. We do not use personal information to train AI models or for any purpose beyond what is described in this policy.`,
  },
  {
    title: '3. Information Sharing',
    content: `We do not sell, rent, or share your personal information with third parties for their marketing purposes. We may share information with trusted service providers who assist us in operating our website and conducting our business, provided they agree to keep this information confidential. We may disclose information where required by law or to protect the rights, property, or safety of Bharattech Origin, our users, or the public.`,
  },
  {
    title: '4. Data Security',
    content: `We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure. We strive to use commercially acceptable means to protect your information but cannot guarantee its absolute security.`,
  },
  {
    title: '5. Data Retention',
    content: `We retain personal information for as long as necessary to fulfill the purposes for which it was collected, including for legal, accounting, or reporting requirements. When information is no longer needed, we securely delete or anonymize it.`,
  },
  {
    title: '6. Your Rights',
    content: `You have the right to access, correct, or delete your personal information. You may also object to or restrict certain processing of your information. To exercise these rights, please contact us at privacy@bharattechorigin.com. We will respond to your request within 30 days.`,
  },
  {
    title: '7. Cookies',
    content: `Our website uses minimal cookies necessary for basic functionality and security. We do not use cookies for advertising or cross-site tracking. You may configure your browser to refuse cookies, though some features of the website may not function as intended.`,
  },
  {
    title: '8. Third-Party Links',
    content: `Our website may contain links to third-party websites. We are not responsible for the privacy practices of those sites and encourage you to review their privacy policies before providing any personal information.`,
  },
  {
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated effective date. Your continued use of our website after any changes constitutes your acceptance of the revised policy.`,
  },
  {
    title: '10. Contact Us',
    content: `If you have any questions about this Privacy Policy, please contact us at privacy@bharattechorigin.com or write to us at Bharattech Origin, India.`,
  },
];

export const PrivacyPage = () => (
  <div className="bg-white" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>
    <section className="pt-28 pb-20 px-8 lg:px-16">
      <div className="max-w-3xl mx-auto">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-4"
        >
          Legal
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl lg:text-5xl font-semibold text-[#09090B] tracking-tight mb-4"
        >
          Privacy Policy
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-[14px] text-[#A1A1AA] mb-12"
        >
          Effective date: June 2026 · Last updated: June 2026
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-[16px] text-[#52525B] leading-relaxed mb-12 pb-12 border-b border-[#F4F4F5]"
        >
          Bharattech Origin ("we", "our", or "us") is committed to protecting your privacy. This policy explains how we collect, use, and safeguard information when you visit our website or interact with our organization.
        </motion.p>

        <div className="flex flex-col gap-10">
          {sections.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.5 }}
            >
              <h2 className="text-[18px] font-semibold text-[#09090B] mb-3">{s.title}</h2>
              <p className="text-[15px] text-[#52525B] leading-relaxed">{s.content}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  </div>
);
