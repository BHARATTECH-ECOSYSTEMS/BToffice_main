"use client";

import { motion } from "framer-motion";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-accent/[0.12]",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -150, rotate: rotate - 15 }}
      animate={{ opacity: 1, y: 0, rotate: rotate }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{ y: [0, 15, 0] }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{ width, height }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            `bg-gradient-to-r ${gradient} to-transparent`,
            "border border-border/30 backdrop-blur-[2px]",
            "shadow-[0_8px_32px_0_rgba(0,0,0,0.04)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.6),transparent)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

function HeroGeometric({
  badge = "Design Collective",
  title1 = "Elevate Your Digital Vision",
  title2 = "Crafting Exceptional Websites",
}: {
  badge?: string;
  title1?: string;
  title2?: string;
}) {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number],
      },
    }),
  };

  return (
    <div className="relative min-h-[88vh] w-full overflow-hidden rounded-[2.5rem] mx-auto mt-4 max-w-[1400px]"
      style={{
        background:
          "radial-gradient(120% 80% at 70% 30%, hsl(230 85% 55%) 0%, hsl(235 80% 35%) 35%, hsl(240 70% 18%) 65%, hsl(240 60% 8%) 100%)",
      }}
    >
      {/* Soft grain / glow overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(120,140,255,0.25),transparent_60%)]" />

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-accent/[0.08]"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-accent/[0.06]"
          className="right-[-5%] md:right-[0%] top-[70%] md:top-[75%]"
        />
        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-accent/[0.07]"
          className="left-[5%] md:left-[10%] bottom-[5%] md:bottom-[10%]"
        />
        <ElegantShape
          delay={0.6}
          width={200}
          height={60}
          rotate={20}
          gradient="from-accent/[0.09]"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={150}
          height={40}
          rotate={-25}
          gradient="from-accent/[0.05]"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[8%]"
        />
      </div>

      {/* Content — centered headline */}
      <div className="relative z-10 w-full px-6 md:px-10 py-24 lg:py-32 min-h-[80vh] flex flex-col items-center justify-center text-center">
        <motion.div
          custom={0}
          variants={fadeUpVariants}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-10"
        >
          <Circle className="h-2 w-2 fill-white text-white" />
          <span className="text-xs font-medium tracking-wide text-white/80">
            {badge}
          </span>
        </motion.div>

        <motion.div custom={1} variants={fadeUpVariants} initial="hidden" animate="visible">
          <h1 className="font-display text-white font-bold tracking-tight leading-[1.02] text-[clamp(2.5rem,8vw,7rem)]">
            <span className="block bg-gradient-to-b from-white to-white/95 bg-clip-text text-transparent">
              {title1}
            </span>
            <span className="block bg-gradient-to-b from-white via-white/90 to-white/60 bg-clip-text text-transparent">
              {title2}
            </span>
          </h1>
        </motion.div>

        <motion.div custom={2} variants={fadeUpVariants} initial="hidden" animate="visible">
          <p className="text-base sm:text-lg text-white/70 max-w-xl mx-auto mt-10 leading-relaxed">
            Crafting exceptional digital experiences through innovative design and cutting-edge technology.
          </p>
        </motion.div>
      </div>

    </div>
  );
}

export { HeroGeometric };
