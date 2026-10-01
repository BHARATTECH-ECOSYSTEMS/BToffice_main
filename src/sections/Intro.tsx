import { useRef, type CSSProperties } from 'react';
import { useFormation, worldYOf } from '../gl/Scene';
import { Fade, SectionHead, useInView } from '../components/Reveal';
import { PILLARS_PLAIN, SCENARIO } from '../content';
import { Diagram, BENTO_DIAGRAMS } from '../components/BentoDiagrams';

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
  useFormation(ref, () => ({
    key: 'logo',
    pose: { x: 1.65, y: worldYOf(ref.current, 0), s: 0.92 },
    mobilePose: { x: 0, y: worldYOf(ref.current, 0), s: 0.56 },
    params: { alpha: 0 },
    follow: 18,
  }));
  const [sceneRef, sceneIn] = useInView<HTMLDivElement>({ margin: '0px 0px -25% 0px' });
  const d = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

  return (
    <section id="intro" ref={ref} className="section intro" data-chapter="What we build">
      <div className="wrap">
        <SectionHead
          index="01"
          label="What we’re building"
          title={['AI that remembers, connects', 'and keeps learning.']}
          scrub
          lede="Most AI tools start from zero every time, work alone and stop learning once they are trained. We are building the layer underneath them: one shared intelligence that every application can draw on."
        />

        <div className="plain">
          {PILLARS_PLAIN.map((p, i) => {
            const diag = BENTO_DIAGRAMS[i];
            return (
              <Fade key={p.title} className="bento plain-item" delay={i * 90}>
                <div className="bento-art">
                  <Diagram
                    draw={diag.draw}
                    period={12}
                    h={diag.h}
                    label={diag.label}
                    still={diag.still}
                  />
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
