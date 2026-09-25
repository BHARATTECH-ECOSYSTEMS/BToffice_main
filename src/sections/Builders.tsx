import { useRef } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import { Lines, Kicker, Fade, Arrow } from '../components/Reveal';
import { ROLES, VALUES } from '../content';

export function Builders() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'field' });
  return (
    <section id="builders" ref={ref} className="section builders" data-chapter="Builders">
      <div className="wrap">
        <div className="builders-grid">
          <div>
            <Kicker index="06">Builders</Kicker>
            <Lines className="h2" lines={['Join the', 'builders.']} />
          </div>
          <Fade as="p" className="lede" delay={150}>
            A research and engineering company working on problems measured in decades. If you would rather build the foundation
            than another feature, we should talk.
          </Fade>
        </div>
        <div className="values">
          {VALUES.map((v, i) => (
            <Fade key={v.title} className="value" delay={i * 90}>
              <span className="mono muted">{String(i + 1).padStart(2, '0')}</span>
              <h3>{v.title}</h3>
              <p>{v.body}</p>
            </Fade>
          ))}
        </div>
        <ul className="roles">
          {ROLES.slice(0, 4).map((r, i) => (
            <Fade as="li" key={r.title} className="role" delay={i * 70}>
              <Link to="/careers">
                <span className="role-title">
                  {r.title} <span>{r.focus}</span>
                </span>
                <span className="mono muted">{r.team}</span>
                <span className="mono muted">{r.location}</span>
                <Arrow />
              </Link>
            </Fade>
          ))}
        </ul>
        <Fade style={{ marginTop: 32 }}>
          <Link to="/careers" className="link">
            All {ROLES.length} open roles <Arrow />
          </Link>
        </Fade>
      </div>
    </section>
  );
}
