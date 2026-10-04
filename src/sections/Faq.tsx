import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { Plus, MessageCircle } from 'lucide-react';
import { useFormation } from '../gl/Scene';
import { Arrow } from '../components/Reveal';
import { ChapterHead } from '../components/Chapter';
import { EMAIL, FAQ } from '../content';

/**
 * Questions: the heading holds its place on the left while the answers are read on the right, as one hairline list;
 * a slim strip under the list hands anything unanswered to a person.
 */
export function Faq() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(0);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });
  return (
    <section id="faq" ref={ref} className="section faq2" data-chapter="Questions">
      <div className="wrap faq2-grid">
        <div className="faq2-side">
          <ChapterHead
            index="11"
            label="Questions"
            title={['Questions,', <span className="accent">answered.</span>]}
            lede="What people most often ask us about Bharattech Origin, Generative Intelligence and Rivinity."
          />
          <p className="faq2-count">
            <b>{String(FAQ.length).padStart(2, '0')}</b> questions · {open === null ? 'none open' : `reading ${String(open + 1).padStart(2, '0')}`}
          </p>
        </div>

        <div className="faq2-main">
          <ol className="faq2-list">
            {FAQ.map((f, i) => {
              const isOpen = open === i;
              return (
                <li key={f.q} className={isOpen ? 'is-open' : ''}>
                  <button className="faq2-row" aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                    <span className="faq2-num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="faq2-q">{f.q}</span>
                    <span className="faq2-toggle" aria-hidden="true">
                      <Plus size={16} strokeWidth={2} />
                    </span>
                  </button>
                  <div className="faq2-more" id={`faq-${i}`}>
                    <div>
                      <p>{f.a}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="faq2-ask">
            <span className="faq2-ask-ico" aria-hidden="true">
              <MessageCircle size={18} strokeWidth={1.75} />
            </span>
            <p>
              <b>Still curious?</b> Every message is read by a person on the team.
            </p>
            <a href={`mailto:${EMAIL}`} className="faq2-mail">
              {EMAIL}
            </a>
            <Link to="/contact" className="btn btn-solid">
              Ask us anything <Arrow size={13} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
