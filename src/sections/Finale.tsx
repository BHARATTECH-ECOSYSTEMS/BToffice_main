import { useRef, useLayoutEffect, type RefObject } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import { Lines, Fade, Arrow } from '../components/Reveal';
import { EMAIL } from '../content';
import type { Target } from '../gl/Engine';

const Nw = 1.38;

function getOrbTarget(el: HTMLElement | null): Target {
  const s = window.innerWidth;
  const r = window.innerHeight;
  const l =
    (2 * (s / r < 1 ? 7 / Math.max(0.62, s / r) ** 0.55 : 7) * Math.tan((35 / 2) * (Math.PI / 180))) /
    r;
  const u = el?.getBoundingClientRect();
  if (!u) return { key: 'logo', pose: { x: 0, y: -99, s: 0.5 }, exact: true };
  const d = Math.min(u.width, u.height) * 0.4;
  const p = (u.left + u.width / 2 - s / 2) * l;
  const h = (r / 2 - (u.top + u.height / 2)) * l;
  return { key: 'logo', pose: { x: p, y: h, s: (d * l) / Nw }, exact: true, follow: 16 };
}

/** Section 12: What comes next - The next era of intelligence begins here */
export function Finale() {
  const sectionRef = useRef<HTMLElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    footerRef.current = document.querySelector('footer.footer');
  }, []);

  const getTarget = () => getOrbTarget(orbRef.current);

  useFormation(sectionRef, getTarget);
  useFormation(footerRef as unknown as RefObject<HTMLElement>, getTarget);

  return (
    <section
      id="next"
      ref={sectionRef}
      className="section finale"
      data-room="violet"
      data-room2="tango"
      data-chapter="Next era"
    >
      <div className="wrap finale-grid">
        <div className="finale-head">
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

        <div className="finale-orb" ref={orbRef} aria-hidden="true">
          <span className="orb-glow" />
          <span className="orb-ring orb-ring--a" />
          <span className="orb-ring orb-ring--b" />
          <span className="orb-ring orb-ring--c" />
        </div>
      </div>
    </section>
  );
}
