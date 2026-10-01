import { useRef } from 'react';
import { Link } from 'react-router';
import { Fade, Arrow, SectionHead } from '../components/Reveal';
import { DOMAINS } from '../content';
import { Diagram } from '../components/BentoDiagrams';
import { LAB_DIAGRAMS } from '../components/LabDiagrams';
import { useStage } from '../gl/Scene';
import { Stage } from '../components/Stage';

/** Six research domains, each shown doing the one thing it is for. */
export function Laboratory() {
  const ref = useRef<HTMLElement>(null);
  const cap = 'Six research domains, bonded to one core like atoms in a molecule';
  const stage = useStage(ref, 'molecule', { fig: '07', name: 'Molecule', caption: cap, labels: () => DOMAINS.map((d) => ({ text: d.name, side: 'below' as const })) });
  return (
    <section id="laboratory" ref={ref} className="section lab" data-room="violet" data-room2="pitch" data-chapter="Laboratory">
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
          stage={<Stage stageRef={stage} fig="07" name="Molecule" caption={cap} />}
        />
        <div className="lab-grid">
          {DOMAINS.map((d, i) => (
            <Fade key={d.id} delay={(i % 3) * 100}>
              <Link to="/research" className="lab-card">
                <div className="lab-card-art">
                  <Diagram {...LAB_DIAGRAMS[i]} />
                </div>
                <div className="lab-card-text">
                  <span className="lab-card-num">{String(i + 1).padStart(2, '0')}</span>
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
