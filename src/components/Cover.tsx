import { useId, useMemo } from 'react';
import { rng } from '../gl/formations';

type Line = { d: string; w: number; o: number };
const W = 400;
const H = 300;
const pt = (x: number, y: number) => `${(x * W).toFixed(1)} ${(y * H).toFixed(1)}`;

/** Threads spiralling into a single point of focus. */
function vortex(r: () => number, flip: boolean) {
  const out: Line[] = [];
  const cx = 0.3 + r() * 0.4;
  const cy = 0.3 + r() * 0.4;
  const twist = (1 + r() * 1.5) * (flip ? -1 : 1);
  const count = 26 + Math.floor(r() * 14);
  for (let i = 0; i < count; i++) {
    const a0 = (i / count) * Math.PI * 2 + r() * 0.2;
    let x = 0.5 + Math.cos(a0) * 0.9;
    let y = 0.5 + Math.sin(a0) * 0.9;
    let d = `M${pt(x, y)}`;
    for (let s = 0; s < 90; s++) {
      const dist = Math.hypot(cx - x, cy - y) + 1e-3;
      const ang = Math.atan2(cy - y, cx - x) + twist * Math.exp(-dist * 2.2);
      const step = Math.min(0.03, dist * 0.12);
      x += Math.cos(ang) * step;
      y += Math.sin(ang) * step;
      d += `L${pt(x, y)}`;
    }
    out.push({ d, w: 0.6 + r() * 1.6, o: 0.25 + r() * 0.75 });
  }
  return { out, focus: [cx, cy] as const };
}

/** Parallel currents bending around an unseen mass. */
function currents(r: () => number) {
  const out: Line[] = [];
  const mx = 0.35 + r() * 0.3;
  const my = 0.35 + r() * 0.3;
  const count = 34;
  for (let i = 0; i < count; i++) {
    const y0 = i / (count - 1);
    let d = '';
    for (let s = 0; s <= 60; s++) {
      const x = s / 60;
      const dx = x - mx;
      const dy = y0 - my;
      const pull = 0.12 * Math.exp(-(dx * dx + dy * dy) * 14) * Math.sign(dy || 1);
      const wave = Math.sin(x * 6 + i * 0.35) * 0.012;
      d += `${s ? 'L' : 'M'}${pt(x, y0 + pull + wave)}`;
    }
    out.push({ d, w: 0.7 + (i % 5 === 0 ? 1 : 0), o: 0.2 + (1 - Math.abs(y0 - my)) * 0.7 });
  }
  return { out, focus: [mx, my] as const };
}

/** Contour strata, like a terrain of accumulated knowledge. */
function strata(r: () => number) {
  const out: Line[] = [];
  const cx = 0.3 + r() * 0.4;
  const cy = 0.35 + r() * 0.3;
  const k1 = 2 + Math.floor(r() * 3);
  const ph = r() * 6;
  for (let i = 1; i <= 22; i++) {
    const rad = i * 0.045;
    let d = '';
    for (let s = 0; s <= 90; s++) {
      const a = (s / 90) * Math.PI * 2;
      const wob = 1 + 0.12 * Math.sin(a * k1 + ph + i * 0.2) + 0.05 * Math.sin(a * 5 + i);
      d += `${s ? 'L' : 'M'}${pt(cx + Math.cos(a) * rad * wob * 0.8, cy + Math.sin(a) * rad * wob)}`;
    }
    out.push({ d: d + 'Z', w: i % 4 === 0 ? 1.4 : 0.7, o: 0.9 - i * 0.03 });
  }
  return { out, focus: [cx, cy] as const };
}

/** Three bundles of threads converging on one origin: the mark, abstracted. */
function convergence(r: () => number) {
  const out: Line[] = [];
  const fx = 0.62 + r() * 0.15;
  const fy = 0.3 + r() * 0.3;
  const starts = [0.18, 0.5, 0.85];
  starts.forEach((sy, b) => {
    for (let i = 0; i < 12; i++) {
      const y0 = sy + (i - 6) * 0.012;
      const c1 = [0.35, y0 - 0.05 * (b - 1)];
      const c2 = [fx - 0.2, fy + (y0 - fy) * 0.25];
      out.push({
        d: `M${pt(-0.05, y0)}C${pt(c1[0], c1[1])} ${pt(c2[0], c2[1])} ${pt(fx, fy)}`,
        w: 0.6 + (i === 6 ? 1.2 : 0),
        o: 0.25 + (1 - Math.abs(i - 6) / 6) * 0.7,
      });
    }
  });
  return { out, focus: [fx, fy] as const };
}

/**
 * A generative cover, woven per story from its slug.
 * No stock imagery anywhere on the site: every picture is drawn from the system.
 */
export function Cover({ seed, variant = 0 }: { seed: string; variant?: number }) {
  const id = useId().replace(/:/g, '');
  const art = useMemo(() => {
    let h = 2166136261;
    for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    const r = rng(h >>> 0);
    const style = variant % 4;
    return style === 0 ? vortex(r, false) : style === 1 ? currents(r) : style === 2 ? strata(r) : convergence(r);
  }, [seed, variant]);
  const [fx, fy] = art.focus;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id={`r${id}`} cx={fx} cy={fy} r="0.6">
          <stop offset="0" stopColor="#6A35FF" stopOpacity="0.28" />
          <stop offset="1" stopColor="#6A35FF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`l${id}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="var(--ink)" stopOpacity="0.5" />
          <stop offset="1" stopColor="#6A35FF" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#r${id})`} />
      <g fill="none" stroke={`url(#l${id})`} strokeLinecap="round">
        {art.out.map((p, i) => (
          <path key={i} d={p.d} strokeWidth={p.w} opacity={p.o} />
        ))}
      </g>
      <circle cx={fx * W} cy={fy * H} r="3.2" fill="#6A35FF" />
      <circle cx={fx * W} cy={fy * H} r="10" fill="none" stroke="#6A35FF" strokeOpacity="0.4" />
    </svg>
  );
}
