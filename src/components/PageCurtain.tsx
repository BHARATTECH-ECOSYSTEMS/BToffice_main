import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

type Play = (label: string, swap: () => void) => void;
let player: Play | null = null;

/** Runs the shared navigation transition before changing a route or home-page chapter. */
export function playCurtain(label: string, swap: () => void) {
  if (player) player(label, swap);
  else swap();
}

const EASE = 'cubic-bezier(.22,1,.36,1)';

/** A compact transition: light crosses the navigation while the next page settles in. */
export function PageCurtain() {
  const sweepRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  const busy = useRef(false);
  pathRef.current = pathname;

  useEffect(() => {
    const sweep = sweepRef.current;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const play: Play = (_label, swap) => {
      if (busy.current) return;
      if (!sweep?.animate || reducedMotion) {
        swap();
        return;
      }

      busy.current = true;
      sweep.classList.add('is-running');
      const outgoing = document.querySelector<HTMLElement>('.folio-main');
      const footer = document.querySelector<HTMLElement>('.footer');

      const sweepIn = sweep.animate(
        [
          { transform: 'translate3d(-104%, 0, 0)', opacity: 0 },
          { opacity: 0.88, offset: 0.18 },
          { transform: 'translate3d(0, 0, 0)', opacity: 0.82 },
        ],
        { duration: 360, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'forwards' },
      );

      const exitOptions: KeyframeAnimationOptions = { duration: 260, easing: 'ease-out', fill: 'forwards' };
      outgoing?.animate(
        [
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
          { opacity: 0.18, transform: 'translate3d(0, -8px, 0)' },
        ],
        exitOptions,
      );
      footer?.animate([{ opacity: 1 }, { opacity: 0.18 }], exitOptions);

      window.setTimeout(() => {
        swap();

        requestAnimationFrame(() => {
          const incoming = document.querySelector<HTMLElement>('.folio-main');
          incoming?.animate(
            [
              { opacity: 0, transform: 'translate3d(0, 18px, 0)' },
              { opacity: 1, transform: 'translate3d(0, 0, 0)' },
            ],
            { duration: 560, easing: EASE, fill: 'both' },
          );
          footer?.animate([{ opacity: 0.18 }, { opacity: 1 }], {
            duration: 420,
            easing: 'ease-out',
            fill: 'forwards',
          });

          sweepIn.finished.catch(() => undefined).finally(() => {
            const sweepOut = sweep.animate(
              [
                { transform: 'translate3d(0, 0, 0)', opacity: 0.82 },
                { transform: 'translate3d(104%, 0, 0)', opacity: 0 },
              ],
              { duration: 440, easing: EASE, fill: 'forwards' },
            );
            sweepOut.onfinish = () => {
              sweep.classList.remove('is-running');
              sweep.getAnimations().forEach((animation) => animation.cancel());
              busy.current = false;
            };
          });
        });
      }, 280);
    };

    player = play;

    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const anchor = (event.target as HTMLElement).closest?.('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download') || anchor.dataset.section !== undefined) return;
      const href = anchor.getAttribute('href') ?? '';
      if (!href.startsWith('#/')) return;

      const destination = href.slice(1).split('?')[0] || '/';
      if (destination === pathRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      play('', () => navigate(destination));
    };

    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      player = null;
    };
  }, [navigate]);

  return <div ref={sweepRef} className="route-sweep" aria-hidden="true" />;
}
