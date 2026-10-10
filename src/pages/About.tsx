import { Link } from 'react-router';
import { 
  ArrowUpRight, 
  Sparkles,
  ShieldCheck, 
  Award, 
  Building2, 
  Mail, 
  Globe 
} from 'lucide-react';
import { Reveal } from '../components/ui';
import { HowWeWorkPipeline } from '../components/HowWeWorkPipeline';
import { AWARDS, EMAIL, HQ, HQ_MAP, PRODUCTS } from '../content';
import '../styles/company-about.css';



const DRIVES = [
  {
    num: '01',
    title: 'Innovation at Our Core',
    body: 'We are driven by the challenge of turning ambitious frontiers into production reality. Every project pushes the boundaries of neural memory, persistent reasoning, and cognitive scale.',
  },
  {
    num: '02',
    title: 'Sovereign & National Impact',
    body: 'We believe cognitive intelligence and critical data must remain under sovereign custody. We build resilient architectures that empower India’s autonomous digital future.',
  },
  {
    num: '03',
    title: 'Technology for Good & Access',
    body: 'Democratizing advanced tools, localized learning, and enterprise search so that startups, researchers, and grassroots students all share in the progress.',
  },
  {
    num: '04',
    title: 'Continuous Research & Evolution',
    body: 'In a rapidly advancing deep-tech landscape, our research labs continuously benchmark, fine-tune, and evolve multi-model architectures designed for compounding intelligence.',
  },
];

const REASONS = [
  {
    num: '01',
    title: 'AI-First Sovereign Innovation',
    body: 'We don’t merely assemble third-party wrappers; we architect intelligent systems that remember, reason, and adapt. With proprietary models like BharatAI and BSearch, we deliver true cognitive independence.',
  },
  {
    num: '02',
    title: 'Full-Stack Ecosystem Synergy',
    body: 'From grassroots higher education with CollegeCue to developer community platforms with Recag and unified search, every product shares one knowledge fabric and compounds value over time.',
  },
  {
    num: '03',
    title: 'Proven Track Record & Honors',
    body: 'Launched by the Hon’ble Prime Minister Shri Narendra Modi, vetted through the MeitY Open Challenge, and represented at international forums, we combine technical excellence with measurable national impact.',
  },
];

const AWARD_COPY = [
  'Launching of BSearch by PM Shri Narendra Modi and recognition among top tech startups in the state.',
  'Official representation of Bharattech at the UP International Trade Show 2023.',
  'National participation and selection of Bharattech in the Indian Web Browser Development Challenge.',
  'Honored participant in the Ministry of Electronics & IT (MeitY) Open Challenge Program.',
];

