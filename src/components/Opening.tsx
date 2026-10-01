import { useEffect, useRef } from 'react';
import { LogoMark } from './LogoMark';
import { threadPaths } from '../gl/threads';
import { uncover } from '../opening';

const PATHS = threadPaths();
// The threads are drawn ZOOM times the size of the mark, then shrink onto it (scaling down keeps them crisp).
const ZOOM = 6;

/**
 * The opening, on a visitor's first page of a visit: the mark's three threads draw themselves in from the dark and
 * meet at the origin, then shrink onto the sphere as it blooms around them; the name rises beside it; then the sheet
 * folds into the nav capsule while the lockup flies to its place there. A click, key, wheel or touch skips straight
 * to the fold. Inline SVG and text only: nothing extra to download.
 */
export function Opening() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    const el = ref.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || reduced || !root.classList.contains('intro-on') || !el.animate) {
      root.classList.remove('intro-on');
      uncover();
      return;
    }
    // Mounted and in charge: the page-load safety nets (index.html's timer, the CSS bail-out) stand down for our own.
    clearTimeout((window as { __introBail?: number }).__introBail);
    el.style.animation = 'none';
    const $ = <T extends Element = HTMLElement>(s: string) => el.querySelector(s) as T;
    const E = 'cubic-bezier(0.16, 1, 0.3, 1)';
    const IO = 'cubic-bezier(0.65, 0, 0.35, 1)';
    const timers: number[] = [];
    const skipOn = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    let folded = false;
    let gone = false;

    const end = () => {
      if (gone) return;
      gone = true;
      timers.forEach(clearTimeout);
      root.classList.remove('intro-on');
      el.hidden = true;
      uncover();
    };

    const fold = (fast: boolean) => {
      if (folded) return;
      folded = true;
      skipOn.forEach((ev) => removeEventListener(ev, skip));
      try {
        if (fast) el.getAnimations({ subtree: true }).forEach((a) => a.finish());
        const bar = document.querySelector('.nav-inner') as HTMLElement;
        const navMark = document.querySelector('.nav .brand svg') as SVGElement;
        const lock = $('.opening-lock');
        const mark = $('.opening-mark');
        const D = fast ? 480 : 900;
        [$('.opening-tag'), $('.opening-threads')].forEach((x) =>
          x.animate([{ opacity: getComputedStyle(x).opacity }, { opacity: 0 }], { duration: D * 0.45, easing: 'ease', fill: 'forwards' }),
        );
        const L = lock.getBoundingClientRect();
        const c = mark.getBoundingClientRect();
        const mk = navMark.getBoundingClientRect();
        const r = bar.getBoundingClientRect();
        const cx = c.left + c.width / 2;
        const cy = c.top + c.height / 2;
        lock.style.transformOrigin = `${cx - L.left}px ${cy - L.top}px`;
        lock.animate(
          [{ transform: 'none' }, { transform: `translate(${mk.left + mk.width / 2 - cx}px, ${mk.top + mk.height / 2 - cy}px) scale(${mk.width / c.width})` }],
          { duration: D, easing: IO, fill: 'forwards' },
        );
        el.animate(
          [
            { clipPath: 'inset(0px 0px 0px 0px round 0px)' },
            { clipPath: `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 999px)` },
          ],
          { duration: D, easing: IO, fill: 'forwards' },
        );
        el.animate([{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: D + 240, fill: 'forwards' }).onfinish = end;
        timers.push(window.setTimeout(uncover, D * 0.35), window.setTimeout(end, D + 800));
      } catch (e) {
        console.warn(e);
        end();
      }
    };
    const skip = () => fold(true);
    skipOn.forEach((ev) => addEventListener(ev, skip, { passive: true }));

    try {
      // 1. the threads draw in from the dark and meet at the origin
      el.querySelectorAll<SVGPathElement>('.opening-threads path').forEach((p, i) =>
        p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 1050, delay: 120 + i * 110, easing: IO, fill: 'forwards' }),
      );
      $('.opening-spark').animate(
        [{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.6)', offset: 0.5 }, { opacity: 0, transform: 'scale(3.2)' }],
        { duration: 700, delay: 1150, easing: 'ease-out', fill: 'forwards' },
      );
      // 2. they shrink onto the mark (thickening to its own thread weight) as the sphere blooms around them
      $('.opening-threads').animate([{ transform: 'none' }, { transform: `scale(${1 / ZOOM})` }], { duration: 850, delay: 1300, easing: IO, fill: 'forwards' });
      // ...and are trimmed to the disk as they land (its radius is 1/12 of the drawing), so they become the mark's own
      $('.opening-threads').animate([{ clipPath: 'circle(75% at 50% 50%)' }, { clipPath: `circle(${100 / (2 * ZOOM)}% at 50% 50%)` }], {
        duration: 850,
        delay: 1300,
        easing: 'cubic-bezier(0.5, 0, 0.75, 0)',
        fill: 'forwards',
      });
      $('.opening-threads g').animate([{ strokeWidth: 0.0085, stroke: getComputedStyle(el).color }, { strokeWidth: 0.17, stroke: '#fff' }], { duration: 850, delay: 1300, easing: IO, fill: 'forwards' });
      $('.opening-threads').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: 2150, fill: 'forwards' });
      $('.opening-orb').animate([{ opacity: 0, transform: 'scale(.35)' }, { opacity: 1, transform: 'none' }], {
        duration: 620,
        delay: 1680,
        easing: 'cubic-bezier(.34,1.56,.64,1)',
        fill: 'forwards',
      });
      // 3. the name rises beside it
      el.querySelectorAll<HTMLElement>('.opening-word > span > span').forEach((s, i) =>
        s.animate([{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 700, delay: 1900 + i * 40, easing: E, fill: 'forwards' }),
      );
      $('.opening-small').animate([{ opacity: 0, letterSpacing: '0.9em' }, { opacity: 1, letterSpacing: '0.42em' }], {
        duration: 800,
        delay: 2150,
        easing: E,
        fill: 'forwards',
      });
      $('.opening-tag').animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 550, delay: 2300, easing: E, fill: 'forwards' });
      // 4. the sheet folds into the nav
      timers.push(window.setTimeout(() => fold(false), 3150), window.setTimeout(end, 7000));
    } catch (e) {
      console.warn(e);
      end();
    }

    return () => {
      skipOn.forEach((ev) => removeEventListener(ev, skip));
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div ref={ref} className="opening" aria-hidden="true">
      <div className="opening-lock">
        <span className="opening-mark">
          <span className="opening-orb">
            <LogoMark size={100} />
          </span>
          <svg className="opening-threads" viewBox="-1 -1 2 2">
            <g fill="none" stroke="var(--ink)" strokeWidth="0.0085" strokeLinecap="round" strokeLinejoin="round">
              {PATHS.map((d) => (
                <path key={d} d={d} pathLength={1} />
              ))}
            </g>
            <circle className="opening-spark" cx="0.42" cy="-0.37" r="0.02" />
          </svg>
        </span>
        <span className="opening-name">
          <strong className="opening-word">
            {[...'Bharattech'].map((ch, i) => (
              <span key={i}>
                <span>{ch}</span>
              </span>
            ))}
          </strong>
          <small className="opening-small">ORIGIN</small>
        </span>
      </div>
      <p className="opening-tag">Generative Intelligence Infrastructure</p>
    </div>
  );
}
