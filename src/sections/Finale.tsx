import { useRef } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import { Lines, Fade, Arrow } from '../components/Reveal';
import { EMAIL } from '../content';

/** Section 12: What comes next - The next era of intelligence begins here */
export function Finale() {
  const sectionRef = useRef<HTMLElement>(null);

  // Keep the continuous ambient wave field without the 3D logo sphere
  useFormation(sectionRef, { key: 'field', params: { alpha: 0 } });

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
          <Lines className="display finale-display" lines={['The next era of intelligence', 'begins here.']} />
          <Fade className="finale-lede" delay={80}>
            <p>
              We are engineering India’s foundational operating system for intelligence uniting persistent neural
              memory, multi-turn reasoning, and sovereign infrastructure for researchers, institutions, and enterprises
              worldwide.
            </p>
          </Fade>
        </div>

        <Fade className="finale-cta glass" delay={160}>
          <div className="finale-cta-content">
            <p className="footer-kicker mono">
              <span className="live-dot" aria-hidden="true" />
              <span>Start a conversation</span>
            </p>
            <h2 className="footer-title">
              Build what comes next <span className="accent">with us.</span>
            </h2>
            <p className="finale-cta-desc">
              Direct access to our research and engineering teams. Explore joint research, fellowships, or
              foundational enterprise deployments.
            </p>
          </div>

          <div className="finale-cta-side">
            <div className="finale-cta-actions">
              <Link to="/contact" className="btn btn-solid">
                Get in touch <Arrow size={13} />
              </Link>
              <a className="footer-mail" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
            </div>
            <div className="finale-cta-badge mono">
              <span>Kanpur, India · Made in Bharat</span>
            </div>
          </div>
        </Fade>
      </div>
    </section>
  );
}
