export interface BeatUpdate {
  i: number;
  /** -1…1: how far the headline is from its own beat, which slides its copy sideways */
  d: number;
  /** 0…1: how fully it is shown */
  v: number;
  visible: boolean;
}

/**
 * Which hero headlines to restyle at film position `b` (0…count). Each write restyles the headline and everything in
 * it, so a hidden one is written only on the frame it hides and left alone after; `shown` remembers what each headline
 * was last set to (empty on the first frame, which writes them all).
 */
export function beatUpdates(b: number, count: number, shown: (boolean | undefined)[]): BeatUpdate[] {
  const out: BeatUpdate[] = [];
  for (let i = 0; i < count; i++) {
    // The first headline is at rest until the scroll begins. The last one stays settled once it arrives and
    // leaves by scrolling away with the page: fading it here left it stuck half-faded as the frame let go.
    const d = i === 0 ? Math.max(0, b - 0.5) : i === count - 1 ? Math.min(0, b - (i + 0.5)) : b - (i + 0.5);
    // fully set for most of the beat, then out quickly at the edges
    const v = 1 - Math.min(1, Math.max(0, (Math.abs(d) - 0.3) / 0.2));
    const visible = v > 0.001;
    if (!visible && shown[i] === false) continue;
    shown[i] = visible;
    out.push({ i, d: Math.max(-1, Math.min(1, d)), v, visible });
  }
  return out;
}
