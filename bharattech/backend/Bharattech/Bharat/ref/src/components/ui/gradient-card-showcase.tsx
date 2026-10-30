import React from "react";

const cards = [
  {
    title: "BharatAI Platform",
    desc: "Sovereign AI models trained on Indian languages and data, enabling intelligent applications across industries.",
    gradientFrom: "hsl(var(--accent))",
    gradientTo: "hsl(245 80% 70%)",
  },
  {
    title: "GPU Compute Cloud",
    desc: "Affordable, scalable GPU infrastructure purpose-built for AI training, inference, and research workloads.",
    gradientFrom: "hsl(200 80% 55%)",
    gradientTo: "hsl(var(--accent))",
  },
  {
    title: "AI Research Lab",
    desc: "Collaborative research environment empowering developers and academics to push the boundaries of AI innovation.",
    gradientFrom: "hsl(150 70% 45%)",
    gradientTo: "hsl(200 80% 55%)",
  },
];

export default function SkewCards() {
  return (
    <section className="py-24 bg-background">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="grid gap-8 md:grid-cols-3">
          {cards.map(({ title, desc, gradientFrom, gradientTo }, idx) => (
            <div
              key={idx}
              className="group relative rounded-2xl border border-border bg-card p-8 overflow-hidden transition-all duration-500 hover:shadow-lg"
            >
              {/* Skewed gradient panels */}
              <div
                className="absolute -right-10 -top-10 h-40 w-40 rotate-12 rounded-2xl opacity-20 transition-all duration-500 group-hover:rotate-[20deg] group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
                }}
              />
              <div
                className="absolute -right-16 -top-16 h-40 w-40 rotate-[25deg] rounded-2xl opacity-10 transition-all duration-500 group-hover:rotate-[35deg] group-hover:scale-125"
                style={{
                  background: `linear-gradient(135deg, ${gradientTo}, ${gradientFrom})`,
                }}
              />

              {/* Animated blurs */}
              <div className="absolute right-4 top-4 opacity-30 group-hover:opacity-50 transition-opacity">
                <div
                  className="h-16 w-16 rounded-full blur-2xl animate-bounce"
                  style={{ backgroundColor: gradientFrom }}
                />
                <div
                  className="h-12 w-12 rounded-full blur-xl -mt-6 ml-4"
                  style={{
                    backgroundColor: gradientTo,
                    animation: "blob 2s ease-in-out infinite -1s",
                  }}
                />
              </div>

              {/* Content */}
              <div className="relative z-10">
                <h3 className="font-display text-xl font-bold text-foreground mb-3">
                  {title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {desc}
                </p>
                <button className="text-sm font-medium text-foreground hover:text-accent transition-colors">
                  Read More →
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translateY(10px); }
          50% { transform: translate(-10px); }
        }
      `}</style>
    </section>
  );
}
