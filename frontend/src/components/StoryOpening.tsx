import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { DOMAINS } from '../content';
import { formOnScreen } from '../gl/Studio';
import { isCompact } from '../gl/Scene';

/**
 * The home page's opening, played once per visit before the first headline settles (about five seconds):
 *   0.0s  one point of light where the logo will be       — "Every intelligence starts with a memory."
 *   1.3s  the six domains arrive and wire into it          — "Connect it to everything it touches."
 *   2.9s  they fold in, and the glass logo grows from it   — "Then let it keep learning."
 *   4.4s  the hero headline, copy and actions rise in; from here the page is the scroll film as before.
 * The chips, lines and captions are DOM and SVG so the type stays crisp; the logo is the Studio's own form,
 * driven through `onReveal`. Any wheel, touch or key press hurries it to the end instead of making anyone wait.
 */

const CHIPS = DOMAINS.map((d) => d.name.replace(/ Intelligence$/, ''));
const CAPTIONS: [string, string, string][] = [
  ['Every intelligence starts with a ', 'memory', '.'],
  ['Connect it to ', 'everything', ' it touches.'],
  ['Then let it keep ', 'learning', '.'],
];
const SEEN = 'bt-opening';
const SVG = 'http://www.w3.org/2000/svg';

// Decided once per page load, so React's development double-mount doesn't spend the visit's only play.
let plays: boolean | null = null;
function shouldPlay() {
  if (plays !== null) return plays;
  plays = false;
  // arriving mid-page (a restored scroll, a link to a section) or asking for less motion: start at rest.
  // The router keeps the page in the hash, so "#/" is still the top of the home page.
  const route = location.hash.replace(/^#/, '');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.scrollY > 8 || (route && route !== '/')) return plays;
  try {
    if (sessionStorage.getItem(SEEN)) return plays;
    sessionStorage.setItem(SEEN, '1');
  } catch {
    // storage blocked: still play; it will simply play again on the next load
  }
  plays = true;
  return plays;
}

interface Props {
  /** The first beat's article: its headline, copy and actions are what the opening hands over to. */
  hero: () => HTMLElement | null;
  /** Grow the logo from its origin point (0) to full size (1), and draw its threads in. */
  onReveal: (grow: number, draw: number) => void;
}

/**
 * Whether the opening film is playing on this visit. Read-only: it never makes the once-a-session decision itself,
 * so asking from another page can't use up the visit's play. It is decided in a layout effect, so by the time other
 * components' effects run on the home page, it is settled.
 */
export const openingPlaying = () => plays === true;

export function StoryOpening({ hero, onReveal }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!shouldPlay()) {
      setDone(true);
      return;
    }

    const W = el.clientWidth;
    const H = el.clientHeight;
    const form = formOnScreen(W, H, isCompact());
    const { x: cx, y: cy } = form;
    // a ring round the form, kept inside the frame (a chip reaches ~70px either side of its point) and clear of the nav
    const rx = Math.min(form.r * 1.6, W - cx - 96, cx - 96);
    const ry = Math.min(form.r * 1.28, cy - 96);

    const net = el.querySelector<SVGSVGElement>('.opening-net')!;
    net.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const path = (d: string, cls: string) => {
      const p = document.createElementNS(SVG, 'path');
      p.setAttribute('d', d);
      p.setAttribute('class', cls);
      p.setAttribute('pathLength', '1');
      net.append(p);
      return p;
    };

    const chips = gsap.utils.toArray<HTMLElement>('.opening-chip', el);
    const pts = chips.map((chip, i) => {
      const a = ((-60 + (360 / chips.length) * i) * Math.PI) / 180;
      const x = cx + Math.cos(a) * rx;
      const y = cy + Math.sin(a) * ry;
      chip.style.left = `${cx}px`;
      chip.style.top = `${cy}px`;
      return { x, y };
    });
    // each domain bends gently into the centre; neighbours are tied by fainter arcs that sag towards it
    const edges = pts.map((p) => {
      const mx = (cx + p.x) / 2 + (p.y - cy) * 0.2;
      const my = (cy + p.y) / 2 - (p.x - cx) * 0.2;
      return `M${p.x},${p.y} Q${mx},${my} ${cx},${cy}`;
    });
    const links = pts.map((p, i) => {
      const q = pts[(i + 1) % pts.length];
      return path(`M${p.x},${p.y} Q${cx + (p.x + q.x - 2 * cx) * 0.3},${cy + (p.y + q.y - 2 * cy) * 0.3} ${q.x},${q.y}`, 'opening-edge is-faint');
    });
    const lines = edges.map((d) => path(d, 'opening-edge'));
    const pulses = edges.map((d) => path(d, 'opening-pulse'));

    const spark = el.querySelector<HTMLElement>('.opening-spark')!;
    spark.style.left = `${cx}px`;
    spark.style.top = `${cy}px`;
    const captions = gsap.utils.toArray<HTMLElement>('.opening-caption', el);

    const art = hero();
    const heroLines = art ? gsap.utils.toArray<HTMLElement>('.beat-line > span', art) : [];
    const heroRest = art ? gsap.utils.toArray<HTMLElement>('.beat-body, .beat-actions', art) : [];
    const logo = { grow: 0, draw: 0 };
    const sync = () => onReveal(logo.grow, logo.draw);
    sync();

    const ctx = gsap.context(() => {
      gsap.set(chips, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
      gsap.set([...lines, ...links], { strokeDasharray: '1 1', strokeDashoffset: 1 });
      gsap.set(pulses, { strokeDasharray: '0.12 1.2', strokeDashoffset: 0.12, autoAlpha: 0 });
      gsap.set(spark, { xPercent: -50, yPercent: -50, scale: 0.5, autoAlpha: 0 });
      gsap.set(captions, { autoAlpha: 0, y: 26 });

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out' },
        onComplete: () => {
          plays = false;
          // the component stays mounted (it only stops rendering), so its listeners go now, not on unmount:
          // left attached, the scroll one kept reading the page position on every scroll of the visit
          detach();
          setDone(true);
        },
      });
      const captionIn = (i: number) => gsap.to(captions[i], { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out' });
      const captionOut = (i: number) => gsap.to(captions[i], { autoAlpha: 0, y: -18, duration: 0.3, ease: 'power2.in' });

      // 1 · the spark
      tl.addLabel('spark', 0.15)
        .to(spark, { scale: 1, autoAlpha: 1, duration: 0.8, ease: 'back.out(2.2)' }, 'spark')
        .add(captionIn(0), 'spark+=0.1');

      // 2 · the domains arrive and wire in, then light runs along every line into the centre
      tl.addLabel('connect', 1.3)
        .add(captionOut(0), 'connect')
        .add(captionIn(1), 'connect+=0.36')
        .fromTo(
          chips,
          { x: (i) => (pts[i].x - cx) * 1.14, y: (i) => (pts[i].y - cy) * 1.14, scale: 0.7 },
          { x: (i) => pts[i].x - cx, y: (i) => pts[i].y - cy, scale: 1, autoAlpha: 1, duration: 0.7, stagger: 0.07 },
          'connect',
        )
        .to(lines, { strokeDashoffset: 0, duration: 0.75, stagger: 0.07, ease: 'power2.inOut' }, 'connect+=0.15')
        .to(links, { strokeDashoffset: 0, duration: 0.9, stagger: 0.05, ease: 'power2.inOut' }, 'connect+=0.55')
        .to(spark, { scale: 1.35, duration: 0.5, ease: 'power2.out' }, 'connect+=0.9')
        .to(pulses, { autoAlpha: 1, duration: 0.15, stagger: 0.06 }, 'connect+=0.85')
        .to(pulses, { strokeDashoffset: -1, duration: 0.85, stagger: 0.06, ease: 'power1.in' }, 'connect+=0.85');

      // 3 · everything folds into the point, and the logo grows out of it
      tl.addLabel('form', 2.9)
        .add(captionOut(1), 'form')
        .add(captionIn(2), 'form+=0.36')
        .to(chips, { x: 0, y: 0, scale: 0.35, autoAlpha: 0, duration: 0.6, stagger: 0.03, ease: 'power3.in' }, 'form')
        .to([...lines, ...links], { strokeDashoffset: -1, duration: 0.6, stagger: 0.02, ease: 'power2.in' }, 'form')
        .to(spark, { scale: 2.6, duration: 0.45, ease: 'power2.in' }, 'form+=0.2')
        .to(logo, { grow: 1, duration: 1.4, ease: 'back.out(1.35)', onUpdate: sync }, 'form+=0.45')
        .to(logo, { draw: 1, duration: 1.4, ease: 'power2.inOut', onUpdate: sync }, 'form+=0.85')
        .to(spark, { scale: 0.4, autoAlpha: 0, duration: 0.7, ease: 'power2.out' }, 'form+=0.6');

      // 4 · the headline takes over
      tl.addLabel('rest', 4.4)
        .add(captionOut(2), 'rest-=0.15')
        .from(heroLines, { yPercent: 110, duration: 1, stagger: 0.09, ease: 'expo.out', clearProps: 'transform' }, 'rest')
        .from(heroRest, { autoAlpha: 0, y: 20, duration: 0.8, stagger: 0.12, clearProps: 'transform,opacity,visibility' }, 'rest+=0.3');

      const hurry = () => tl.timeScale(5);
      // The page can also move without a wheel, touch or key (a scrollbar drag, autoscroll, a jump link).
      // The opening is drawn over the first screen, so once the page has really moved it ends at once;
      // left running it played on over the next headlines.
      const finish = () => {
        if (window.scrollY > 40) tl.progress(1);
      };
      const opts = { passive: true, once: true } as const;
      window.addEventListener('wheel', hurry, opts);
      window.addEventListener('touchstart', hurry, opts);
      window.addEventListener('keydown', hurry, opts);
      window.addEventListener('scroll', finish, { passive: true });
      // opened in a background tab: hold the opening until someone can see it
      const onVisible = () => !document.hidden && tl.resume();
      if (document.hidden) tl.pause();
      document.addEventListener('visibilitychange', onVisible);

      const detach = () => {
        window.removeEventListener('wheel', hurry);
        window.removeEventListener('touchstart', hurry);
        window.removeEventListener('keydown', hurry);
        window.removeEventListener('scroll', finish);
        document.removeEventListener('visibilitychange', onVisible);
      };
      return detach;
    }, el);

    return () => {
      ctx.revert();
      net.replaceChildren();
      // left part-way (another route, or React's development remount): never leave the logo half-grown
      onReveal(1, 1);
    };
  }, [hero, onReveal]);

  if (done) return null;
  return (
    <div ref={root} className="opening" aria-hidden="true">
      <svg className="opening-net" preserveAspectRatio="none" />
      <span className="opening-spark" />
      {CHIPS.map((name) => (
        <span key={name} className="opening-chip">
          {name}
        </span>
      ))}
      <div className="opening-copy">
        {CAPTIONS.map(([a, em, b]) => (
          <p key={em} className="opening-caption">
            {a}
            <em>{em}</em>
            {b}
          </p>
        ))}
      </div>
    </div>
  );
}
