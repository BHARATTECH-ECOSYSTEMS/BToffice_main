import { useState } from 'react';
import { PageHero, Zone } from '../components/PageHero';
import { Fade, Arrow, Lines } from '../components/Reveal';
import { EMAIL } from '../content';
import {
  Mail,
  MapPin,
  FlaskConical,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const NEEDS = [
  'Foundation Models',
  'Research Collaboration',
  'Enterprise Intelligence',
  'Rivinity & RECAG',
  'Fellowships & Careers',
  'Press & Media',
];

const FAQS = [
  {
    q: 'What makes Bharattech Origin different from other technology companies?',
    a: 'Bharattech Origin is building an Indian foundational operating system for intelligence. Rather than building superficial wrapper apps, our research focuses on deep architectural layers: persistent neural memory, multi-turn spatial and logical reasoning, and models trained to solve foundational problems.',
  },
  {
    q: 'How do you partner with institutions and enterprises?',
    a: 'We partner through joint research programmes, sponsored fellowships with top academic institutions, and enterprise early-access deployments for teams building on top of Origin’s intelligence infrastructure.',
  },
  {
    q: 'Are you hiring researchers and systems engineers?',
    a: 'Yes. We are always looking for researchers, systems engineers, and mathematicians who would rather spend a decade on the right problem than a quarter on the easy one. Explore our open positions on the Careers page.',
  },
  {
    q: 'How quickly can I expect a response to my enquiry?',
    a: 'Every message submitted through our brief or sent directly to our email is reviewed by an actual member of our team. You can expect a thoughtful response within 24 to 48 business hours.',
  },
];

export function Contact() {
  const [selectedNeed, setSelectedNeed] = useState(NEEDS[0]);
  const [sent, setSent] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaq((cur) => (cur === idx ? null : idx));
  };

  const scrollToBrief = (e: React.MouseEvent) => {
    e.preventDefault();
    document.getElementById('brief')?.scrollIntoView({ behavior: 'smooth' });
  };

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = `Need: ${selectedNeed}\n\nMessage:\n${f.get('message')}\n\nFrom: ${f.get('name')}${f.get('company') ? `, ${f.get('company')}` : ''}\nEmail: ${f.get('email')}`;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(`${selectedNeed}: ${f.get('name')}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  return (
    <div className="page page-contact">
      {/* ───────────────────────────────────────────────────────────────────
          1. Hero Header
          ─────────────────────────────────────────────────────────────────── */}
      <PageHero
        title={['Reach us', 'at anytime.']}
        lede="Feel free to email us directly with research or technical enquiries, or submit a brief below. Every message is read by our team."
        target={{ key: 'field', params: { alpha: 0 } }}
      >
        <div className="contact-hero-ctas">
          <a href="#brief" className="btn btn-solid" onClick={scrollToBrief}>
            Send a brief <Arrow dir="down" size={13} />
          </a>
          <a href={`mailto:${EMAIL}`} className="contact-hero-mail">
            <Mail size={16} strokeWidth={2} />
            <span>{EMAIL}</span>
          </a>
        </div>
      </PageHero>

      {/* ───────────────────────────────────────────────────────────────────
          2. Main Contact Grid (Ways to connect + Brief form)
          ─────────────────────────────────────────────────────────────────── */}
      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="section contact-main-section" id="brief">
        <div className="wrap">
          <div className="contact-grid-layout">
            {/* Left Column: Ways to connect */}
            <div className="contact-ways-col">
              <Fade>
                <div className="contact-eyebrow">
                  <span className="contact-live-dot" aria-hidden="true" />
                  <span>Get in Touch</span>
                </div>
              </Fade>

              <Fade delay={60}>
                <h2 className="contact-ways-title">
                  Let's connect and build the next era of intelligence together.
                </h2>
              </Fade>

              <Fade delay={120}>
                <ul className="contact-ways-list">
                  <li>
                    <a className="contact-way-card" href={`mailto:${EMAIL}`}>
                      <span className="contact-way-icon">
                        <Mail size={20} strokeWidth={1.8} />
                      </span>
                      <span className="contact-way-info">
                        <span className="contact-way-desc">
                          Feel free to email us if you have questions or need technical details!
                        </span>
                        <span className="contact-way-val">{EMAIL}</span>
                      </span>
                    </a>
                  </li>

                  <li>
                    <a className="contact-way-card" href="#brief" onClick={scrollToBrief}>
                      <span className="contact-way-icon">
                        <FlaskConical size={20} strokeWidth={1.8} />
                      </span>
                      <span className="contact-way-info">
                        <span className="contact-way-desc">
                          For universities, research institutions, and foundational partners.
                        </span>
                        <span className="contact-way-val">Research Collaboration</span>
                      </span>
                    </a>
                  </li>

                  <li>
                    <a
                      className="contact-way-card"
                      href="https://maps.google.com/?q=Kanpur,+Uttar+Pradesh,+India"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className="contact-way-icon">
                        <MapPin size={20} strokeWidth={1.8} />
                      </span>
                      <span className="contact-way-info">
                        <span className="contact-way-desc">Origin Office & Headquarters</span>
                        <span className="contact-way-val">Kanpur, Uttar Pradesh, India</span>
                      </span>
                    </a>
                  </li>
                </ul>
              </Fade>
            </div>

            {/* Right Column: Interactive Brief Form */}
            <Fade delay={80}>
              <div className="contact-brief-card">
                {sent ? (
                  <div className="brief-sent">
                    <span className="brief-sent-icon">
                      <CheckCircle2 size={32} strokeWidth={2} />
                    </span>
                    <Lines className="h3" lines={['Your brief is ready', 'in your email client.']} show />
                    <p className="brief-note">
                      If your email app did not open automatically, write to us directly at <b>{EMAIL}</b>.
                    </p>
                    <button className="btn btn-solid" style={{ marginTop: 12 }} onClick={() => setSent(false)}>
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form className="brief-form" onSubmit={submit}>
                    <h3 className="brief-title">Tell us about your project</h3>

                    {/* Chips: What do you need? */}
                    <fieldset className="brief-fieldset">
                      <legend className="brief-legend">What do you need?</legend>
                      <div className="brief-chips">
                        {NEEDS.map((need) => (
                          <button
                            type="button"
                            key={need}
                            className={`brief-chip ${selectedNeed === need ? 'is-active' : ''}`}
                            onClick={() => setSelectedNeed(need)}
                          >
                            {need}
                          </button>
                        ))}
                      </div>
                    </fieldset>

                    {/* Input Row: Name & Work Email */}
                    <div className="brief-row">
                      <div className="brief-field">
                        <label className="brief-label" htmlFor="brief-name">
                          Your name
                        </label>
                        <input
                          id="brief-name"
                          name="name"
                          className="brief-input"
                          required
                          autoComplete="name"
                          placeholder="Your full name"
                        />
                      </div>
                      <div className="brief-field">
                        <label className="brief-label" htmlFor="brief-email">
                          Work email
                        </label>
                        <input
                          id="brief-email"
                          name="email"
                          type="email"
                          className="brief-input"
                          required
                          autoComplete="email"
                          placeholder="name@organisation.com"
                        />
                      </div>
                    </div>

                    {/* Company / Organisation */}
                    <div className="brief-field">
                      <label className="brief-label" htmlFor="brief-company">
                        Company or institution <em>(optional)</em>
                      </label>
                      <input
                        id="brief-company"
                        name="company"
                        className="brief-input"
                        autoComplete="organization"
                        placeholder="e.g. Research Institute / Enterprise"
                      />
                    </div>

                    {/* Problem / Message */}
                    <div className="brief-field">
                      <label className="brief-label" htmlFor="brief-message">
                        The problem, in a few lines
                      </label>
                      <textarea
                        id="brief-message"
                        name="message"
                        className="brief-textarea"
                        required
                        rows={4}
                        placeholder="What are you building or researching, and where does it get stuck?"
                      />
                    </div>

                    {/* Action & Note */}
                    <div className="brief-footer">
                      <button className="btn btn-solid" type="submit">
                        Send the brief <Arrow size={13} />
                      </button>
                      <p className="brief-note">
                        We only use your details to reply to you. Every message is read by a person on our team.
                      </p>
                    </div>
                  </form>
                )}
              </div>
            </Fade>
          </div>
        </div>
      </Zone>

      {/* ───────────────────────────────────────────────────────────────────
          3. Visit / Office Location Section
          ─────────────────────────────────────────────────────────────────── */}
      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="section contact-visit-section" id="visit">
        <div className="wrap">
          <div className="contact-visit-grid">
            <Fade>
              <a
                className="visit-map-card"
                href="https://maps.google.com/?q=Kanpur,+Uttar+Pradesh,+India"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open location in Google Maps"
              >
                <svg className="visit-map-svg" viewBox="0 0 520 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
                  <defs>
                    <pattern id="origin-map-dots" width="16" height="16" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="1.1" fill="currentColor" opacity="0.18" />
                    </pattern>
                    <radialGradient id="origin-glow" cx="0.5" cy="0.48" r="0.5">
                      <stop offset="0%" stopColor="#7c4dff" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#7c4dff" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  <rect width="520" height="320" fill="var(--paper)" />
                  <rect width="520" height="320" fill="url(#origin-map-dots)" />
                  <g stroke="var(--line)" strokeWidth="1.5" fill="none" opacity="0.6">
                    <path d="M0 60h520" /><path d="M0 160h520" strokeWidth="2.5" /><path d="M0 260h520" />
                    <path d="M120 0v320" /><path d="M260 0v320" strokeWidth="2.5" /><path d="M400 0v320" />
                    <path d="M40 320L480 0" strokeDasharray="4 6" />
                  </g>
                  <circle cx="260" cy="160" r="90" fill="url(#origin-glow)" />
                  <circle cx="260" cy="160" r="32" fill="none" stroke="#7c4dff" strokeWidth="1.5" opacity="0.4" />
                  <circle cx="260" cy="160" r="14" fill="#7c4dff" opacity="0.25" />
                  <circle cx="260" cy="160" r="6" fill="#7c4dff" />
                  <g transform="translate(260, 105)">
                    <rect width="216" height="54" rx="12" fill="var(--paper, #fffdf9)" stroke="var(--line, rgba(0, 0, 0, 0.12))" strokeWidth="1" />
                    <text x="14" y="24" fill="var(--ink, #16141c)" fontSize="12" fontWeight="700" fontFamily="sans-serif">Bharattech Origin</text>
                    <text x="14" y="40" fill="var(--ink-2, #6b6678)" fontSize="10" fontFamily="sans-serif">Kanpur, Uttar Pradesh, India</text>
                  </g>
                </svg>
                <div className="visit-map-badge">
                  <span className="visit-map-badge-dot" />
                  <span>Kanpur, India · Open in Maps</span>
                </div>
              </a>
            </Fade>

            <div className="visit-copy">
              <Fade delay={40}>
                <div className="contact-eyebrow">
                  <span className="contact-live-dot" />
                  <span>Office Location</span>
                </div>
              </Fade>

              <Fade delay={80}>
                <h2 className="visit-title">Visit our office in Kanpur</h2>
              </Fade>

              <Fade delay={120}>
                <p className="visit-lead">
                  Bharattech Origin Office & Innovation Hub, Kanpur, Uttar Pradesh, India. Building the sovereign intelligence layer.
                </p>
              </Fade>

              <Fade delay={160}>
                <div className="visit-ctas">
                  <a
                    className="btn btn-solid"
                    href="https://maps.google.com/?q=Kanpur,+Uttar+Pradesh,+India"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Get directions</span>
                    <ExternalLink size={13} style={{ marginLeft: 6 }} />
                  </a>
                  <a className="contact-hero-mail" href={`mailto:${EMAIL}`}>
                    <Mail size={16} strokeWidth={2} />
                    <span>Email our office</span>
                  </a>
                </div>
              </Fade>
            </div>
          </div>
        </div>
      </Zone>

      {/* ───────────────────────────────────────────────────────────────────
          4. FAQ Accordion Section
          ─────────────────────────────────────────────────────────────────── */}
      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="section contact-faq-section" id="faq">
        <div className="wrap">
          <div className="contact-faq-grid">
            <div className="contact-faq-head">
              <Fade>
                <div className="contact-eyebrow">
                  <Sparkles size={14} color="var(--violet)" />
                  <span>Common Queries</span>
                </div>
              </Fade>
              <Fade delay={60}>
                <h2 className="contact-faq-title">Questions, answered</h2>
              </Fade>
              <Fade delay={100}>
                <p className="visit-lead" style={{ fontSize: '0.96rem' }}>
                  Still curious? Write to us directly at{' '}
                  <a className="link" href={`mailto:${EMAIL}`}>
                    {EMAIL}
                  </a>
                </p>
              </Fade>
            </div>

            <div className="contact-faq-list">
              {FAQS.map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <Fade key={faq.q} delay={idx * 60}>
                    <div className={`faq-card ${isOpen ? 'is-open' : ''}`}>
                      <button
                        type="button"
                        className="faq-trigger"
                        onClick={() => toggleFaq(idx)}
                        aria-expanded={isOpen}
                      >
                        <span className="faq-trigger-left">
                          <span className="faq-num">0{idx + 1}</span>
                          <span>{faq.q}</span>
                        </span>
                        <span className="faq-icon" aria-hidden="true">
                          <ChevronDown size={15} strokeWidth={2.2} />
                        </span>
                      </button>
                      {isOpen && <div className="faq-body">{faq.a}</div>}
                    </div>
                  </Fade>
                );
              })}
            </div>
          </div>
        </div>
      </Zone>
    </div>
  );
}
