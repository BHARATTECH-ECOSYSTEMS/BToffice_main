import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Arrow, Headline, Reveal, BtnText, ThreadMark } from '../components/ui';
import { useQuiet } from '../gl/Scene';
import { useGlassTilt } from '../components/useGlassTilt';
import { EMAIL, EMAIL_HREF, FAQ } from '../content';
import type { HueName } from '../gl/palette';

/** An accordion whose panels open to their real height. */
/** `initial` is the question open on arrival; null starts with every question closed. */
export function Accordion({ items, tone = 'cobalt', tags, initial = 0 }: { items: { q: string; a: string }[]; tone?: HueName; tags?: string[]; initial?: number | null }) {
  const [open, setOpen] = useState<number | null>(initial);
  return (
    <div className="accordion" style={{ '--tone': `var(--${tone})` } as React.CSSProperties}>
      {items.map((f, i) => (
        <div key={f.q} className="acc-item" data-open={open === i || undefined}>
          <h3>
            <button aria-expanded={open === i} aria-controls={`acc-${i}`} id={`acc-q-${i}`} onClick={() => setOpen((o) => (o === i ? null : i))}>
              {tags && (
                <span className="acc-tag" aria-hidden="true">
                  {tags[i]}
                </span>
              )}
              <span className="acc-q">{f.q}</span>
              <span className="acc-icon" aria-hidden="true" />
            </button>
          </h3>
          <div className="acc-panel" id={`acc-${i}`} role="region" aria-labelledby={`acc-q-${i}`}>
            <div>
              <p>{f.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const TAGS = ['Company', 'Idea', 'Difference', 'Research', 'Access', 'Data'];

/** The questions, beside a card that draws the mark's three threads meeting at the origin and points to a person. */
export function Faq() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  // the "Still curious?" glass card leans to the cursor and its shine follows it
  useGlassTilt(ref, '.faq-ask');
  return (
    <section id="faq" ref={ref} className="section faq">
      <div className="wrap faq-grid">
        <div className="faq-head">
          <Headline tone="violet" lines={['Asked often,', 'answered plainly.']} />
          <Reveal className="cell cell-ink faq-ask" delay={100}>
            {/* coloured light drifting inside the glass, for the frost to show */}
            <span className="faq-ask-glow" aria-hidden="true">
              <i />
              <i />
            </span>
            <ThreadMark />
            <div>
              <p className="cell-label">Still curious?</p>
              <h3>Ask the people building it.</h3>
              <p>Researchers, institutions and teams interested in early collaboration hear back from the research group directly.</p>
              <div className="faq-actions">
                <Link to="/contact" className="btn btn-light">
                  <BtnText>Write to us</BtnText> <Arrow />
                </Link>
                <a href={EMAIL_HREF} target="_blank" rel="noopener noreferrer" className="faq-mail">
                  {EMAIL}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <Accordion items={FAQ} tone="violet" tags={TAGS} initial={null} />
        </Reveal>
      </div>
    </section>
  );
}
