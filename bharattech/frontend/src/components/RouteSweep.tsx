import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import '../styles/route-sweep.css';

/** How long the old page fades before the new one mounts. Every click waits this long, so it stays short. */
const LEAVE_MS = 120;

/** Keep the transition inside the navigation, with the page changing beneath it. */
export function RouteSweep() {
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const pathname = useRef(location.pathname);
  pathname.current = location.pathname;
  const navigate = useNavigate();
  useEffect(() => {
    const sweep = ref.current;
    if (!sweep) return;
    let running = false;
    let pending: { route: string; state?: { scrollTo: string } } | null = null;
    let timer = 0;
    let frame = 0;
    const animations = new Set<Animation>();
    const animate = (element: Element | null, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      if (!element) return;
      const animation = element.animate(frames, options);
      animations.add(animation);
      return animation;
    };
    const clear = () => {
      animations.forEach(animation => animation.cancel());
      animations.clear();
      sweep.classList.remove('is-running');
      running = false;
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>('a');
      const capabilities = target?.closest('.nav-links > button, .nav-sheet li > button');
      if (!link && !capabilities) return;
      if (link && (link.target === '_blank' || link.hasAttribute('download'))) return;
      const href = link?.getAttribute('href') ?? (capabilities ? '#/' : '');
      if (!href.startsWith('#/')) return;
      const route = href.slice(1);
      if (route.split('?')[0] === pathname.current) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !sweep.animate) return;
      event.preventDefault();
      event.stopPropagation();
      const destination = { route, state: capabilities ? { scrollTo: 'capabilities' } : undefined };
      if (running) {
        // A click mid-transition retargets it rather than being dropped.
        if (pending) pending = destination;
        else navigate(destination.route, destination.state && { state: destination.state });
        return;
      }
      running = true;
      pending = destination;
      const nav = document.querySelector('.nav-bar');
      if (nav) {
        const rect = nav.getBoundingClientRect();
        Object.assign(sweep.style, { top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` });
      }
      sweep.classList.add('is-running');
      // the site's easing tokens (the Web Animations API cannot read CSS variables itself)
      const root = getComputedStyle(document.documentElement);
      const ease = root.getPropertyValue('--ease').trim() || 'ease-out';
      const easeIo = root.getPropertyValue('--ease-io').trim() || 'ease-in-out';
      // In and out as one animation, so the compositor plays it through even while the next page is
      // mounting on the main thread; chaining the exit from JS left the sweep parked over the nav.
      const sweepIn = 360;
      const sweepOut = 440;
      const total = sweepIn + 40 + sweepOut;
      const sweepDone = animate(sweep, [
        { transform: 'translate3d(-104%,0,0)', opacity: 0, easing: easeIo },
        { opacity: .88, offset: (sweepIn * .18) / total },
        { transform: 'translate3d(0,0,0)', opacity: .82, offset: sweepIn / total },
        { transform: 'translate3d(0,0,0)', opacity: .82, offset: (sweepIn + 40) / total, easing: ease },
        { transform: 'translate3d(104%,0,0)', opacity: 0 },
      ], { duration: total, fill: 'forwards' })?.finished;
      animate(document.querySelector('#main'), [{ opacity: 1, transform: 'translate3d(0,0,0)' }, { opacity: .18, transform: 'translate3d(0,-8px,0)' }], { duration: LEAVE_MS, easing: 'ease-out', fill: 'forwards' });
      const footer = document.querySelector('.footer');
      animate(footer, [{ opacity: 1 }, { opacity: .18 }], { duration: LEAVE_MS, easing: 'ease-out', fill: 'forwards' });
      timer = window.setTimeout(() => {
        const { route: to, state } = pending!;
        pending = null;
        navigate(to, state && { state });
        frame = requestAnimationFrame(() => {
          const pageIn = animate(document.querySelector('#main'), [{ opacity: 0, transform: 'translate3d(0,18px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }], { duration: 560, easing: ease, fill: 'both' });
          animate(footer, [{ opacity: .18 }, { opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'forwards' });
          Promise.all([sweepDone, pageIn?.finished]).then(clear, () => {});
        });
      }, LEAVE_MS);
    };
    document.addEventListener('click', click, true);
    return () => {
      document.removeEventListener('click', click, true);
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      clear();
    };
  }, [navigate]);
  return <div ref={ref} className="route-sweep" aria-hidden="true" />;
}
