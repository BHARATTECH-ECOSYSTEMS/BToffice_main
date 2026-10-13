import { useState } from 'react';
import { PageHero, Quiet } from '../components/PageHero';
import { Accordion, ThreadMark } from '../sections/Faq';
import { Arrow, Headline, Reveal, toneStyle } from '../components/ui';
import { CONTACT_FAQ, CONTACT_NEEDS, EMAIL, HQ, HQ_MAP } from '../content';
import type { HueName } from '../gl/palette';

const NEED_TONES: HueName[] = ['violet', 'tangerine', 'saffron', 'violet', 'tangerine', 'saffron'];

export function Contact() {
  const [need, setNeed] = useState(0);
  const [sent, setSent] = useState(false);

  // there is no backend yet: the brief opens in the visitor's own mail app, and the page says so
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const n = CONTACT_NEEDS[need];
    const body = `Need: ${n}\n\n${f.get('message')}\n\nFrom: ${f.get('name')}${f.get('org') ? `, ${f.get('org')}` : ''}\nEmail: ${f.get('email')}`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`${n}: ${f.get('name')}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <>
      <PageHero
        tone="violet"
        title={['Let’s build', 'what comes next.']}
        lede="Direct access to our research and engineering teams. Every message is read by a person."
      />
      <Quiet>
        <div className="wrap">
          <div className="bento contact-bento">
            <Reveal className="cell contact-form">
              <p className="cell-label">Send a brief</p>
              <form onSubmit={submit}>
                <fieldset>
                  <legend>What is it about?</legend>
                  <div className="need-chips">
                    {CONTACT_NEEDS.map((n, i) => (
                      <button type="button" key={n} aria-pressed={need === i} style={toneStyle(NEED_TONES[i])} onClick={() => setNeed(i)}>
                        <i aria-hidden="true" />
                        {n}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="fields">
                  <label>
                    <span>Name</span>
                    <input name="name" required autoComplete="name" />
                  </label>
                  <label>
                    <span>Email</span>
                    <input name="email" type="email" required autoComplete="email" />
                  </label>
                  <label className="span-2">
                    <span>Organisation (optional)</span>
                    <input name="org" autoComplete="organization" />
                  </label>
                  <label className="span-2">
                    <span>Message</span>
                    <textarea name="message" rows={5} required />
                  </label>
                </div>
                <div className="form-foot">
                  <button className="btn btn-primary" type="submit">
                    Open in my email app <Arrow />
                  </button>
                  <p className="form-note" aria-live="polite">
                    {sent ? 'Your email app should have opened with the brief ready to send. Nothing has been sent yet.' : 'This opens your email app with the brief filled in; nothing is sent from this page.'}
                  </p>
                </div>
              </form>
            </Reveal>
            <div className="contact-side">
              <Reveal className="cell cell-row" style={toneStyle('violet')} delay={80}>
                <span className="icon-tile">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
                  </svg>
                </span>
                <div>
                  <h3>Email</h3>
                  <a href={`mailto:${EMAIL}`} className="text-link">
                    {EMAIL}
                  </a>
                </div>
              </Reveal>
              <Reveal className="cell cell-row" style={toneStyle('tangerine')} delay={140}>
                <span className="icon-tile">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
                  </svg>
                </span>
                <div>
                  <h3>Headquarters</h3>
                  <a href={HQ_MAP} target="_blank" rel="noopener noreferrer" className="text-link">
                    {HQ} <Arrow dir="up-right" size={12} />
                  </a>
                </div>
              </Reveal>
              <Reveal className="cell cell-row" style={toneStyle('saffron')} delay={200}>
                <span className="icon-tile">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
                  </svg>
                </span>
                <div>
                  <h3>Research collaboration</h3>
                  <p>For universities, institutions and foundational partners.</p>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </Quiet>
      <Quiet>
        <div className="wrap faq-grid faq">
          <div className="faq-head">
            <Headline tone="violet" lines={['A few', 'answers.']} />
            <Reveal className="cell cell-ink faq-ask" delay={100}>
              <ThreadMark />
              <div>
                <p className="cell-label">How we reply</p>
                <h3>Read by a person.</h3>
                <p>Every message goes to the research and engineering teams, not to a queue. Tell us what you are working on and what you hope to build together.</p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <Accordion items={CONTACT_FAQ} tone="violet" tags={['Partners', 'Hiring', 'Replies']} />
          </Reveal>
        </div>
      </Quiet>
    </>
  );
}
