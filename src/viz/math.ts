export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, u: number) => a + (b - a) * u;
/** progress of t through [a, b], clamped to 0…1 */
export const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const smooth = (u: number) => u * u * (3 - 2 * u);
export const inOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
export const out = (u: number) => 1 - Math.pow(1 - u, 3);
export const back = (u: number) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
};
/** 0 → 1 → 0 across [a, b] */
export const tri = (t: number, a: number, b: number) => 1 - Math.abs(seg(t, a, b) * 2 - 1);
/** 1 between a and b, easing in and out over `e` seconds */
export const window_ = (t: number, a: number, b: number, e = 0.3) => smooth(seg(t, a, a + e)) * (1 - smooth(seg(t, b - e, b)));
