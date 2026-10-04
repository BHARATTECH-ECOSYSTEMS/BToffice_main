import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { LogoMark } from './LogoMark';

const LABELS: Record<string, string> = {
  '/': 'Home',
  '/about': 'About',
  '/research': 'Research',
  '/careers': 'Careers',
  '/publications': 'Publications',
  '/blog': 'Publications',
  '/contact': 'Contact',
  '/privacy': 'Privacy',
  '/terms': 'Terms',
};
const labelOf = (path: string) => LABELS[path] ?? (path.startsWith('/publications/') || path.startsWith('/blog/') ? 'Publication' : 'Origin');

type Play = (label: string, swap: () => void) => void;
let player: Play | null = null;

/**
 * Plays the curtain: the sheet rises over the page, `swap` runs while it covers everything (navigate, jump to a
 * section), then the sheet carries on up and away. Without motion (or before the curtain mounts) it just swaps.
 */
export function playCurtain(label: string, swap: () => void) {
  if (player) player(label, swap);
  else swap();
}

const IN = 'cubic-bezier(.7,0,.25,1)';
const OUT = 'cubic-bezier(.65,0,.2,1)';

/**
 * The curtain between pages and chapters. A deep violet sheet with rounded top corners rises from the foot of the
 * screen; the destination's name rises out of its own mask over the Origin mark while a hairline draws across; then
 * the whole sheet keeps rising, its lower edge rounding as it goes, and uncovers the destination underneath.
 */
export function PageCurtain() {
  const ref = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const busy = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !el.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const word = el.querySelector('.curtain-word') as HTMLElement;
    const kicker = el.querySelector('.curtain-kicker') as HTMLElement;
    const line = el.querySelector('.curtain-line') as HTMLElement;
    const mark = el.querySelector('.curtain-mark') as HTMLElement;

    const play: Play = (text, swap) => {
      if (busy.current) return;
      busy.current = true;
      if (label.current) label.current.textContent = text;
      el.classList.add('is-open');
      // transform only (the sheet's rounded edges are part of its shape), so it moves on the compositor
      const cover = el.animate(
        [{ transform: 'translate3d(0, calc(100vh + 64px), 0)' }, { transform: 'translate3d(0, 0, 0)' }],
        { duration: 620, easing: IN, fill: 'forwards' },
      );
      word.animate([{ transform: 'translate3d(0, 110%, 0)' }, { transform: 'none' }], { duration: 700, delay: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      kicker.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 320, easing: 'ease-out', fill: 'both' });
      mark.animate([{ opacity: 0, transform: 'scale(0.6) rotate(-40deg)' }, { opacity: 0.16, transform: 'none' }], { duration: 900, delay: 120, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' });
      line.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 760, delay: 280, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' });
      cover.onfinish = () => {
        swap();
        // let the destination mount and settle under the sheet, then lift it away
        window.setTimeout(() => {
          word.animate([{ transform: 'none', opacity: 1 }, { transform: 'translate3d(0, -40%, 0)', opacity: 0 }], { duration: 420, easing: OUT, fill: 'forwards' });
          kicker.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
          const lift = el.animate(
            [{ transform: 'translate3d(0, 0, 0)' }, { transform: 'translate3d(0, calc(-100vh - 64px), 0)' }],
            { duration: 720, delay: 120, easing: OUT, fill: 'forwards' },
          );
          lift.onfinish = () => {
            el.classList.remove('is-open');
            el.getAnimations({ subtree: true }).forEach((a) => a.cancel());
            busy.current = false;
          };
        }, 380);
      };
    };
    player = play;

    // Links to another page play it on the way. Section links (data-section) call playCurtain themselves.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.section !== undefined) return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('#/')) return;
      const to = href.slice(1).split('?')[0] || '/';
      if (to === pathRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      play(labelOf(to), () => navigate(to));
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      player = null;
    };
  }, [navigate]);

  return (
    <div ref={ref} className="curtain" aria-hidden="true">
      <span className="curtain-mark">
        <LogoMark size={720} />
      </span>
      <div className="curtain-inner">
        <span className="curtain-kicker">
          <LogoMark size={16} /> Bharattech Origin
        </span>
        <span className="curtain-mask">
          <span className="curtain-word" ref={label} />
        </span>
        <i className="curtain-line" />
      </div>
    </div>
  );
}
