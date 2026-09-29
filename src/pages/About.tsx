import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { PageHero, Zone } from '../components/PageHero';
import { Lines, Kicker, Fade, Arrow } from '../components/Reveal';
import { AUDIENCES, PRINCIPLES } from '../content';

export function About() {
  const [hl, setHl] = useState<number | null>(null);
  const hlRef = useRef(hl);
  hlRef.current = hl;
  return (
    <div className="page">
      <PageHero
        index="About"
        label="Our thesis"
        title={['Not another', 'AI model.']}
        lede="We are building the intelligence infrastructure on which future AI systems can collaborate, evolve and create new capabilities together."
        target={{ key: 'logo', pose: { x: 1.8 } }}
      />

      <Zone target={{ key: 'logo', pose: { x: 1.8 }, params: { alpha: 0 } }} className="section">
        <div className="wrap split">
          <Kicker index="01">Philosophy</Kicker>
          <div style={{ display: 'grid', gap: 48 }}>
            <Fade as="p" className="statement-block">
              Today’s AI is powerful, but fragmented. <span>Each model operates alone. Each application solves a different problem. Knowledge rarely flows between them.</span>
            </Fade>
            <Fade as="p" className="statement-block" delay={100}>
              We are researching intelligence that behaves more like the human brain: <span>many specialised systems, working together as one.</span>
            </Fade>
            <Fade as="p" className="body" delay={150}>
              This is the foundation of our work on Generative Intelligence: extending beyond Generative AI toward systems that generate
              new capabilities, not just content.
            </Fade>
          </div>
        </div>
      </Zone>

      <Zone target={{ key: 'logo', pose: { x: 0, y: 0, s: 1.15 }, params: { dark: 1, alpha: 0.22 } }} className="section" id="vision">
        <div className="wrap" style={{ display: 'grid', gap: 'clamp(80px, 16vh, 180px)' }}>
          <div>
            <Kicker index="02">Vision</Kicker>
            <Lines className="h1" lines={['To make intelligence', 'as accessible as', 'information.']} />
          </div>
          <div style={{ justifySelf: 'end', maxWidth: 820 }}>
            <Kicker index="03">Mission</Kicker>
            <Fade as="p" className="statement-block" delay={100}>
              To transform AI from isolated models into a unified ecosystem, <span>capable of continuous learning, persistent memory, autonomous reasoning and global collaboration.</span>
            </Fade>
          </div>
        </div>
      </Zone>

      <Zone target={() => ({ key: 'orbit6', params: { highlight: hlRef.current ?? -1, alpha: 0 } })} className="section">
        <div className="wrap">
          <div style={{ maxWidth: 720, marginBottom: 56 }}>
            <Kicker index="04">Principles</Kicker>
            <Lines className="h2" lines={['Six principles.', 'Every system.']} />
          </div>
          <ol className="numbered" onMouseLeave={() => setHl(null)}>
            {PRINCIPLES.map((p, i) => (
              <Fade as="li" key={p.title} delay={i * 60} className={hl === i ? 'is-active' : ''} onMouseEnter={() => setHl(i)}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </Fade>
            ))}
          </ol>
        </div>
      </Zone>

      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="section">
        <div className="wrap">
          <Kicker index="05">Who we build for</Kicker>
          <Fade as="p" className="inline-list" style={{ marginTop: 28 }}>
            {AUDIENCES.map((a, i) => (
              <span key={a}>
                {a}
                {i < AUDIENCES.length - 1 && <i>/</i>}
              </span>
            ))}
          </Fade>
        </div>
      </Zone>

      <Zone target={{ key: 'logo', pose: { x: 0, y: -3.35, s: 1.75 } }} className="cta-band">
        <div className="wrap">
          <Kicker>Continue</Kicker>
          <Lines className="h2" lines={['See the research', 'behind the thesis.']} />
          <Fade>
            <Link to="/research" className="btn btn-solid">
              Enter the lab <Arrow />
            </Link>
          </Fade>
        </div>
      </Zone>
    </div>
  );
}
