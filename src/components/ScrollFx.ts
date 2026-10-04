import { useEffect } from 'react';

/**
 * Scroll choreography for the whole page, scrubbed by the scroll position rather than fired once:
 * scrolling back plays everything in reverse, the way the 3D does.
 *
 *  · every section gets `--e` (0…1, how far it has entered) and `--p` (0…1, how far it has been read);
 *    each section's CSS turns those into its own signature transition
 *  · section headlines come into focus: blurred and split into a red and a violet ghost, they converge into
 *    one sharp line as they reach their reading position
 *  · one giant outlined word per chapter drifts sideways behind the object, like type on a wall a camera passes
 */

const GHOSTS: Record<string, string> = {
  intro: 'MEMORY',
  mission: 'SILOS',
  capabilities: 'FIFTEEN',
  architecture: 'LAYERS',
  network: 'BHARAT',
  laboratory: 'RESEARCH',
  audiences: 'PEOPLE',
  journal: 'PUBLISHED',
};

const HEADLINES = 'main section:not(#top) .h2, main section:not(#top) .display, main .page-hero .h1';

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export function useScrollFx(pathname: string) {
  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section'));

    // Ghost words sit in one fixed layer underneath the 3D canvas, so the objects pass in front of them.
    let layer = document.querySelector<HTMLElement>('.ghost-layer');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'ghost-layer';
      layer.setAttribute('aria-hidden', 'true');
      const canvas = document.querySelector('canvas.scene');
      canvas?.parentElement?.insertBefore(layer, canvas);
    }
    layer.textContent = '';
    const ghosts: { el: HTMLElement; host: HTMLElement }[] = [];
    for (const s of sections) {
      const word = GHOSTS[s.id];
      if (!word) continue;
      const el = document.createElement('span');
      el.className = 'ghost-word';
      el.textContent = word;
      el.style.opacity = '0';
      layer.append(el);
      ghosts.push({ el, host: s });
    }

    const heads = Array.from(document.querySelectorAll<HTMLElement>(HEADLINES));
    heads.forEach((h) => h.classList.add('fx-focus'));

    let raf = 0;
    let lastY = -1;
    let lastH = -1;
    const frame = () => {
      raf = requestAnimationFrame(frame);
      const y = window.scrollY;
      const vh = window.innerHeight;
      if (y === lastY && vh === lastH) return;
      lastY = y;
      lastH = vh;

      for (const s of sections) {
        const r = s.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        const e = still ? 1 : smooth(vh, vh * 0.3, r.top);
        const p = clamp01((vh - r.top) / (r.height + vh));
        s.style.setProperty('--e', e.toFixed(4));
        s.style.setProperty('--p', p.toFixed(4));
      }

      for (const g of ghosts) {
        const r = g.host.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) {
          g.el.style.opacity = '0';
          continue;
        }
        const p = clamp01((vh - r.top) / (r.height + vh));
        const w = smooth(0.08, 0.3, p) * (1 - smooth(0.72, 0.92, p));
        g.el.style.opacity = w.toFixed(3);
        if (!still) g.el.style.transform = `translate3d(${((0.5 - p) * 34).toFixed(2)}vw, 0, 0)`;
      }

      for (const h of heads) {
        const r = h.getBoundingClientRect();
        if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
        // comes into focus between 92% and 58% of the screen, and stays sharp from then on
        const w = still ? 1 : smooth(vh * 0.92, vh * 0.58, r.top);
        h.style.setProperty('--w', w.toFixed(3));
      }
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => (lastH = -1);
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [pathname]);
}
