import { PageHero, Quiet } from '../components/PageHero';
import { LEGAL_DATE, PRIVACY, TERMS } from '../content';

function LegalPage({ title, items }: { title: [string, string]; items: readonly (readonly [string, string])[] }) {
  return (
    <>
      <PageHero eyebrow={`Effective ${LEGAL_DATE}`} tone="cobalt" title={title} lede="Written to be read, not skimmed past." />
      <Quiet>
        <div className="wrap legal">
          <nav className="legal-toc" aria-label="Sections">
            <ol>
              {items.map(([h], i) => (
                <li key={h}>
                  <a href={`#s${i}`} onClick={(e) => (e.preventDefault(), document.getElementById(`s${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))}>
                    {h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="legal-body">
            {items.map(([h, b], i) => (
              <section key={h} id={`s${i}`}>
                <h2>
                  {h}
                </h2>
                <p>{b}</p>
              </section>
            ))}
          </div>
        </div>
      </Quiet>
    </>
  );
}

export const Privacy = () => <LegalPage title={['Privacy', 'policy.']} items={PRIVACY} />;
export const Terms = () => <LegalPage title={['Terms of', 'service.']} items={TERMS} />;
