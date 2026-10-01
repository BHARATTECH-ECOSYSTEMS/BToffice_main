import { useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import type { Target } from '../gl/Engine';
import { EMAIL } from '../content';
import { Arrow, Fade, Lines, Kicker } from '../components/Reveal';

/** Half-height of the logo formation in its own units (see EXTENT in Scene). */
const LOGO_R = 1.38;

/**
 * The mark sits in the orb frame on the right of the finale and scrolls with it, so it rises into view
 * beside the invitation. Its size follows the frame so it always fits.
 */
function markTarget(orb: HTMLElement | null): Target {
  const w = window.innerWidth;
  const h = window.innerHeight;
  // world units per px at z = 0; mirrors the camera set-up in Engine
  const z = w / h < 1 ? 7 / Math.max(0.62, w / h) ** 0.55 : 7;
  const perPx = (2 * z * Math.tan((35 / 2) * (Math.PI / 180))) / h;
  const r = orb?.getBoundingClientRect();
  if (!r) return { key: 'logo', pose: { x: 0, y: -99, s: 0.5 }, exact: true };
  const rPx = Math.min(r.width, r.height) * 0.4;
  const x = (r.left + r.width / 2 - w / 2) * perPx;
  const y = (h / 2 - (r.top + r.height / 2)) * perPx;
  return { key: 'logo', pose: { x, y, s: (rPx * perPx) / LOGO_R }, exact: true, follow: 16 };
}

/** Everything returns to the mark: the invitation on the left, the planet rising on the right. */
export function Finale() {
  const ref = useRef<HTMLElement>(null);
  const orb = useRef<HTMLDivElement>(null);
  // The footer keeps the mark in charge once it covers the middle of the screen.
  const footer = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    footer.current = document.querySelector<HTMLElement>('footer.footer');
  }, []);
  const target = () => markTarget(orb.current);
  useFormation(ref, target);
  useFormation(footer, target);
  return (
    <section id="next" ref={ref} className="section finale" data-room="violet" data-room2="tango" data-chapter="Next era">
      <div className="wrap finale-grid">
        <div className="finale-head">
          <Kicker index="12">What comes next</Kicker>
          <Lines className="display" lines={['The next era of', 'intelligence', 'begins here.']} />
        </div>
        <Fade className="finale-cta glass" delay={160}>
          <p className="footer-kicker mono">
            <span className="live-dot" aria-hidden="true" /> Start a conversation
          </p>
          <h2 className="footer-title">
            Build what comes next <span className="accent">with us.</span>
          </h2>
          <div className="finale-cta-actions">
            <Link to="/contact" className="btn btn-solid">
              Get in touch <Arrow size={13} />
            </Link>
            <a className="footer-mail" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
          </div>
        </Fade>
        <div className="finale-orb" ref={orb} aria-hidden="true">
          <span className="orb-glow" />
          <span className="orb-ring orb-ring--a" />
          <span className="orb-ring orb-ring--b" />
          <span className="orb-ring orb-ring--c" />
        </div>
      </div>
    </section>
  );
}
