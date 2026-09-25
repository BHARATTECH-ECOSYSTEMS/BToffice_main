import { useRef, type CSSProperties } from 'react';
import { useFormation } from '../gl/Scene';
import { Fade, SectionHead, useInView } from '../components/Reveal';
import { PILLARS_PLAIN, SCENARIO } from '../content';

/** It remembers: sessions come and go, one memory thread runs underneath all of them. */
function ArtRemember() {
  const sessions = [52, 132, 212, 292];
  return (
    <svg viewBox="0 0 344 150" className="art">
      <path id="art-thread" className="art-thread" d="M24 104 C90 104, 100 104, 172 104 S 260 104, 320 104" />
      {sessions.map((x, i) => (
        <g key={x} className="art-session" style={{ animationDelay: `${i * 0.6}s` }}>
          <rect x={x - 30} y={34} width={60} height={30} rx={8} />
          <text x={x} y={53} textAnchor="middle">
            Day {[1, 4, 12, 30][i]}
          </text>
          <path className="art-drop" d={`M${x} 64 V104`} />
          <circle className="art-knot" cx={x} cy={104} r={4} />
        </g>
      ))}
      <circle r={4} className="art-runner">
        <animateMotion dur="4.8s" repeatCount="indefinite">
          <mpath href="#art-thread" />
        </animateMotion>
      </circle>
      <text className="art-caption" x={24} y={132}>
        Memory
      </text>
    </svg>
  );
}

/** It connects: every tool feeds one core. */
function ArtConnect() {
  const nodes = [
    ['Chat', 64, 36],
    ['Search', 172, 22],
    ['Docs', 280, 36],
    ['Code', 64, 118],
    ['Vision', 172, 132],
    ['Voice', 280, 118],
  ] as const;
  return (
    <svg viewBox="0 0 344 150" className="art">
      {nodes.map(([n, x, y], i) => (
        <g key={n}>
          <path id={`art-link-${i}`} className="art-link" d={`M${x} ${y} L172 77`} />
          <circle r={2.6} className="art-spark">
            <animateMotion dur="2.4s" begin={`${i * 0.4}s`} repeatCount="indefinite">
              <mpath href={`#art-link-${i}`} />
            </animateMotion>
          </circle>
          <rect className="art-pill" x={x - 26} y={y - 11} width={52} height={22} rx={11} />
          <text x={x} y={y + 4} textAnchor="middle">
            {n}
          </text>
        </g>
      ))}
      <circle className="art-core-ring" cx={172} cy={77} r={22} />
      <circle className="art-core" cx={172} cy={77} r={13} />
    </svg>
  );
}

/** It keeps learning: the curve keeps rising after deployment, not flat after training. */
function ArtLearn() {
  return (
    <svg viewBox="0 0 344 150" className="art">
      {[40, 70, 100].map((y) => (
        <line key={y} className="art-grid" x1={24} x2={320} y1={y} y2={y} />
      ))}
      <line className="art-marker" x1={110} x2={110} y1={24} y2={122} />
      <text className="art-caption" x={116} y={34}>
        Deployed
      </text>
      <path className="art-flat" d="M24 112 C60 100, 90 80, 110 76 L320 76" />
      <path className="art-curve" pathLength={1} d="M24 112 C60 100, 90 80, 110 76 C170 64, 230 50, 320 26" />
      <circle className="art-head" cx={320} cy={26} r={4.5} />
      <text className="art-caption" x={24} y={138}>
        Frozen model
      </text>
      <text className="art-caption art-caption-v" x={250} y={138}>
        Origin
      </text>
    </svg>
  );
}

const ART = [ArtRemember, ArtConnect, ArtLearn];

function Mark({ ok }: { ok: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      {ok ? <path d="M2.5 6.2l2.3 2.3 4.7-5" /> : <path d="M3 3l6 6M9 3L3 9" />}
    </svg>
  );
}

/** What the company is building, said plainly, then shown as one concrete scene. */
export function Intro() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'logo', pose: { x: 1.65, s: 0.92 }, params: { alpha: 0 } });
  const [sceneRef, sceneIn] = useInView<HTMLDivElement>({ margin: '0px 0px -25% 0px' });
  const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <section id="intro" ref={ref} className="section intro" data-chapter="What we build">
      <div className="wrap">
        <SectionHead
          index="01"
          label="What we’re building"
          title={['AI that remembers, connects', 'and keeps learning.']}
          lede="Most AI tools start from zero every time, work alone and stop learning once they are trained. We are building the layer underneath them: one shared intelligence that every application can draw on."
        />

        <div className="plain">
          {PILLARS_PLAIN.map((p, i) => {
            const Art = ART[i];
            return (
              <Fade key={p.title} className="bento plain-item" delay={i * 90}>
                <div className="bento-art">
                  <Art />
                </div>
                <div className="bento-text">
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </Fade>
            );
          })}
        </div>

        <div ref={sceneRef} className={`scene-demo ${sceneIn ? 'is-in' : ''}`}>
          <div className="scene-head">
            <p className="scene-label">
              <span className="num">Scenario</span>
              Same question, two systems
            </p>
            <p className="scene-setup">{SCENARIO.setup}</p>
          </div>

          <div className="compare">
            <article className="convo convo-today">
              <header className="convo-head">
                <span className="convo-dot" />
                A typical AI assistant today
              </header>
              <div className="convo-body">
                <div className="msg msg-user is-past fade" style={d(100)}>
                  <span className="msg-meta">Three weeks ago</span>
                  {SCENARIO.earlier}
                </div>
                <div className="convo-divider fade" style={d(200)}>
                  <span>New session</span>
                </div>
                <div className="msg msg-user fade" style={d(300)}>
                  {SCENARIO.question}
                </div>
                <div className="msg msg-ai fade" style={d(500)}>
                  {SCENARIO.today.reply}
                </div>
              </div>
              <ul className="outcomes">
                {SCENARIO.today.outcomes.map((o) => (
                  <li key={o} className="is-bad">
                    <Mark ok={false} />
                    {o}
                  </li>
                ))}
              </ul>
            </article>

            <article className="convo convo-origin">
              <header className="convo-head">
                <span className="convo-dot" />
                With Origin
              </header>
              <div className="convo-body">
                <div className="msg msg-user is-past fade" style={d(150)}>
                  <span className="msg-meta">Three weeks ago</span>
                  {SCENARIO.earlier}
                </div>
                <div className="convo-divider fade" style={d(250)}>
                  <span>New session</span>
                </div>
                <div className="msg msg-user fade" style={d(350)}>
                  {SCENARIO.question}
                </div>
                <ol className="trace">
                  {SCENARIO.origin.trace.map((t, i) => (
                    <li key={t.layer} className="fade" style={d(650 + i * 260)}>
                      <span className="trace-layer">{t.layer}</span>
                      {t.text}
                    </li>
                  ))}
                </ol>
                <div className="msg msg-ai msg-origin fade" style={d(1500)}>
                  {SCENARIO.origin.reply}
                </div>
              </div>
              <ul className="outcomes">
                {SCENARIO.origin.outcomes.map((o) => (
                  <li key={o} className="is-good">
                    <Mark ok />
                    {o}
                  </li>
                ))}
              </ul>
            </article>
          </div>
          <p className="scene-note">A concept illustration of the system we are researching, not a transcript of a live product.</p>
        </div>
      </div>
    </section>
  );
}
