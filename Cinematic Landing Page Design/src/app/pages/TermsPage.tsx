import React from 'react';
import { motion } from 'motion/react';

const sections = [
  {
    title: '1. Acceptance of Terms',
    content: `By accessing or using the Bharattech Origin website (bharattechorigin.com), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our website. These terms apply to all visitors, users, and others who access or use the site.`,
  },
  {
    title: '2. Intellectual Property',
    content: `All content on this website — including text, graphics, logos, images, research materials, and software — is the property of Bharattech Origin and is protected by applicable intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content without prior written permission from Bharattech Origin.`,
  },
  {
    title: '3. Use of the Website',
    content: `You agree to use this website only for lawful purposes and in a manner that does not infringe the rights of others. You may not use the site to transmit any harmful, offensive, or unauthorized content; attempt to gain unauthorized access to any system; interfere with the operation of the website; or scrape or harvest information without our consent.`,
  },
  {
    title: '4. Research & Information',
    content: `Research information, technical descriptions, and capability statements on this website are provided for informational purposes only. They represent ongoing research initiatives and should not be interpreted as representations of currently available commercial products or services unless explicitly stated. Bharattech Origin reserves the right to modify, discontinue, or evolve any described research area.`,
  },
  {
    title: '5. Disclaimer of Warranties',
    content: `The website and its content are provided on an "as is" and "as available" basis without warranties of any kind, either express or implied. Bharattech Origin does not warrant that the website will be uninterrupted, error-free, or free of viruses or other harmful components. Your use of the website is at your sole risk.`,
  },
  {
    title: '6. Limitation of Liability',
    content: `To the maximum extent permitted by law, Bharattech Origin shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use this website or its content. Our total liability to you for any claims arising from these terms shall not exceed the amount you have paid to us, if any, in the twelve months preceding the claim.`,
  },
  {
    title: '7. Links to Third-Party Websites',
    content: `Our website may contain links to third-party websites for your convenience. We have no control over the content or practices of those sites and accept no responsibility for them. The inclusion of any link does not imply endorsement by Bharattech Origin.`,
  },
  {
    title: '8. Privacy',
    content: `Your use of the website is also governed by our Privacy Policy, which is incorporated into these Terms of Service by reference. Please review our Privacy Policy to understand our practices.`,
  },
  {
    title: '9. Governing Law',
    content: `These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to conflict of law provisions. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts of India.`,
  },
  {
    title: '10. Changes to Terms',
    content: `We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting to the website. Your continued use of the website following the posting of revised terms constitutes your acceptance of the changes. We encourage you to review these terms periodically.`,
  },
  {
    title: '11. Contact',
    content: `If you have any questions about these Terms of Service, please contact us at legal@bharattechorigin.com.`,
  },
];

export const TermsPage = () => (
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
          Terms of Service
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
          Please read these Terms of Service carefully before using the Bharattech Origin website. These terms govern your access to and use of all content and services available through our website.
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
