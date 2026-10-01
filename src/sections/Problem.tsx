import { useStage } from '../gl/Scene';
import { Stage } from '../components/Stage';
import { Diagram, type Draw } from '../viz/Diagram';
import { alone, forgets, fragmented, stops } from '../viz/problem';
import { Fade, SectionHead } from '../components/Reveal';
import { useScrollSteps } from '../components/useScrollSteps';
import { PROBLEMS } from '../content';

const ART: { draw: Draw; period: number; still: number; label: string }[] = [
  { draw: forgets, period: 10, still: 4, label: 'A session fills with context, then ends and the next one starts empty' },
  { draw: fragmented, period: 10, still: 1.2, label: 'Six separate tools; information cannot cross between them' },
  { draw: stops, period: 12, still: 9.5, label: 'The world keeps growing while a trained model stays where it was' },
  { draw: alone, period: 10, still: 4.6, label: 'Three agents each repeat the same work and cannot reach each other' },
];

const GAPS = ['Forgets', 'Fragmented', 'Stops learning', 'Works alone'];
/** The first two gaps are about memory (violet), the last two about time and reach (tango). */
const TONE = ['violet', 'violet', 'tango', 'tango'];

/**
 * Four problems. On wide screens the section pins and scrolling walks through them one at a time: the statement,
 * its diagram, and a timeline of the four; the panel's puzzle lights the piece in question. On phones, four cards.
 */
export function Problem() {
  const { ref, active, progress, pinned, jump, style } = useScrollSteps<HTMLElement>(PROBLEMS.length, 50);
  const cap = pinned ? `Four pieces of today’s AI that do not fit together. Piece ${active + 1}: ${GAPS[active]}` : 'Four pieces of today’s AI that do not fit together';
  const stage = useStage(ref, 'puzzle', {
    fig: '02',
    name: 'Puzzle',
    caption: cap,
    labels: () => GAPS.map((text, i) => ({ text, hot: pinned && i === active, side: 'below' as const })),
    params: () => (pinned ? { highlight: active } : {}),
  });
  const local = (i: number) => Math.min(1, Math.max(0, progress * PROBLEMS.length - i));
  const P = PROBLEMS[active];

  return (
    <section
      id="mission"
      ref={ref}
      className={`section problem room room--tango ${pinned ? 'is-pinned' : ''}`}
      data-room="tango"
      data-room2="pitch"
      data-chapter="The problem"
      style={style}
    >
      <div className={pinned ? 'steps-stage' : ''}>
        <div className="wrap">
          <SectionHead
            index="02"
            label="The problem with AI today"
            title={['Powerful, but incomplete.']}
            lede="Four gaps that show up the moment AI is used for real work."
            stage={<Stage stageRef={stage} fig="02" name="Puzzle" caption={cap} />}
          />
          {pinned ? (
            <div className="problem-step" data-tone={TONE[active]}>
              <div className="problem-statement" key={active} aria-live="polite">
                <span className="problem-big-num">{String(active + 1).padStart(2, '0')} / 04</span>
                <h3 className="problem-big">{P.title}</h3>
                <p className="problem-say">{P.body}</p>
                <p className="problem-caption">
                  <span className="dot" />
                  {P.caption}
                </p>
              </div>
              <div className="problem-card problem-card--stage" key={`art${active}`}>
                <div className="problem-art">
                  <Diagram draw={ART[active].draw} period={ART[active].period} h={250} still={ART[active].still} label={ART[active].label} />
                </div>
              </div>
              <ol className="problem-timeline">
                {PROBLEMS.map((p, i) => (
                  <li key={p.title} className={i === active ? 'is-active' : i < active ? 'is-past' : ''} data-tone={TONE[i]}>
                    <button onClick={() => jump(i)} aria-current={i === active ? 'step' : undefined}>
                      <span className="problem-track">
                        <i className="problem-bar" style={{ transform: `scaleX(${local(i)})` }} />
                      </span>
                      <span className="problem-seg">
                        <span className="num">{String(i + 1).padStart(2, '0')}</span>
                        {GAPS[i]}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="problem-grid">
              {PROBLEMS.map((p, i) => (
                <Fade key={p.title} className="problem-card" delay={(i % 2) * 160}>
                  <div className="problem-art">
                    <Diagram draw={ART[i].draw} period={ART[i].period} h={250} still={ART[i].still} label={ART[i].label} />
                  </div>
                  <div className="problem-text" data-tone={TONE[i]}>
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                    <p className="problem-caption">
                      <span className="dot" />
                      {p.caption}
                    </p>
                  </div>
                </Fade>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
