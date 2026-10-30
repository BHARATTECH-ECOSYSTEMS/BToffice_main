import { Link } from 'react-router';
import { 
  ArrowUpRight, 
  Award, 
  Building2, 
  Mail, 
  Globe 
} from 'lucide-react';
import { Reveal, BtnText, Arrow } from '../components/ui';
import { PageHero } from '../components/PageHero';
import { HowWeWorkPipeline } from '../components/HowWeWorkPipeline';
import { AWARDS, BUILD_FOR, EMAIL, EMAIL_HREF, HQ, HQ_MAP, MISSION, POSITIONING, PRINCIPLES, PRODUCTS, VISION } from '../content';



const DRIVES = [
  {
    title: 'Innovation at Our Core',
    body: 'We are driven by the challenge of turning ambitious frontiers into production reality. Every project pushes the boundaries of neural memory, persistent reasoning, and cognitive scale.',
  },
  {
    title: 'Sovereign & National Impact',
    body: 'We believe cognitive intelligence and critical data must remain under sovereign custody. We build resilient architectures that empower India’s autonomous digital future.',
  },
  {
    title: 'Technology for Good & Access',
    body: 'Democratizing advanced tools, localized learning, and enterprise search so that startups, researchers, and grassroots students all share in the progress.',
  },
  {
    title: 'Continuous Research & Evolution',
    body: 'In a rapidly advancing deep-tech landscape, our research labs continuously benchmark, fine-tune, and evolve multi-model architectures designed for compounding intelligence.',
  },
];

const REASONS = [
  {
    title: 'AI-First Sovereign Innovation',
    body: 'We don’t merely assemble third-party wrappers; we architect intelligent systems that remember, reason, and adapt. With proprietary models like BharatAI and BSearch, we deliver true cognitive independence.',
  },
  {
    title: 'Full-Stack Ecosystem Synergy',
    body: 'From foundation models to unified search, every product shares one knowledge fabric and compounds value over time.',
  },
  {
    title: 'Proven Track Record & Honors',
    body: 'Launched by the Hon’ble Prime Minister Shri Narendra Modi, vetted through the MeitY Open Challenge, and represented at international forums, we combine technical excellence with measurable national impact.',
  },
];

