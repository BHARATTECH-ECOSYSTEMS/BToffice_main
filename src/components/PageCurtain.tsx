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

const FULL = 'inset(0px 0px 0px 0px round 0px)';
const EASE = 'cubic-bezier(.76,0,.24,1)';

/** The nav capsule as a clip-path: the curtain's smallest shape. A small pill at the top if the bar is out of view. */
function barClip() {
  const b = document.querySelector('.nav-inner');
  const r = b?.getBoundingClientRect();
  if (!r || r.bottom <= 0) return 'inset(12px calc(50% - 70px) calc(100% - 72px) calc(50% - 70px) round 999px)';
  return `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round 999px)`;
}

// a small loader: five chevrons of dots, lit in a wave
const MARCH: { x: number; y: number }[] = [];
for (let k = 0; k < 5; k++)
  for (let r = 0; r < 9; r++) {
    const x = 4 - Math.abs(r - 4);
    for (const dx of [0, 1]) MARCH.push({ x: k * 9 + x + dx, y: r });
  }

/**
 * The curtain between pages (after the Demaze site): following a link to another page, frosted violet glass unfolds
 * out of the nav capsule with that page's name; the next page mounts under it, and it folds back into the capsule.
 * Links into a section of the home page (data-section) and anything opened in a new tab are left alone.
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
    const inner = el.querySelector('.curtain-inner') as HTMLElement;

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || busy.current) return;
      const a = (e.target as HTMLElement).closest?.('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.section !== undefined) return;
      const href = a.getAttribute('href') ?? '';
      if (!href.startsWith('#/')) return;
      const to = href.slice(1).split('?')[0] || '/';
      if (to === pathRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      busy.current = true;
      if (label.current) label.current.textContent = labelOf(to);
      el.classList.add('is-open');
      const close = el.animate([{ clipPath: barClip(), opacity: 0 }, { clipPath: barClip(), opacity: 1, offset: 0.12 }, { clipPath: FULL, opacity: 1 }], {
        duration: 700,
        easing: EASE,
        fill: 'forwards',
      });
      inner.animate([{ transform: 'scale(0.92) translateY(-30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
        duration: 620,
        delay: 180,
        easing: 'cubic-bezier(.22,1,.36,1)',
        fill: 'both',
      });
      close.onfinish = () => {
        navigate(to);
        // the next page mounts under the glass, then the glass folds back into the capsule
        window.setTimeout(() => {
          const open = el.animate([{ clipPath: FULL, opacity: 1 }, { clipPath: barClip(), opacity: 1, offset: 0.85 }, { clipPath: barClip(), opacity: 0 }], {
            duration: 820,
            easing: EASE,
            fill: 'both',
          });
          open.onfinish = () => {
            el.classList.remove('is-open');
            el.getAnimations().concat(inner.getAnimations()).forEach((x) => x.cancel());
            busy.current = false;
          };
        }, 260);
      };
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  return (
    <div ref={ref} className="curtain" aria-hidden="true">
      <div className="curtain-inner">
        <span className="curtain-kicker">
          <LogoMark size={16} /> Bharattech Origin · Next
        </span>
        <span ref={label} className="curtain-label" />
        <span className="curtain-march">
          {MARCH.map((d, i) => (
            <i key={i} style={{ '--x': d.x, '--y': d.y } as React.CSSProperties} />
          ))}
        </span>
      </div>
    </div>
  );
}
