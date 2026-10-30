import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import { ArrowRight, Calendar, Clock } from 'lucide-react';

const posts = [
  {
    slug: 'why-ai-must-remember',
    category: 'Research',
    title: 'Why AI Systems Must Remember: The Case for Persistent Intelligence',
    excerpt: 'Every conversation with a current AI model begins from zero. We explore why this fundamental limitation holds back the potential of artificial intelligence and how persistent memory changes everything.',
    date: 'June 2026',
    readTime: '8 min read',
    featured: true,
    color: '#6A35FF',
  },
  {
    slug: 'generative-intelligence-vs-generative-ai',
    category: 'Research',
    title: 'Generative Intelligence vs Generative AI: Understanding the Distinction',
    excerpt: 'While Generative AI creates content, Generative Intelligence creates capabilities. We break down why this distinction matters for the future of intelligent systems.',
    date: 'May 2026',
    readTime: '6 min read',
    featured: false,
    color: '#7C3AED',
  },
  {
    slug: 'iot-intelligence-embedded-ai',
    category: 'Technology',
    title: 'The Future of Embedded AI: Intelligence That Lives in the Physical World',
    excerpt: 'As AI moves beyond screens and servers, intelligence embedded in physical systems will reshape how industries operate. Our IoT Intelligence research explains how.',
    date: 'May 2026',
    readTime: '7 min read',
    featured: false,
    color: '#059669',
  },
  {
    slug: 'geo-intelligence-climate-ai',
    category: 'Research',
    title: 'How Geo Intelligence Can Help Solve Climate and Infrastructure Challenges',
    excerpt: 'Combining geospatial reasoning with AI unlocks new ways to understand satellite imagery, climate patterns, and transportation networks at planetary scale.',
    date: 'April 2026',
    readTime: '9 min read',
    featured: false,
    color: '#0891B2',
  },
  {
    slug: 'miniature-intelligence-edge-ai',
    category: 'Technology',
    title: 'Edge AI Without Compromise: Miniature Intelligence on Your Device',
    excerpt: 'Lightweight models that stay connected to a larger intelligence network bring the power of the cloud to your personal devices without the latency.',
    date: 'April 2026',
    readTime: '5 min read',
    featured: false,
    color: '#D97706',
  },
  {
    slug: 'bharattech-origin-philosophy',
    category: 'Company',
    title: "Bharattech Origin's Philosophy: Building Infrastructure, Not Applications",
    excerpt: 'We reflect on our founding philosophy — why we chose to work on the foundational layer of intelligence rather than the applications built on top of it.',
    date: 'March 2026',
    readTime: '10 min read',
    featured: false,
    color: '#DC2626',
  },
];

const categories = ['All', 'Research', 'Technology', 'Company'];

export const BlogPage = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const filtered = activeCategory === 'All' ? posts : posts.filter(p => p.category === activeCategory);
  const [featured, ...rest] = filtered;

  return (
    <div className="bg-white" style={{ fontFamily: 'SF Pro Display, Inter, sans-serif' }}>

      {/* ─── Hero ─── */}
      <section className="pt-28 pb-20 px-8 lg:px-16 bg-[#FAFAFA] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse,rgba(106,53,255,0.07),transparent_70%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs font-semibold tracking-widest uppercase text-[#6A35FF] mb-4"
          >
            Insights & Research
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl lg:text-6xl font-semibold tracking-tight text-[#09090B] leading-tight"
          >
            Blog
          </motion.h1>
        </div>
      </section>

      {/* ─── Filter + Posts ─── */}
      <section className="py-16 px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">

          {/* Category filter */}
          <div className="flex gap-2 mb-14 bg-[#F5F5F5] rounded-full p-1 w-fit">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeCategory === c ? 'bg-white text-[#09090B] shadow-sm' : 'text-[#71717A] hover:text-[#09090B]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Featured post */}
          {featured && (
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group bg-[#09090B] rounded-3xl p-10 lg:p-14 mb-8 cursor-pointer relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(106,53,255,0.25),transparent_60%)] pointer-events-none" />
              <div className="relative z-10 max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-[#6A35FF]/30 text-[#B497FF]">
                    {featured.category}
                  </span>
                  <span className="text-[13px] text-white/40 flex items-center gap-1.5">
                    <Calendar size={12} />{featured.date}
                  </span>
                  <span className="text-[13px] text-white/40 flex items-center gap-1.5">
                    <Clock size={12} />{featured.readTime}
                  </span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-tight mb-5 group-hover:text-[#B497FF] transition-colors">
                  {featured.title}
                </h2>
                <p className="text-[15px] text-white/50 leading-relaxed mb-8">{featured.excerpt}</p>
                <div className="flex items-center gap-2 text-[#B497FF] text-sm font-medium">
                  Read article <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Post grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rest.map((post, i) => (
              <motion.div
                key={post.slug}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group bg-white border border-[#E4E4E7] rounded-3xl p-8 flex flex-col gap-5 cursor-pointer hover:border-[#6A35FF]/25 hover:shadow-[0_8px_32px_rgba(106,53,255,0.08)] transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <span
                    className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full"
                    style={{ background: `${post.color}15`, color: post.color }}
                  >
                    {post.category}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-[17px] font-semibold text-[#09090B] leading-snug mb-3 group-hover:text-[#6A35FF] transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-[13px] text-[#71717A] leading-relaxed line-clamp-3">{post.excerpt}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[#F4F4F5] text-[12px] text-[#A1A1AA]">
                  <span className="flex items-center gap-1.5"><Calendar size={11} />{post.date}</span>
                  <span className="flex items-center gap-1.5"><Clock size={11} />{post.readTime}</span>
                </div>
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="py-20 text-center text-[#71717A]">No posts in this category yet.</div>
          )}
        </div>
      </section>

      {/* ─── Subscribe ─── */}
      <section className="py-20 px-8 lg:px-16 bg-[#FAFAFA]">
        <div className="max-w-lg mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-semibold text-[#09090B] mb-4 tracking-tight"
          >
            Stay up to date
          </motion.h2>
          <p className="text-[15px] text-[#71717A] mb-8">Research updates, company news, and intelligence insights — delivered to your inbox.</p>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 px-5 py-3.5 rounded-full border border-[#E4E4E7] text-[15px] outline-none focus:border-[#6A35FF]/50 focus:ring-2 focus:ring-[#6A35FF]/10 bg-white"
            />
            <button className="px-6 py-3.5 bg-[#6A35FF] text-white rounded-full font-medium hover:bg-[#7C3AED] transition-colors text-sm whitespace-nowrap">
              Subscribe
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
