import { useRef } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import { Fade, Arrow, SectionHead } from '../components/Reveal';
import { ROLES, VALUES } from '../content';

export function Builders() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });
  return (
    <section id="builders" ref={ref} className="section builders" data-chapter="Builders">
      <div className="wrap">
        <SectionHead
          index="06"
          label="Careers"
          title={['Join the builders.']}
          lede="A research and engineering company working on problems measured in decades. If you would rather build the foundation than another feature, we should talk."
          aside={
            <Link to="/careers" className="link">
              All {ROLES.length} open roles <Arrow size={13} />
            </Link>
          }
        />
        <div className="values">
          {VALUES.map((v, i) => (
            <Fade key={v.title} className="value" delay={i * 90}>
              <span className="num">{String(i + 1).padStart(2, '0')}</span>
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
                <span className="role-meta">{r.team}</span>
                <span className="role-meta">{r.location}</span>
                <Arrow size={13} />
              </Link>
            </Fade>
          ))}
        </ul>
      </div>
    </section>
  );
}
