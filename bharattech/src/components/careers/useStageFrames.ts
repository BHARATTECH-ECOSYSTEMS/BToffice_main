import { useEffect, useRef, type RefObject } from 'react';
import { pageScroll, trackBox } from '../trackBox';
import { useScene } from '../../gl/Scene';

/** One frame of a Careers scene: the time, and the progress (0…1) through the section's pinned stretch. */
type StageFrame = (now: number, progress: number) => void;

/**
 * Drives a Careers scene while its section is on screen. Frames come from the site's loop when there is one, right
 * after the smooth scroll has moved the page, so the scene and the page never disagree by a frame (without WebGL
 * the site has no loop, so this runs its own). Progress is measured from cached boxes (trackBox) and the shared
 * scroll position, never from layout reads per frame. With a `pinRef`, progress runs over the stretch the pin stays
 * stuck for; without one it stays 0.
 *
 * The scene mounts itself and puts its frame function in the returned ref; null means nothing to draw.
 */
export function useStageFrames(sectionRef: RefObject<HTMLElement>, pinRef?: RefObject<HTMLElement>) {
  const { engine } = useScene();
  const frame = useRef<StageFrame | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let pinH = 0;
    const { box, release } = trackBox(section, () => {
      pinH = pinRef?.current?.offsetHeight ?? 0;
    });
    let onScreen = true;
    let visible = true;
    const tick = () => {
      if (!visible || !frame.current) return;
      const run = box.height - pinH;
      const p = pinRef && run > 1 ? Math.min(1, Math.max(0, (pageScroll() - box.top) / run)) : 0;
      frame.current(performance.now(), p);
    };
    let raf = 0;
    const own = () => {
      tick();
      raf = requestAnimationFrame(own);
    };
    const off = engine ? engine.onFrame(tick) : ((raf = requestAnimationFrame(own)), () => cancelAnimationFrame(raf));
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      visible = onScreen && !document.hidden;
    });
    io.observe(section);
    const onVisibility = () => (visible = onScreen && !document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      off();
      io.disconnect();
      release();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [sectionRef, pinRef, engine]);

  return frame;
}

/** The page position at which a pinned section shows `progress`, for jumps. */
export function pinnedScrollTop(section: HTMLElement, pin: HTMLElement, progress: number) {
  const top = section.getBoundingClientRect().top + window.scrollY;
  return top + (section.offsetHeight - pin.offsetHeight) * progress;
}

/** One host element per card: three.js moves it in 3D and React renders the card into it through a portal. */
export function useHosts(count: number, className: string) {
  const hosts = useRef<HTMLElement[] | null>(null);
  if (!hosts.current || hosts.current.length !== count) {
    hosts.current = Array.from({ length: count }, () => {
      const el = document.createElement('div');
      el.className = className;
      return el;
    });
  }
  return hosts.current;
}
