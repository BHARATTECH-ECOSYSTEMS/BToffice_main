import { PageHero } from '../components/PageHero';
import { Fade } from '../components/Reveal';
import { PRIVACY, TERMS, LEGAL_DATE } from '../content';

function LegalPage({ index, title, sections }: { index: string; title: string[]; sections: readonly (readonly [string, string])[] }) {
  return (
    <div className="page">
      <PageHero index={index} label={`Effective ${LEGAL_DATE} · Last updated ${LEGAL_DATE}`} title={title} lede="Written to be read, not skimmed past." target={{ key: 'field', params: { alpha: 0 } }} />
      <div className="wrap legal">
        <ol className="toc">
          {sections.map(([h], i) => (
            <li key={h}>
              <a href={`#s${i}`} onClick={(e) => { e.preventDefault(); document.getElementById(`s${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                <span className="mono">{String(i + 1).padStart(2, '0')}</span>&nbsp;&nbsp;{h}
              </a>
            </li>
          ))}
        </ol>
        <div className="legal-body">
          {sections.map(([h, body], i) => (
            <Fade as="section" key={h} className="legal-section" id={`s${i}`} style={{ scrollMarginTop: 120 }}>
              <span className="mono muted">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h2>{h}</h2>
                <p>{body}</p>
              </div>
            </Fade>
          ))}
        </div>
      </div>
    </div>
  );
}

export const Privacy = () => <LegalPage index="Legal" title={['Privacy', 'policy.']} sections={PRIVACY} />;
export const Terms = () => <LegalPage index="Legal" title={['Terms of', 'service.']} sections={TERMS} />;
