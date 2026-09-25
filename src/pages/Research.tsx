import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { PageHero, Zone } from '../components/PageHero';
import { Lines, Kicker, Fade, Arrow } from '../components/Reveal';
import { DOMAINS, TECHNOLOGY } from '../content';

export function Research() {
  const [sel, setSel] = useState(0);
  const selRef = useRef(sel);
  selRef.current = sel;
  const d = DOMAINS[sel];

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') setSel((s) => (s + 1) % DOMAINS.length);
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') setSel((s) => (s + DOMAINS.length - 1) % DOMAINS.length);
  };

  return (
    <div className="page">
      <PageHero
        index="Research"
        label="The laboratory"
        title={['Six domains.', 'One intelligence.']}
        lede="Our research spans six interconnected domains. They are not separate products. Each one strengthens every other."
        target={{ key: 'helix', pose: { y: 0.9, s: 0.9 } }}
      />

      <Zone target={() => ({ key: 'orbit6', params: { dark: 1, highlight: selRef.current } })} className="section">
        <div className="wrap explorer">
          <div>
            <Kicker index="01">Domains</Kicker>
            <Lines className="h2" lines={['Explore', 'the system.']} />
            <ul className="explorer-tabs" role="tablist" aria-orientation="vertical" onKeyDown={onKey} style={{ marginTop: 40 }}>
              {DOMAINS.map((x, i) => (
                <li key={x.id}>
                  <button
                    className="explorer-tab"
                    role="tab"
                    aria-selected={i === sel}
                    aria-controls="domain-panel"
                    tabIndex={i === sel ? 0 : -1}
                    onClick={() => setSel(i)}
                    onMouseEnter={() => setSel(i)}
                  >
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                    <span className="name">{x.name}</span>
                    <span className="mono muted">{x.field.split(' ')[0]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="explorer-panel" id="domain-panel" role="tabpanel" aria-live="polite">
            <p className="mono violet">{d.field}</p>
            <h3 className="h3" key={d.id}>
              {d.name}
            </h3>
            <p className="body">{d.body}</p>
            <div className="tags" style={{ gridColumn: 'auto' }}>
              {d.focus.map((f) => (
                <span key={f} className="tag mono">
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Zone>

      <Zone target={{ key: 'layers', params: { alpha: 0.5 }, pose: { x: 1.9 } }} className="section">
        <div className="wrap split">
          <Kicker index="02">Unified architecture</Kicker>
          <div>
            <Fade as="p" className="statement-block">
              Research improves every model. Memory is shared intelligently. <span>Specialised systems collaborate, knowledge flows continuously, and new capabilities emerge through interaction.</span>
            </Fade>
          </div>
        </div>
      </Zone>

      <Zone target={{ key: 'field' }} className="section">
        <div className="wrap">
          <div style={{ maxWidth: 720, marginBottom: 48 }}>
            <Kicker index="03">Technology focus</Kicker>
            <Lines className="h2" lines={['Where we work.']} />
          </div>
          <Fade className="tech-cloud">
            {TECHNOLOGY.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </Fade>
          <Fade style={{ marginTop: 64 }}>
            <Link to="/contact" className="btn btn-solid">
              Propose a research collaboration <Arrow />
            </Link>
          </Fade>
        </div>
      </Zone>
    </div>
  );
}