export function About() {
  return (
    <div className="company-about-page">
      {/* the same hero as every other inner page */}
      <PageHero
        tone="violet"
        title={['More than developers,', 'builders of sovereign intelligence.']}
        lede="Founded with a vision to democratize advanced technology across Bharat and beyond, we bridge the gap between sovereign AI research, complex compute, and transformative human progress."
      />

      {/* ── 2. SECTION: WHO WE ARE & WHAT DRIVES US ── */}
      <section className="section about-overview-section" id="overview">
        <div className="wrap about-overview-grid">
          <div className="about-who-sticky">
            <Reveal as="h2" className="h2">
              Who we are
            </Reveal>
            <Reveal as="p" className="about-who-lead">
              {POSITIONING}
            </Reveal>
            <Reveal as="p" className="about-who-sub">
              We are a passionate team of technologists, researchers, and systems thinkers who believe in the power of sovereign AI, persistent memory, and accessible technology to reshape industries.
            </Reveal>

            <Reveal className="about-chips-row" delay={140}>
              {PRODUCTS.map((prod) => (
                <span key={prod} className="about-chip">{prod}</span>
              ))}
            </Reveal>
          </div>

          <div className="about-drives-col">
            <Reveal as="h2" className="h2">
              What drives us
            </Reveal>
            {DRIVES.map((d, index) => (
              <Reveal as="article" key={d.title} className="about-drives-card" delay={index * 60}>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── VISION, MISSION AND PRINCIPLES: the company's own words (its written brief) ── */}
      <section className="section about-overview-section" id="vision">
        <div className="wrap about-overview-grid">
          <div className="about-who-sticky">
            <Reveal as="h2" className="h2">
              Vision
            </Reveal>
            <Reveal as="p" className="about-who-lead">
              {VISION.line}
            </Reveal>
            <Reveal as="p" className="about-who-sub">
              {VISION.body}
            </Reveal>
            <Reveal as="h2" className="h2 about-mission-head" delay={80}>
              Mission
            </Reveal>
            <Reveal as="p" className="about-who-lead" delay={80}>
              {MISSION}
            </Reveal>
          </div>

          <div className="about-drives-col">
            <Reveal as="h2" className="h2">
              Our principles
            </Reveal>
            {PRINCIPLES.map((principle, index) => (
              <Reveal as="article" key={principle} className="about-drives-card" delay={index * 60}>
                <h3>{principle}</h3>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHO WE BUILD FOR: everyone the brief names ── */}
      <section className="section" id="build-for">
        <div className="wrap">
          <div className="section-head">
            <div>
              <Reveal as="h2" className="h2">
                Who we build for
              </Reveal>
            </div>
          </div>
          <Reveal as="ul" className="about-chips-row" aria-label="Who we build for">
            {BUILD_FOR.map((who) => (
              <li key={who} className="about-chip">
                {who}
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── 3. SECTION: WHY CHOOSE US (REASON MATRIX) ── */}
      <section className="section about-why-section" id="why">
        <div className="wrap">
          <div className="section-head">
            <div>
              <Reveal as="h2" className="h2">
                Why Bharattech
              </Reveal>
            </div>
            <Reveal as="p" className="lede" delay={80}>
              Built for sovereign trust, deep craft, and enduring scale.
            </Reveal>
          </div>

          <div className="about-reasons-matrix">
            {REASONS.map((r, i) => (
              <Reveal as="article" key={r.title} className="about-reason-col" delay={i * 70}>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. SECTION: "HOW WE WORK" SCROLL-PINNED PIPELINE ── */}
      {/* Full-bleed on purpose: the pinned sheet fills the viewport, not the content column. */}
      <section className="about-process-section" id="process">
        <HowWeWorkPipeline />
      </section>

      {/* ── 6. SECTION: NATIONAL AWARDS & HONORS ── */}
      <section className="section about-awards-section" id="awards">
        <div className="wrap">
          <div className="section-head">
            <div>
              <Reveal as="h2" className="h2">
                Awards
              </Reveal>
            </div>
            <Reveal as="p" className="lede" delay={80}>
              Bharattech is establishing a sovereign benchmark for technology innovation recognized across India's leading national forums.
            </Reveal>
          </div>

          <div className="about-awards-grid">
            {AWARDS.map((award, index) => (
              <Reveal key={award.title} className="about-award-card" delay={index * 50}>
                <div>
                  <div className="about-award-top">
                    <Award className="about-award-badge-icon" size={22} />
                  </div>
                  <h3>{award.title}</h3>
                  <p>{award.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. SECTION: CONTACT & CONNECTIVITY (NATURAL ELEGANCE) ── */}
      <section className="section about-contact-section" id="connect">
        <div className="wrap">
          <div className="about-contact-card">
            <div className="about-contact-grid">
              <div className="about-contact-copy">
                <h2 className="h2">
                  Let’s connect and build smarter, faster, and sovereign together.
                </h2>
                <p>
                  Whether you are an enterprise seeking cognitive automation, an academic institution exploring research fellowships, or a technologist eager to build sovereign infrastructure.
                </p>
                <div className="about-contact-actions">
                  <Link to="/contact" className="btn btn-primary">
                    <BtnText>Start a Conversation</BtnText> <Arrow dir="up-right" />
                  </Link>
                  <Link to="/careers" className="btn btn-ghost">
                    <BtnText>Explore Careers</BtnText>
                  </Link>
                </div>
              </div>

              <div className="about-contact-details">
                <div className="about-detail-item">
                  <Mail className="about-detail-icon" size={18} />
                  <div className="about-detail-text">
                    <span>Direct Inquiries</span>
                    <a href={EMAIL_HREF} target="_blank" rel="noopener noreferrer">{EMAIL}</a>
                  </div>
                </div>

                <div className="about-detail-item">
                  <Building2 className="about-detail-icon" size={18} />
                  <div className="about-detail-text">
                    <span>Headquarters</span>
                    <p>{HQ}</p>
                  </div>
                </div>

                <div className="about-detail-item">
                  <Globe className="about-detail-icon" size={18} />
                  <div className="about-detail-text">
                    <span>Directions</span>
                    <a href={HQ_MAP} target="_blank" rel="noreferrer">
                      View on Google Maps <ArrowUpRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
