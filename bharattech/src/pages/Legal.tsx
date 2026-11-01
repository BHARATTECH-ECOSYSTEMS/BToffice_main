import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router';
import { PageHero, Quiet } from '../components/PageHero';
import { Arrow } from '../components/ui';
import { LEGAL_DATE, PRIVACY, TERMS } from '../content';
import { useScene } from '../gl/Scene';
import { legalParts } from './legalText';

type Items = readonly (readonly [string, string])[];
/** The other legal page, offered once the reader reaches the end. */
type Other = { to: string; label: string };

/** A section's text with its email addresses as mail links and, on its first mention, `phrase` as a link. */
function linked(text: string, phrase?: { text: string; to: string }): ReactNode[] {
  return legalParts(text, phrase?.text).map((part, i) =>
    part.kind === 'email' ? (
      <a key={i} href={`mailto:${part.text}`}>
        {part.text}
      </a>
    ) : part.kind === 'phrase' && phrase ? (
      <Link key={i} to={phrase.to}>
        {part.text}
      </Link>
    ) : (
      part.text
    ),
  );
}

/**
 * Which section is being read: the last one whose top has passed a line a third of the way down the screen, or the
 * last section once the page's end is in view (it is too short to ever reach that line).
 */
function useReading(count: number, end: RefObject<HTMLElement | null>) {
  const [reading, setReading] = useState(0);
  useEffect(() => {
    const sections = Array.from({ length: count }, (_, i) => document.getElementById(`s${i}`)).filter((s): s is HTMLElement => !!s);
    const passed = new Set<number>();
    let atEnd = false;
    const pick = () => setReading(atEnd ? count - 1 : Math.max(0, ...passed));
    // the band runs from far above the page down to the line, so a section is in it once its top has passed the line
    const line = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const i = sections.indexOf(e.target as HTMLElement);
          if (e.isIntersecting) passed.add(i);
          else passed.delete(i);
        });
        pick();
      },
      { rootMargin: '100000px 0px -66% 0px' },
    );
    sections.forEach((s) => line.observe(s));
    const tail = new IntersectionObserver(([e]) => {
      atEnd = e.isIntersecting;
      pick();
    });
    if (end.current) tail.observe(end.current);
    return () => (line.disconnect(), tail.disconnect());
  }, [count, end]);
  return reading;
}

function LegalPage({ title, items, other, phrase }: { title: [string, string]; items: Items; other: Other; phrase?: { text: string; to: string } }) {
  const { scrollTo } = useScene();
  const end = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const reading = useReading(items.length, end);
  const [mark, setMark] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // the marker sits behind the link being read; links are measured, not assumed, as long names wrap to two lines
  useLayoutEffect(() => {
    const a = list.current?.querySelectorAll('a')[reading];
    if (a) setMark({ x: a.offsetLeft, y: a.offsetTop, w: a.offsetWidth, h: a.offsetHeight });
  }, [reading]);

  return (
    <>
      <PageHero tone="cobalt" title={title} lede={`Effective ${LEGAL_DATE}. Written to be read, not skimmed past.`} />
      <Quiet>
        <div className="wrap legal">
          <nav className="legal-toc" aria-label="Sections">
            {mark && (
              <span
                className="legal-toc-mark"
                aria-hidden="true"
                style={{ '--x': `${mark.x}px`, '--y': `${mark.y}px`, '--w': `${mark.w}px`, '--h': `${mark.h}px` } as CSSProperties}
              />
            )}
            <ol ref={list}>
              {items.map(([h], i) => (
                <li key={h}>
                  <a
                    href={`#s${i}`}
                    aria-current={i === reading ? 'location' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      const section = document.getElementById(`s${i}`);
                      if (section) scrollTo(section);
                    }}
                  >
                    {h}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <div className="legal-body">
            {items.map(([h, b], i) => (
              <section key={h} id={`s${i}`}>
                <h2>{h}</h2>
                <p>{linked(b, phrase)}</p>
              </section>
            ))}
            <footer ref={end} className="legal-end">
              <p>Effective {LEGAL_DATE}.</p>
              <Link to={other.to} className="link-arrow">
                Also read: {other.label} <Arrow size={16} />
              </Link>
            </footer>
          </div>
        </div>
      </Quiet>
    </>
  );
}

export const Privacy = () => <LegalPage title={['Privacy', 'policy.']} items={PRIVACY} other={{ to: '/terms', label: 'Terms of service' }} />;
export const Terms = () => (
  <LegalPage
    title={['Terms of', 'service.']}
    items={TERMS}
    other={{ to: '/privacy', label: 'Privacy policy' }}
    phrase={{ text: 'Privacy Policy', to: '/privacy' }}
  />
);
