import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  Terminal,
  Globe,
  Award,
  Cloud,
  Smartphone,
  BarChart3,
  ShieldCheck,
  Wand2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    id: "voice",
    label: "Voice Assistant",
    icon: Mic,
    image: "https://images.unsplash.com/photo-1628258334105-2a0b3d6efee1?q=80&w=1200",
    description: "Natural voice interactions powered by sovereign AI models.",
  },
  {
    id: "community",
    label: "Community Focused",
    icon: Users,
    image: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200",
    description: "Building stronger bonds through shared experiences.",
  },
  {
    id: "global",
    label: "Global Reach",
    icon: Globe,
    image: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=1200",
    description: "Connecting visionaries across all continents.",
  },
  {
    id: "award",
    label: "Award Winning",
    icon: Award,
    image: "https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?q=80&w=1200",
    description: "Recognized excellence in design and innovation.",
  },
  {
    id: "cloud",
    label: "Cloud Ready",
    icon: Cloud,
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200",
    description: "Scale your infrastructure with seamless ease.",
  },
  {
    id: "mobile",
    label: "Mobile First",
    icon: Smartphone,
    image: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1200",
    description: "A world-class experience on every single device.",
  },
  {
    id: "analytics",
    label: "Real-time Analytics",
    icon: BarChart3,
    image: "https://images.unsplash.com/photo-1551288049-bbda38a10ad5?q=80&w=1200",
    description: "Insights at your fingertips, updated in real-time.",
  },
  {
    id: "security",
    label: "Enterprise Security",
    icon: ShieldCheck,
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1200",
    description: "Bank-grade security protocols for your data.",
  },
  {
    id: "magic",
    label: "Magic Automations",
    icon: Wand2,
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=1200",
    description: "Let AI handle the repetitive tasks for you.",
  },
  {
    id: "local",
    label: "Locally Owned",
    icon: Terminal,
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1200",
    description: "Supporting local businesses and creators.",
  },
];

const AUTO_PLAY_INTERVAL = 3000;
const ITEM_HEIGHT = 65;

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export function FeatureCarousel() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const currentIndex =
    ((step % FEATURES.length) + FEATURES.length) % FEATURES.length;

  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + FEATURES.length) % FEATURES.length;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused]);

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    const len = FEATURES.length;
    let normalizedDiff = diff;
    if (diff > len / 2) normalizedDiff -= len;
    if (diff < -len / 2) normalizedDiff += len;
    if (normalizedDiff === 0) return "active";
    if (normalizedDiff === -1) return "prev";
    if (normalizedDiff === 1) return "next";
    return "hidden";
  };

  return (
    <section className="py-24 bg-secondary overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16">
          {/* Left: Feature list */}
          <div className="lg:w-[45%] flex flex-col">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">Our Capabilities</p>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground leading-tight">
                Everything you need to <span className="text-accent">build with AI</span>
              </h2>
            </div>

            <div
              className="relative overflow-hidden"
              style={{ height: `${ITEM_HEIGHT * 5}px` }}
            >
               <div
                 className="absolute inset-0 pointer-events-none z-10"
                 style={{
                   background: `linear-gradient(to bottom, hsl(var(--secondary)) 0%, transparent 15%, transparent 85%, hsl(var(--secondary)) 100%)`,
                 }}
              />

              <div className="flex flex-col gap-1.5">
                {FEATURES.map((feature, index) => {
                  const isActive = index === currentIndex;
                  const distance = index - currentIndex;
                  const wrappedDistance = wrap(
                    -(FEATURES.length / 2),
                    FEATURES.length / 2,
                    distance
                  );

                  return (
                    <motion.div
                      key={feature.id}
                      animate={{ y: -step * ITEM_HEIGHT }}
                      transition={{ type: "spring", stiffness: 200, damping: 30 }}
                    >
                      <button
                        onClick={() => handleChipClick(index)}
                        onMouseEnter={() => setIsPaused(true)}
                        onMouseLeave={() => setIsPaused(false)}
                         className={cn(
                           "relative flex items-center gap-4 px-6 py-3.5 rounded-full transition-all duration-700 text-left group border w-full",
                           isActive
                             ? "bg-background text-accent border-border shadow-sm z-10"
                             : "bg-transparent text-muted-foreground border-border/50 hover:border-border hover:text-foreground"
                        )}
                      >
                        <div className="w-5 h-5 flex items-center justify-center">
                          <feature.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium truncate">
                          {feature.label}
                        </span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Image cards */}
          <div className="lg:w-[55%] flex items-center justify-center">
            <div className="relative w-full aspect-[4/3] max-w-[550px]">
              {FEATURES.map((feature, index) => {
                const status = getCardStatus(index);
                const isActive = status === "active";
                const isPrev = status === "prev";
                const isNext = status === "next";

                return (
                  <motion.div
                    key={feature.id}
                    className="absolute inset-0 rounded-2xl overflow-hidden"
                    initial={false}
                    animate={{
                      scale: isActive ? 1 : isPrev || isNext ? 0.9 : 0.85,
                      opacity: isActive ? 1 : isPrev || isNext ? 0.5 : 0,
                      y: isActive ? 0 : isPrev ? -30 : isNext ? 30 : 0,
                      zIndex: isActive ? 10 : isPrev || isNext ? 5 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 30 }}
                  >
                    <img
                      src={feature.image}
                      alt={feature.label}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30" />

                    <AnimatePresence>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-0 left-0 right-0 p-6"
                        >
                           <p className="text-white/70 text-xs font-medium mb-1">
                             {index + 1} • {feature.label}
                           </p>
                           <p className="text-white text-sm font-medium">
                             {feature.description}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="absolute top-4 right-4 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                       <span className="text-[10px] text-white/70 font-medium">
                         Live Session
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureCarousel;
