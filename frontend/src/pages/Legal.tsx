import { PageHero, Quiet } from '../components/PageHero';
import { LEGAL_DATE, PRIVACY, TERMS } from '../content';
import { useScene } from '../gl/Scene';

function LegalPage({ title, items }: { title: [string, string]; items: readonly (readonly [string, string])[] }) {
  const { scrollTo } = useScene();
  return (
    <>
      <PageHero tone="cobalt" title={title} lede={`Effective ${LEGAL_DATE}. Written to be read, not skimmed past.`} />
      <Quiet>
        <div className="wrap legal">
          <nav className="legal-toc" aria-label="Sections">
            <ol>
              {items.map(([h], i) => (
                <li key={h}>
                  <a href={`#s${i}`} onClick={(e) => {
                      e.preventDefault();
                      const section = document.getElementById(`s${i}`);
                      if (section) scrollTo(section);
                    }}>
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
