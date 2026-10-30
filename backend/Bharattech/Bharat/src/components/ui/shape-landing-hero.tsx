"use client";

import { useEffect, useRef } from "react";
import { animate, cubicBezier, stagger, onScroll } from "animejs";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ambientDrift } from "@/lib/animations";
import emblemIcon from "../../assets/bharattech-icon.png";

const entranceEase = cubicBezier(0.23, 0.86, 0.39, 0.96);

/** 6 neural pathways radiating from the emblem, drawn with a moving dash so they read as "flowing" rather than static. */
const EMBLEM_PATHWAYS = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2;
  const r1 = 58;
  const r2 = 112;
  const x1 = 100 + Math.cos(angle) * r1;
  const y1 = 100 + Math.sin(angle) * r1;
  const x2 = 100 + Math.cos(angle) * r2;
  const y2 = 100 + Math.sin(angle) * r2;
  const cx = 100 + Math.cos(angle + 0.35) * (r1 + r2) / 2;
  const cy = 100 + Math.sin(angle + 0.35) * (r1 + r2) / 2;
  return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
});

/** Particle field ringing the emblem — fixed positions, individually drifting + twinkling. */
const EMBLEM_PARTICLES = Array.from({ length: 10 }, (_, i) => {
  const angle = (i / 10) * Math.PI * 2 + 0.4;
  const r = 92 + (i % 3) * 18;
  return {
    x: 100 + Math.cos(angle) * r,
    y: 100 + Math.sin(angle) * r,
    size: 2 + (i % 3),
    duration: 6000 + i * 500,
  };
});

/** Animated Bharattech Origin emblem — breathing icon, flowing neural pathways, drifting particle field. */
function AnimatedEmblem() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLImageElement>(null);
  const pathRefs = useRef<SVGPathElement[]>([]);
  const particleRefs = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (wrapRef.current) {
      animate(wrapRef.current, { opacity: [0, 1], scale: [0.85, 1], duration: 1000, delay: 150, ease: entranceEase });
    }
    if (iconRef.current) {
      animate(iconRef.current, { scale: [1, 1.05, 1], duration: 4200, delay: 1200, loop: true, ease: "inOutSine" });
    }
    pathRefs.current.forEach((p, i) => {
      if (!p) return;
      animate(p, { strokeDashoffset: [0, -40], duration: 2400 + i * 200, loop: true, ease: "linear" });
    });
    particleRefs.current.forEach((p, i) => {
      if (!p) return;
      ambientDrift(p, { range: 8 + (i % 3) * 4, duration: 6000 + i * 500 });
      animate(p, { opacity: [0.2, 0.9, 0.2], duration: 2600 + i * 300, loop: true, ease: "inOutSine" });
    });
  }, []);

  return (
    <div ref={wrapRef} style={{ opacity: 0 }} className="relative mb-8 w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] pointer-events-none">
      <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full" style={{ overflow: "visible" }}>
        {EMBLEM_PATHWAYS.map((d, i) => (
          <path
            key={i}
            ref={(el) => { if (el) pathRefs.current[i] = el; }}
            d={d}
            fill="none"
            stroke="#8F7BFF"
            strokeWidth={1.3}
            strokeLinecap="round"
            strokeDasharray="3 7"
            opacity={0.6}
          />
        ))}
      </svg>
      {EMBLEM_PARTICLES.map((p, i) => (
        <div
          key={i}
          ref={(el) => { if (el) particleRefs.current[i] = el; }}
          className="absolute rounded-full bg-white"
          style={{ left: `${(p.x / 200) * 100}%`, top: `${(p.y / 200) * 100}%`, width: p.size, height: p.size, boxShadow: "0 0 6px rgba(255,255,255,0.7)" }}
        />
      ))}
      <img
        ref={iconRef}
        src={emblemIcon}
        alt="Bharattech Origin"
        className="absolute inset-0 w-full h-full object-contain"
        style={{ filter: "drop-shadow(0 0 24px rgba(143,123,255,0.55))" }}
      />
    </div>
  );
}

/** Flowing aurora blob — organic multi-point drift + breathing scale, screen-blended so it lights up the gradient beneath it. */
function AuroraBlob({
  className,
  color,
  size,
  duration = 20000,
}: {
  className?: string;
  color: string;
  size: number;
  duration?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    animate(ref.current, {
      translateX: [0, size * 0.35, -size * 0.2, size * 0.15, 0],
      translateY: [0, -size * 0.25, size * 0.3, -size * 0.1, 0],
      scale: [1, 1.15, 0.92, 1.08, 1],
      duration,
      loop: true,
      ease: "inOutSine",
    });
  }, [size, duration]);

  return (
    <div
      ref={ref}
      className={cn("absolute rounded-full blur-3xl mix-blend-screen pointer-events-none", className)}
      style={{ width: size, height: size, background: color }}
    />
  );
}

