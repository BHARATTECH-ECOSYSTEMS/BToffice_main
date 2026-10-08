import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Arrow, Eyebrow, Headline, Reveal } from '../components/ui';
import { useQuiet } from '../gl/Scene';
import { EMAIL, FAQ } from '../content';
import { ORIGIN_POINT, threadPaths } from '../gl/threads';
import type { HueName } from '../gl/palette';

/** An accordion whose panels open to their real height. */
export function Accordion({ items, tone = 'cobalt', tags }: { items: { q: string; a: string }[]; tone?: HueName; tags?: string[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="accordion" style={{ '--tone': `var(--${tone})` } as React.CSSProperties}>
      {items.map((f, i) => (
        <div key={f.q} className="acc-item" data-open={open === i || undefined}>
          <h3>
            <button aria-expanded={open === i} aria-controls={`acc-${i}`} id={`acc-q-${i}`} onClick={() => setOpen((o) => (o === i ? null : i))}>
              {tags && (
                <span className="acc-tag" aria-hidden="true">
                  <small>{String(i + 1).padStart(2, '0')}</small>
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

/** The mark drawn flat: its three threads draw in, meet at the origin, and let go again. */
export function ThreadMark() {
  return (
    <svg className="faq-mark" viewBox="-1.1 -1.1 2.2 2.2" aria-hidden="true">
      <clipPath id="faq-disc">
        <circle r="1" />
      </clipPath>
      <circle r="1" className="faq-mark-disc" />
      <g clipPath="url(#faq-disc)">
        {THREADS.map((d, i) => (
          <path key={i} d={d} pathLength={1} className="faq-mark-thread" style={{ '--k': i } as React.CSSProperties} />
        ))}
      </g>
      <circle cx={ORIGIN_POINT[0]} cy={-ORIGIN_POINT[1]} r="0.07" className="faq-mark-origin" />
    </svg>
  );
}

const TAGS = ['Company', 'Idea', 'Difference', 'Research', 'Access', 'Data'];
const THREADS = threadPaths();

/** The questions, beside a card that draws the mark's three threads meeting at the origin and points to a person. */
export function Faq() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return (
    <section id="faq" ref={ref} className="section faq">
      <div className="wrap faq-grid">
        <div className="faq-head">
          <Eyebrow tone="violet">Questions</Eyebrow>
          <Headline tone="violet" lines={['Asked often,', 'answered plainly.']} />
          <Reveal className="cell cell-ink faq-ask" delay={100}>
            <ThreadMark />
            <div>
              <p className="cell-label">Still curious?</p>
              <h3>Ask the people building it.</h3>
              <p>Researchers, institutions and teams interested in early collaboration hear back from the research group directly.</p>
              <div className="faq-actions">
                <Link to="/contact" className="btn btn-light">
                  Write to us <Arrow />
                </Link>
                <a href={`mailto:${EMAIL}`} className="faq-mail">
                  {EMAIL}
                </a>
              </div>
            </div>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <Accordion items={FAQ} tone="violet" tags={TAGS} />
        </Reveal>
      </div>
    </section>
  );
}
