import { animate, stagger, cubicBezier, type TargetsParam } from "animejs";

/**
 * Runs `onEnter` once an element is scrolled into view. Backed by IntersectionObserver
 * rather than anime.js's scroll-event-based ScrollObserver, which can miss fast or
 * programmatic scrolls and leave opacity:0 content stuck invisible.
 */
function onIntersect(el: Element, onEnter: () => void, opts: { threshold?: number } = {}) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onEnter();
          observer.unobserve(el);
        }
      }
    },
    { threshold: opts.threshold ?? 0.1, rootMargin: "0px 0px -10% 0px" }
  );
  observer.observe(el);
  return () => observer.unobserve(el);
}

/** Shared premium easing — used across hero + scroll reveals for consistency. */
export const easeOutPremium = cubicBezier(0.23, 0.86, 0.39, 0.96);

/** Fade + rise entrance, e.g. headline lines, paragraphs, badges. */
export function fadeUp(target: TargetsParam, opts: { delay?: number; duration?: number; distance?: number } = {}) {
  const { delay = 0, duration = 900, distance = 28 } = opts;
  return animate(target, {
    opacity: [0, 1],
    translateY: [distance, 0],
    duration,
    delay,
    ease: easeOutPremium,
  });
}

/** Staggered fade + rise for groups of elements (cards, nav items, list rows). */
export function staggerFadeUp(
  targets: TargetsParam,
  opts: { delayEach?: number; start?: number; duration?: number; distance?: number } = {}
) {
  const { delayEach = 90, start = 0, duration = 700, distance = 24 } = opts;
  return animate(targets, {
    opacity: [0, 1],
    translateY: [distance, 0],
    duration,
    delay: stagger(delayEach, { start }),
    ease: easeOutPremium,
  });
}

/** Continuous gentle float loop — for hero shapes / demo cards. */
export function floatLoop(target: TargetsParam, opts: { distance?: number; duration?: number } = {}) {
  const { distance = 14, duration = 6000 } = opts;
  return animate(target, {
    translateY: [0, -distance, 0],
    duration,
    loop: true,
    ease: "inOutSine",
  });
}

/**
 * Scroll-triggered reveal: element fades/rises into place once it enters the viewport.
 * Triggered by IntersectionObserver (reliable for fast/programmatic scrolls), animated by anime.js.
 */
export function scrollReveal(
  target: HTMLElement,
  opts: { delay?: number; duration?: number; distance?: number } = {}
) {
  const { delay = 0, duration = 800, distance = 32 } = opts;
  return onIntersect(target, () => {
    animate(target, {
      opacity: [0, 1],
      translateY: [distance, 0],
      duration,
      delay,
      ease: easeOutPremium,
    });
  });
}

/** Staggered scroll reveal for a group of sibling cards/items. */
export function scrollRevealStagger(
  targets: TargetsParam,
  container: HTMLElement,
  opts: { delayEach?: number; duration?: number; distance?: number } = {}
) {
  const { delayEach = 90, duration = 700, distance = 28 } = opts;
  return onIntersect(container, () => {
    animate(targets, {
      opacity: [0, 1],
      translateY: [distance, 0],
      duration,
      delay: stagger(delayEach),
      ease: easeOutPremium,
    });
  });
}

/**
 * Animate a number counting up, formatted with toLocaleString.
 * Pass the element that should display the count and the target value.
 */
export function countUp(
  el: HTMLElement,
  to: number,
  opts: { from?: number; duration?: number; delay?: number; suffix?: string; prefix?: string } = {}
) {
  const { from = 0, duration = 1600, delay = 0, suffix = "", prefix = "" } = opts;
  const obj = { value: from };
  return animate(obj, {
    value: to,
    duration,
    delay,
    ease: "outExpo",
    onUpdate: () => {
      el.textContent = `${prefix}${Math.round(obj.value).toLocaleString("en-IN")}${suffix}`;
    },
  });
}

/** Counter that triggers when it scrolls into view (used by stats sections). */
export function countUpOnScroll(
  el: HTMLElement,
  to: number,
  opts: { from?: number; duration?: number; suffix?: string; prefix?: string } = {}
) {
  const { from = 0, duration = 1600, suffix = "", prefix = "" } = opts;
  const obj = { value: from };
  return onIntersect(el, () => {
    animate(obj, {
      value: to,
      duration,
      ease: "outExpo",
      onUpdate: () => {
        el.textContent = `${prefix}${Math.round(obj.value).toLocaleString("en-IN")}${suffix}`;
      },
    });
  });
}

/** Subtle hover micro-interaction: lift + scale. Attach/detach on pointer events. */
export function attachHoverLift(el: HTMLElement, opts: { lift?: number; scale?: number } = {}) {
  const { lift = 6, scale = 1.015 } = opts;
  const onEnter = () =>
    animate(el, { translateY: -lift, scale, duration: 350, ease: "outQuad" });
  const onLeave = () =>
    animate(el, { translateY: 0, scale: 1, duration: 350, ease: "outQuad" });
  el.addEventListener("mouseenter", onEnter);
  el.addEventListener("mouseleave", onLeave);
  return () => {
    el.removeEventListener("mouseenter", onEnter);
    el.removeEventListener("mouseleave", onLeave);
  };
}

/**
 * Magnetic hover — element eases toward the cursor within its own bounds, springs back on leave.
 * A small "alive" touch for primary CTAs; capped by `strength` so it never feels gimmicky.
 */
export function attachMagnetic(el: HTMLElement, opts: { strength?: number } = {}) {
  const { strength = 0.35 } = opts;
  const onMove = (e: MouseEvent) => {
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    animate(el, { translateX: x, translateY: y, duration: 350, ease: "outQuad" });
  };
  const onLeave = () => {
    animate(el, { translateX: 0, translateY: 0, duration: 450, ease: "outElastic(1, 0.6)" });
  };
  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", onLeave);
  return () => {
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mouseleave", onLeave);
  };
}

/** 3D tilt on hover — card rotates toward the cursor, settles back with a light spring on leave. */
export function attachTilt(el: HTMLElement, opts: { max?: number } = {}) {
  const { max = 8 } = opts;
  el.style.transformStyle = "preserve-3d";
  const onMove = (e: MouseEvent) => {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    animate(el, {
      rotateY: px * max * 2,
      rotateX: -py * max * 2,
      duration: 300,
      ease: "outQuad",
    });
  };
  const onLeave = () => {
    animate(el, { rotateX: 0, rotateY: 0, duration: 500, ease: "outElastic(1, 0.6)" });
  };
  el.addEventListener("mousemove", onMove);
  el.addEventListener("mouseleave", onLeave);
  return () => {
    el.removeEventListener("mousemove", onMove);
    el.removeEventListener("mouseleave", onLeave);
  };
}

/** Slow ambient drift for background gradient blobs — never fully stops, never distracting. */
export function ambientDrift(target: TargetsParam, opts: { range?: number; duration?: number } = {}) {
  const { range = 40, duration = 18000 } = opts;
  return animate(target, {
    translateX: [0, range, -range * 0.6, 0],
    translateY: [0, -range * 0.5, range * 0.4, 0],
    duration,
    loop: true,
    ease: "inOutSine",
  });
}
