import React from "react";

const cards = [
  {
    title: "BharatAI Platform",
    desc: "Sovereign AI models trained on Indian languages and data, enabling intelligent applications across industries.",
    gradientFrom: "#4D31E8",
    gradientTo: "#8F7BFF",
  },
  {
    title: "GPU Compute Cloud",
    desc: "Affordable, scalable GPU infrastructure purpose-built for AI training, inference, and research workloads.",
    gradientFrom: "#6A58FF",
    gradientTo: "#4D31E8",
  },
  {
    title: "AI Research Lab",
    desc: "Collaborative research environment empowering developers and academics to push the boundaries of AI innovation.",
    gradientFrom: "#8F7BFF",
    gradientTo: "#6A58FF",
  },
];

export default function SkewCards() {
  return (
    <section className="py-16 bg-brand-bg">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {cards.map(({ title, desc, gradientFrom, gradientTo }, idx) => (
            <div
              key={idx}
              className="group relative rounded-2xl border border-brand-border bg-white/[0.03] p-8 overflow-hidden transition-all duration-500 hover:shadow-lg"
            >
              {/* Quiet corner glow — a single soft blur, no skew/bounce gimmick */}
              <div
                className="absolute -right-12 -top-12 h-44 w-44 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-35"
                style={{
                  background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                }}
              />

              {/* Content */}
              <div className="relative z-10">
                <h3 className="font-display text-xl font-bold text-white mb-3">
                  {title}
                </h3>
                <p className="text-sm text-brand-muted leading-relaxed mb-6">
                  {desc}
                </p>
                <button className="text-sm font-medium text-white hover:text-brand-secondary transition-colors">
                  Read More →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