/** Hover glow colors: white for the small "square" tiles, brand violet→blue (matching the logo swirl) for the big horizontal bars. */
const GLOW_PRESETS = {
  white: "radial-gradient(circle, rgba(255,255,255,0.95), rgba(255,255,255,0.35) 55%, transparent 78%)",
  brand: "radial-gradient(circle, rgba(143,123,255,0.95), rgba(77,49,232,0.55) 55%, transparent 78%)",
} as const;

/** Refined glass panel — replaces the previous blurry "blob" shapes with a cleaner, more technical silhouette. */
function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-[#4D31E8]/[0.12]",
  glow = "white",
}: {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
  glow?: keyof typeof GLOW_PRESETS;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!outerRef.current || !floatRef.current) return;

    animate(outerRef.current, {
      opacity: [0, 1],
      translateY: [-120, 0],
      rotate: [rotate - 10, rotate],
      duration: 2200,
      delay: delay * 1000,
      ease: entranceEase,
    });

    animate(floatRef.current, {
      translateY: [0, 14, 0],
      duration: 11000,
      loop: true,
      ease: "inOutSine",
    });
  }, [delay, rotate]);

  useEffect(() => {
    const panel = panelRef.current;
    const glowEl = glowRef.current;
    if (!panel || !glowEl) return;

    const onEnter = () => {
      animate(glowEl, { opacity: [0, 1], scale: [0.88, 1.08], duration: 450, ease: "outQuad" });
      animate(panel, { scale: 1.04, duration: 450, ease: "outQuad" });
    };
    const onLeave = () => {
      animate(glowEl, { opacity: 0, scale: 0.88, duration: 400, ease: "outQuad" });
      animate(panel, { scale: 1, duration: 400, ease: "outQuad" });
    };

    panel.addEventListener("mouseenter", onEnter);
    panel.addEventListener("mouseleave", onLeave);
    return () => {
      panel.removeEventListener("mouseenter", onEnter);
      panel.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={outerRef} style={{ opacity: 0 }} className={cn("absolute", className)}>
      <div ref={floatRef} style={{ width, height }} className="relative">
        {/* Hover glow halo — sits behind the panel, animated in/out by anime.js */}
        <div
          ref={glowRef}
          style={{ opacity: 0, background: GLOW_PRESETS[glow] }}
          className="absolute -inset-6 rounded-[2rem] blur-xl pointer-events-none"
        />
        <div
          ref={panelRef}
          className={cn(
            "absolute inset-0 rounded-2xl cursor-pointer",
            `bg-gradient-to-br ${gradient} to-transparent`,
            "border border-white/[0.08] backdrop-blur-[3px]",
            "shadow-[0_8px_40px_0_rgba(0,0,0,0.10)]",
            "after:absolute after:inset-px after:rounded-2xl",
            "after:bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_60%)]"
          )}
        />
      </div>
    </div>
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
  const rootRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const badgeDotRef = useRef<HTMLSpanElement>(null);
  const lineRefs = useRef<HTMLSpanElement[]>([]);
  const paragraphRef = useRef<HTMLParagraphElement>(null);
  const glowRef1 = useRef<HTMLDivElement>(null);
  const glowRef2 = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Slow ambient drift on the background glow + grid layers — adds depth without touching the gradient itself.
  useEffect(() => {
    if (glowRef1.current) ambientDrift(glowRef1.current, { range: 60, duration: 22000 });
    if (glowRef2.current) ambientDrift(glowRef2.current, { range: 50, duration: 18000 });
    if (gridRef.current) ambientDrift(gridRef.current, { range: 14, duration: 26000 });
  }, []);

  // Subtle parallax: hero content eases back slightly as the user scrolls past it.
  useEffect(() => {
    if (!rootRef.current) return;
    const content = rootRef.current.querySelector<HTMLElement>("[data-hero-content]");
    if (!content) return;
    animate(content, {
      translateY: [0, 60],
      opacity: [1, 0.55],
      ease: "linear",
      autoplay: onScroll({
        target: rootRef.current,
        enter: "top top",
        leave: "bottom top",
        sync: true,
      }),
    });
  }, []);

  useEffect(() => {
    if (!badgeRef.current || !paragraphRef.current) return;
    const lines = lineRefs.current.filter(Boolean);

    animate(badgeRef.current, {
      opacity: [0, 1],
      translateY: [24, 0],
      scale: [0.92, 1],
      duration: 900,
      delay: 400,
      ease: entranceEase,
    });

    if (badgeDotRef.current) {
      animate(badgeDotRef.current, {
        opacity: [1, 0.35, 1],
        scale: [1, 1.4, 1],
        duration: 2200,
        delay: 1400,
        loop: true,
        ease: "inOutSine",
      });
    }

    animate(lines, {
      opacity: [0, 1],
      translateY: [50, 0],
      duration: 1100,
      delay: stagger(170, { start: 650 }),
      ease: "outExpo",
    });

    animate(paragraphRef.current, {
      opacity: [0, 1],
      translateY: [22, 0],
      duration: 900,
      delay: 1050,
      ease: entranceEase,
    });
  }, [title1, title2]);

  return (
    <div
      ref={rootRef}
      className="relative min-h-screen w-full overflow-hidden -mt-20 pt-20"
      style={{
        background:
          "radial-gradient(150% 100% at 50% 22%, #6A58FF 0%, #4D31E8 45%, #040406 100%)",
      }}
    >
      {/* Vignette — soft corner darkening only, kept light so it never muddies the bottom fade */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.16)_100%)] pointer-events-none" />
      {/* Bottom fade — dissolves into the next section, then holds fully opaque so the seam is pixel-exact */}
      <div
        className="absolute inset-x-0 bottom-0 h-64 pointer-events-none z-20"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, transparent 30%, rgba(4,4,6,0.92) 60%, #040406 80%, #040406 100%)",
        }}
      />
      {/* Fine technical grid — adds a premium "product" texture without altering the background colors */}
      <div
        ref={gridRef}
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />

      {/* Soft grain / glow overlay — drifts slowly for subtle background motion */}
      <div ref={glowRef1} className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.18),transparent_55%)]" />
      <div ref={glowRef2} className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(143,123,255,0.28),transparent_60%)]" />

      {/* Flowing aurora field — brand violet/blue palette, given organic motion */}
      <div className="absolute inset-0 overflow-hidden">
        <AuroraBlob className="-left-[10%] top-[5%]" color="#6A58FF59" size={520} duration={21000} />
        <AuroraBlob className="right-[-15%] top-[35%]" color="#8F7BFF4D" size={460} duration={26000} />
        <AuroraBlob className="left-[20%] top-[55%]" color="#4D31E840" size={420} duration={18000} />
      </div>

      {/* Floating shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <ElegantShape
          delay={0.3}
          width={560}
          height={130}
          rotate={10}
          gradient="from-[#4D31E8]/[0.10]"
          glow="brand"
          className="left-[-10%] md:left-[-5%] top-[15%] md:top-[20%]"
        />
        <ElegantShape
          delay={0.5}
          width={460}
          height={110}
          rotate={-12}
          gradient="from-[#4D31E8]/[0.08]"
          glow="brand"
          className="right-[-5%] md:right-[0%] top-[55%] md:top-[58%]"
        />
        <ElegantShape
          delay={0.4}
          width={280}
          height={75}
          rotate={-6}
          gradient="from-[#6A58FF]/[0.09]"
          glow="white"
          className="left-[5%] md:left-[10%] top-[62%] md:top-[64%]"
        />
        <ElegantShape
          delay={0.6}
          width={190}
          height={55}
          rotate={16}
          gradient="from-[#6A58FF]/[0.11]"
          glow="white"
          className="right-[15%] md:right-[20%] top-[10%] md:top-[15%]"
        />
        <ElegantShape
          delay={0.7}
          width={140}
          height={38}
          rotate={-18}
          gradient="from-[#8F7BFF]/[0.07]"
          glow="white"
          className="left-[20%] md:left-[25%] top-[5%] md:top-[8%]"
        />
      </div>

      {/* Content — centered headline */}
      <div data-hero-content className="relative z-10 w-full px-6 md:px-10 py-24 lg:py-32 min-h-[80vh] flex flex-col items-center justify-center text-center pointer-events-none">
        {/* Gradient glow behind the headline — contrast pop against the hero background */}
        <div
          className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[140%] max-w-[1000px] h-[460px] pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(143,123,255,0.40) 0%, rgba(77,49,232,0.22) 42%, transparent 72%)",
            filter: "blur(70px)",
          }}
        />

        <AnimatedEmblem />

        <div
          ref={badgeRef}
          style={{ opacity: 0 }}
          className="relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-sm mb-10"
        >
          <span ref={badgeDotRef} className="relative flex">
            <Circle className="h-2 w-2 fill-emerald-400 text-emerald-400" />
          </span>
          <span className="text-xs font-medium tracking-wide text-white/85">
            {badge}
          </span>
        </div>

        <h1 className="relative font-display font-bold tracking-tight leading-[1.02] text-[clamp(2.5rem,8vw,7rem)]">
          <span
            ref={(el) => {
              if (el) lineRefs.current[0] = el;
            }}
            style={{ opacity: 0 }}
            className="block text-white"
          >
            {title1}
          </span>
          <span
            ref={(el) => {
              if (el) lineRefs.current[1] = el;
            }}
            style={{ opacity: 0 }}
            className="block bg-gradient-to-r from-indigo-200 via-white to-indigo-200 bg-clip-text text-transparent"
          >
            {title2}
          </span>
        </h1>

        <p
          ref={paragraphRef}
          style={{ opacity: 0 }}
          className="relative text-base sm:text-lg text-white/70 max-w-xl mx-auto mt-10 leading-relaxed"
        >
          Crafting exceptional digital experiences through innovative design and cutting-edge technology.
        </p>
      </div>
    </div>
  );
}

export { HeroGeometric };