export function About() {
  return (
    <div className="company-about-page">
      {/* ── 1. CLEAN EDITORIAL HERO (NATURAL BACKGROUND) ── */}
      <section className="about-hero-section">
        <div className="wrap">
          <div className="about-hero-content">
            <Reveal as="h1" className="about-hero-title" delay={60}>
              More than developers <br />
              <span className="hero-accent">builders of sovereign intelligence</span>
            </Reveal>
            
            <Reveal as="p" className="about-hero-lead" delay={120}>
              Founded with a vision to democratize advanced technology across Bharat and beyond, we bridge the gap between sovereign AI research, complex compute, and transformative human progress.
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 2. SECTION: WHO WE ARE & WHAT DRIVES US ── */}
      <section className="section about-overview-section" id="overview">
        <div className="wrap about-overview-grid">
          <div className="about-who-sticky">
            <Reveal as="h2" className="about-section-h2">
              Who we are
            </Reveal>
            <Reveal as="p" className="about-who-lead">
              At Bharattech Techecosystem, we’re more than just software engineers; we are builders of sovereign intelligence and foundational deep-tech.
            </Reveal>
            <Reveal as="p" className="about-who-sub">
              We are a passionate team of technologists, researchers, and systems thinkers who believe in the power of sovereign AI, persistent memory, and accessible technology to reshape industries.
            </Reveal>

            <Reveal className="about-callout-card" delay={100}>
              <Sparkles className="about-callout-icon" size={18} />
              <p className="about-callout-text">
                “When India innovates, the world listens. We build foundational infrastructure designed to endure for decades.”
              </p>
            </Reveal>

            <Reveal className="about-chips-row" delay={140}>
              {PRODUCTS.map((prod) => (
                <span key={prod} className="about-chip">{prod}</span>
              ))}
            </Reveal>
          </div>

          <div className="about-drives-col">
            <Reveal as="h2" className="about-section-h2">
              What drives us
            </Reveal>
            {DRIVES.map((d, index) => (
              <Reveal key={d.title} className="about-drives-card" delay={index * 60}>
                <h3>{d.title}</h3>
                <p>{d.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. SECTION: WHY CHOOSE US (REASON MATRIX) ── */}
      <section className="section about-why-section" id="why">
        <div className="wrap">
          <div className="about-why-header">
            <Reveal as="h2">
              Why Bharattech
            </Reveal>
            <Reveal as="p" delay={80}>
              Built for sovereign trust, deep craft, and enduring scale.
            </Reveal>
          </div>

          <div className="about-reasons-matrix">
            {REASONS.map((r, i) => (
              <Reveal key={r.title} className="about-reason-col" delay={i * 70}>
                <h3>{r.title}</h3>
                <p>{r.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. SECTION: LEADERSHIP MANIFESTO QUOTE (NATURAL CARD) ── */}
      <section className="about-quote-section" id="manifesto">
        <div className="wrap">
          <div className="about-quote-panel">
            <span className="about-quote-glyph" aria-hidden="true">“</span>
            <Reveal as="blockquote" className="about-quote-text">
              We harness deep research, sovereign compute, and purposeful engineering to build technology that elevates our nation and scales globally. When you build with conviction for India, you build for the future of humanity.
            </Reveal>

            <Reveal className="about-quote-author" delay={80}>
              <div className="about-author-avatar">BT</div>
              <div className="about-author-info">
                <div className="about-author-name">
                  Bharattech Leadership & Research Council
                  <ShieldCheck size={15} color="var(--violet)" />
                </div>
                <div className="about-author-role">
                  Sovereign Deep-Tech · Made in Bharat
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 5. SECTION: "HOW WE WORK" SCROLL-PINNED PIPELINE ── */}
      <section className="about-process-section" id="process">
        <div className="wrap">
          <HowWeWorkPipeline />
        </div>
      </section>

      {/* ── 6. SECTION: NATIONAL AWARDS & HONORS ── */}
      <section className="section about-awards-section" id="awards">
        <div className="wrap">
          <div className="about-awards-head">
            <Reveal as="h2">
              Awards
            </Reveal>
            <Reveal as="p" delay={80}>
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
                  <p>{AWARD_COPY[index] || award.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. SECTION: CONTACT & CONNECTIVITY (NATURAL ELEGANCE) ── */}
      <section className="about-contact-section" id="connect">
        <div className="wrap">
          <div className="about-contact-card">
            <div className="about-contact-grid">
              <div className="about-contact-copy">
                <h2>
                  Let’s connect and build smarter, faster, and sovereign — together.
                </h2>
                <p>
                  Whether you are an enterprise seeking cognitive automation, an academic institution exploring research fellowships, or a technologist eager to build sovereign infrastructure.
                </p>
                <div className="about-contact-actions">
                  <Link to="/contact" className="btn btn-primary">
                    Start a Conversation <ArrowUpRight size={15} />
                  </Link>
                  <Link to="/careers" className="btn btn-ghost">
                    Explore Careers
                  </Link>
                </div>
              </div>

              <div className="about-contact-details">
                <div className="about-detail-item">
                  <Mail className="about-detail-icon" size={18} />
                  <div className="about-detail-text">
                    <span>Direct Inquiries</span>
                    <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
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
