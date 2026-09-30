import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useStage } from '../gl/Scene';
import { Arrow, Fade, Kicker, Lines } from '../components/Reveal';
import { EMAIL, FAQ } from '../content';

export function Faq() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(0);
  useStage(ref, 'dialogue', {
    fig: '11',
    name: 'Dialogue',
    caption: 'Ask anything; a person on the team writes back',
    labels: () => [
      { text: 'Your question', side: 'above' as const },
      { text: 'A person answers', hot: true, side: 'below' as const },
    ],
  });
  return (
    <section id="faq" ref={ref} className="section faq" data-room="tango" data-room2="pitch" data-chapter="Questions">
      <div className="wrap faq-grid">
        <div className="faq-side">
          <Kicker index="11">Questions</Kicker>
          <Lines className="h2" lines={['Questions,', 'answered.']} />
          <Fade as="p" className="body" delay={120}>
            What people most often ask us about Bharattech Origin, Generative Intelligence and Rivinity.
          </Fade>
          <Fade className="faq-contact" delay={200}>
            <span className="faq-contact-dot" />
            <p>
              <b>Still curious?</b>
              Every message is read by a person on the team.
            </p>
            <Link to="/contact" className="btn btn-solid">
              Ask us anything <Arrow size={13} />
            </Link>
            <a href={`mailto:${EMAIL}`} className="link">
              {EMAIL}
            </a>
          </Fade>
        </div>
        <ul className="faq-list">
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <Fade as="li" key={f.q} className={`faq-item ${isOpen ? 'is-open' : ''}`} delay={i * 50}>
                <button className="faq-row" aria-expanded={isOpen} aria-controls={`faq-${i}`} onClick={() => setOpen(isOpen ? null : i)}>
                  <span className="faq-q">{f.q}</span>
                  <span className="faq-toggle" aria-hidden="true">
                    <span className="faq-plus" />
                  </span>
                </button>
                <div className="faq-more" id={`faq-${i}`}>
                  <div>
                    <p className="faq-a">{f.a}</p>
                  </div>
                </div>
              </Fade>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
