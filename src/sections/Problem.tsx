import { useRef } from 'react';
import { useStage } from '../gl/Scene';
import { Stage } from '../components/Stage';
import { Diagram, type Draw } from '../viz/Diagram';
import { alone, forgets, fragmented, stops } from '../viz/problem';
import { Fade, SectionHead } from '../components/Reveal';
import { PROBLEMS } from '../content';

const ART: { draw: Draw; period: number; still: number; label: string }[] = [
  { draw: forgets, period: 10, still: 4, label: 'A session fills with context, then ends and the next one starts empty' },
  { draw: fragmented, period: 10, still: 1.2, label: 'Six separate tools; information cannot cross between them' },
  { draw: stops, period: 12, still: 9.5, label: 'The world keeps growing while a trained model stays where it was' },
  { draw: alone, period: 10, still: 4.6, label: 'Three agents each repeat the same work and cannot reach each other' },
];

const GAPS = ['Forgets', 'Fragmented', 'Stops learning', 'Works alone'];

/** Four problems, each acted out by its own diagram. */
export function Problem() {
  const ref = useRef<HTMLElement>(null);
  const cap = 'Four pieces of today’s AI that do not fit together';
  const stage = useStage(ref, 'puzzle', { fig: '02', name: 'Puzzle', caption: cap, labels: () => GAPS.map((text) => ({ text, side: 'below' as const })) });
  return (
    <section id="mission" ref={ref} className="section problem room room--tango" data-room="tango" data-chapter="The problem">
      <div className="wrap">
        <SectionHead
          index="02"
          label="The problem with AI today"
          title={['Powerful, but incomplete.']}
          lede="Four gaps that show up the moment AI is used for real work."
          stage={<Stage stageRef={stage} fig="02" name="Puzzle" caption={cap} />}
        />
        <div className="problem-grid">
          {PROBLEMS.map((p, i) => (
            <Fade key={p.title} className="problem-card" delay={(i % 2) * 160}>
              <div className="problem-art">
                <Diagram draw={ART[i].draw} period={ART[i].period} h={250} still={ART[i].still} label={ART[i].label} />
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
