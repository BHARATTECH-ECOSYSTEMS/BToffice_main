import { useState } from 'react';
import { PageHero, Zone } from '../components/PageHero';
import { Fade, Arrow, Lines } from '../components/Reveal';
import { EMAIL } from '../content';

const REASONS = ['General enquiry', 'Research collaboration', 'Partnership', 'Press & media'];

export function Contact() {
  const [reason, setReason] = useState(REASONS[0]);
  const [sent, setSent] = useState(false);

  // No backend yet: compose the message in the visitor's mail client.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = `${f.get('message')}\n\n${f.get('name')}${f.get('org') ? `, ${f.get('org')}` : ''}\n${f.get('email')}`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`${reason}: ${f.get('name')}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <div className="page page-contact">
      <PageHero
        title={['Let’s build', 'what comes next.']}
        lede="Research collaborations, partnerships, press, or simply a good question. Every message is read by a person."
        target={{
          key: 'globe',
          pose: { x: 1.9, y: 0.16, s: 0.76 },
          mobilePose: { x: 0.38, y: 1.9, s: 0.37 },
          params: { steady: 1 },
        }}
      />
      <Zone target={{ key: 'globe', params: { alpha: 0 } }} className="section contact-section" id="write">
        <div className="wrap contact-grid">
          <div className="contact-aside">
            <Fade>
              <a className="big link" href={`mailto:${EMAIL}`}>
                {EMAIL}
              </a>
            </Fade>
            <Fade className="body" delay={100}>
              Bharattech Origin
              <br />
              India
            </Fade>
          </div>
          <Fade>
            {sent ? (
              <div className="form sent">
                <Lines className="h3" lines={['Your mail client', 'should now be open.']} show />
                <p className="body">If nothing happened, write to us directly at {EMAIL}.</p>
                <button className="link" style={{ justifySelf: 'center' }} onClick={() => setSent(false)}>
                  Write another message
                </button>
              </div>
            ) : (
              <form className="form" onSubmit={submit}>
                <div className="field">
                  <span className="mono muted">Reason</span>
                  <div className="reasons" role="group" aria-label="Reason for contact">
                    {REASONS.map((r) => (
                      <button type="button" key={r} className="reason" aria-pressed={reason === r} onClick={() => setReason(r)}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label className="mono" htmlFor="name">Name</label>
                    <input id="name" name="name" required autoComplete="name" placeholder="Your name" />
                  </div>
                  <div className="field">
                    <label className="mono" htmlFor="org">Organisation</label>
                    <input id="org" name="org" autoComplete="organization" placeholder="Optional" />
                  </div>
                </div>
                <div className="field">
                  <label className="mono" htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" required autoComplete="email" placeholder="you@organisation.com" />
                </div>
                <div className="field">
                  <label className="mono" htmlFor="message">Message</label>
                  <textarea id="message" name="message" required rows={5} placeholder="Tell us what you are working on" />
                </div>
                <div>
                  <button className="btn btn-solid" type="submit">
                    Send message <Arrow />
                  </button>
                </div>
              </form>
            )}
          </Fade>
        </div>
      </Zone>
    </div>
  );
}
