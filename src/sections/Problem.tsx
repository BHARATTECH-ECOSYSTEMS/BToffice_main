import { useRef } from 'react';
import { useFormation } from '../gl/Scene';
import { Diagram, type Draw } from '../viz/Diagram';
import { alone, forgets, fragmented, stops } from '../viz/problem';
import { Fade, SectionHead } from '../components/Reveal';
import { PROBLEMS } from '../content';

const ART: { draw: Draw; period: number; hold?: number; still: number; label: string }[] = [
  { draw: forgets, period: 10, still: 4, label: 'A session fills with context, then ends and the next one starts empty' },
  { draw: fragmented, period: 10, still: 1.2, label: 'Six separate tools; information cannot cross between them' },
  { draw: stops, period: 12, hold: 9, still: 9.5, label: 'The world keeps growing while a trained model stays where it was' },
  { draw: alone, period: 10, still: 4.6, label: 'Three agents each repeat the same work and cannot reach each other' },
];

/** Four problems, each acted out by its own diagram. */
export function Problem() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });
  return (
    <section id="mission" ref={ref} className="section problem" data-chapter="The problem">
      <div className="wrap">
        <SectionHead
          index="02"
          label="The problem with AI today"
          title={['Powerful, but incomplete.']}
          lede="Four gaps that show up the moment AI is used for real work."
        />
        <div className="problem-grid">
          {PROBLEMS.map((p, i) => (
            <Fade key={p.title} className="problem-card" delay={(i % 2) * 90}>
              <div className="problem-art">
                <Diagram draw={ART[i].draw} period={ART[i].period} hold={ART[i].hold} still={ART[i].still} label={ART[i].label} />
              </div>
              <div className="problem-text">
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </section>
  );
}
