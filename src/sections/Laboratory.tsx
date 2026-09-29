import { useRef } from 'react';
import { Link } from 'react-router';
import { Fade, Arrow, SectionHead } from '../components/Reveal';
import { DOMAINS } from '../content';
import { Diagram } from '../viz/Diagram';
import { DOMAIN_DRAWS, DOMAIN_H, DOMAIN_LABELS, DOMAIN_STILL, DOMAIN_W } from '../viz/domains';
import { useFormation } from '../gl/Scene';

/** Six research domains, each shown doing the one thing it is for. */
export function Laboratory() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });
  return (
    <section id="laboratory" ref={ref} className="section lab" data-chapter="Laboratory">
      <div className="wrap">
        <SectionHead
          index="07"
          label="Laboratory"
          title={['Six domains.', 'One research programme.']}
          aside={
            <Link to="/research" className="link">
              Enter the lab <Arrow size={13} />
            </Link>
          }
        />
        <div className="lab-grid">
          {DOMAINS.map((d, i) => (
            <Fade key={d.id} delay={(i % 3) * 100}>
              <Link to="/research" className="lab-card">
                <div className="lab-card-art">
                  <Diagram draw={DOMAIN_DRAWS[i]} period={8} w={DOMAIN_W} h={DOMAIN_H} label={DOMAIN_LABELS[i]} still={DOMAIN_STILL[i]} />
                  <span className="lab-card-num">{String(i + 1).padStart(2, '0')}</span>
                </div>
                <div className="lab-card-text">
                  <p className="lab-card-field">{d.field}</p>
                  <h3>{d.name}</h3>
                  <p className="lab-card-body">{d.body}</p>
                  <div className="tags">
                    {d.focus.slice(0, 3).map((f) => (
                      <span key={f} className="tag">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
