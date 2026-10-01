import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { PageHero, Zone } from '../components/PageHero';
import { Lines, Kicker, Fade, Arrow } from '../components/Reveal';
import { AUDIENCES, PRINCIPLES } from '../content';
import { PhilosophyDiagram, PrinciplesRadar, AUDIENCE_CATEGORIES } from '../components/AboutDiagrams';

export function About() {
  const [hl, setHl] = useState<number | null>(null);
  const hlRef = useRef(hl);
  hlRef.current = hl;

  const [activeAudienceFilter, setActiveAudienceFilter] = useState<string | null>(null);

  return (
    <div className="page page-about">
      {/* ── Page Hero: Our Thesis ───────────────────────────────────────── */}
      <PageHero
        index="About"
        label="Our thesis"
        title={['Not another', 'AI model.']}
        lede="We are building the intelligence infrastructure on which future AI systems can collaborate, evolve and create new capabilities together."
        target={{ key: 'logo', pose: { x: 1.8 } }}
      >
        <div className="about-hero-pillars">
          <div className="about-hero-pillar">
            <span className="mono">01</span>
            <strong>Sovereign Memory</strong>
            <p>Persistent context across sessions, agents and models.</p>
          </div>
          <div className="about-hero-pillar">
            <span className="mono">02</span>
            <strong>Collaborative Swarms</strong>
            <p>Specialized systems orchestrated as one coherent brain.</p>
          </div>
          <div className="about-hero-pillar">
            <span className="mono">03</span>
            <strong>Continuous Evolution</strong>
            <p>Intelligence that self-improves through real-world deployment.</p>
          </div>
        </div>

        <div className="about-scroll-prompt">
          <a
            href="#philosophy"
            className="about-scroll-link"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('philosophy')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <span>Explore our philosophy</span>
            <span className="about-scroll-chevron">↓</span>
          </a>
        </div>
      </PageHero>

      {/* ── 01 Philosophy: Beyond Model Silos ───────────────────────────── */}
      <Zone
        id="philosophy"
        target={{ key: 'silos', pose: { x: 1.65, y: -0.05, s: 0.95 }, params: { alpha: 0.32, drift: 0.6 } }}
        className="section about-section"
      >
        <div className="wrap">
          <div className="about-split-grid">
            <div className="about-split-sidebar">
              <Kicker index="01">Philosophy</Kicker>
              <h2 className="about-section-heading">Beyond model silos.</h2>
              <div className="about-statement-stack">
                <Fade as="p" className="statement-block">
                  Today’s AI is powerful, but fragmented. <span>Each model operates alone. Each application solves a different problem. Knowledge rarely flows between them.</span>
                </Fade>
                <Fade as="p" className="statement-block" delay={100}>
                  We are researching intelligence that behaves more like the human brain: <span>many specialised systems, working together as one.</span>
                </Fade>
                <Fade as="p" className="about-body-lede" delay={150}>
                  This is the foundation of our work on Generative Intelligence: extending beyond Generative AI toward systems that generate new capabilities, not just content.
                </Fade>
              </div>
            </div>

            <div className="about-split-visual">
              <PhilosophyDiagram />
            </div>
          </div>
        </div>
      </Zone>

      {/* ── 02 & 03 Intent: Vision & Mission ────────────────────────────── */}
      <Zone
        id="vision"
        target={{ key: 'logo', pose: { x: 0, y: 0, s: 1.25 }, params: { dark: 1, alpha: 0.35, drift: 0.8 } }}
        className="section about-section about-vision-section"
      >
        <div className="wrap">
          <div className="about-center-head">
            <Kicker index="02 / 03">Intent</Kicker>
            <Lines as="h2" className="h1" lines={['Two pillars.', 'One direction.']} />
          </div>

          <div className="about-pillars-grid">
            {/* Vision Pillar */}
            <div className="about-pillar-card vision-card">
              <div className="about-pillar-head">
                <Kicker index="02">Vision</Kicker>
                <span className="about-pillar-tag">NORTH STAR</span>
              </div>
              <h3 className="about-pillar-display">
                To make intelligence as accessible as information.
              </h3>
              <p className="about-pillar-copy">
                Just as the web democratized information retrieval, the next era must democratize sovereign,
                high-order cognitive synthesis across every school, laboratory, and enterprise.
              </p>
              <div className="about-pillar-features">
                <span className="about-pill-feature">Universal Accessibility</span>
                <span className="about-pill-feature">Democratized Compute</span>
                <span className="about-pill-feature">Sovereign Deployment</span>
              </div>
            </div>

            {/* Mission Pillar */}
            <div className="about-pillar-card mission-card">
              <div className="about-pillar-head">
                <Kicker index="03">Mission</Kicker>
                <span className="about-pillar-tag">TECHNICAL OBJECTIVE</span>
              </div>
              <h3 className="about-pillar-display">
                To transform AI from isolated models into a unified ecosystem.
              </h3>
              <p className="about-pillar-copy">
                Engineering the foundational operating system where agents, models, and shared memory modules
                interconnect with continuous learning, autonomous reasoning, and verifiable integrity.
              </p>
              <div className="about-pillar-features">
                <span className="about-pill-feature">Continuous Learning</span>
                <span className="about-pill-feature">Persistent Memory</span>
                <span className="about-pill-feature">Autonomous Reasoning</span>
              </div>
            </div>
          </div>
        </div>
      </Zone>

      {/* ── 04 Principles: Six Principles ───────────────────────────────── */}
      <Zone
        id="principles"
        target={() => ({
          key: 'orbit6',
          pose: { x: 1.55, y: -0.02, s: 0.95 },
          params: { highlight: hlRef.current ?? -1, alpha: 0.42, drift: 0.8 },
        })}
        className="section about-section"
      >
        <div className="wrap">
          <div className="about-principles-layout">
            {/* Left Sticky Column */}
            <div className="about-principles-sidebar">
              <div className="about-sticky-box">
                <Kicker index="04">Principles</Kicker>
                <Lines className="h2" lines={['Six principles.', 'Every system.']} />
                <p className="about-principles-sub">
                  Every layer of Bharattech Origin is architected to uphold these foundational axioms.
                  Hover any principle to engage orbital telemetry.
                </p>
                <PrinciplesRadar activeIndex={hl} />
              </div>
            </div>

            {/* Right Interactive List */}
            <div className="about-principles-list" onMouseLeave={() => setHl(null)}>
              {PRINCIPLES.map((p, i) => (
                <div
                  key={p.title}
                  className={`about-principle-row ${hl === i ? 'is-active' : ''}`}
                  onMouseEnter={() => setHl(i)}
                >
                  <div className="about-p-num">
                    <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <div className="about-p-content">
                    <h3 className="about-p-title">{p.title}</h3>
                    <p className="about-p-body">{p.body}</p>
                  </div>
                  <div className="about-p-indicator" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Zone>

      {/* ── 05 Who we build for: Ecosystem Grid ─────────────────────────── */}
      <Zone
        id="audiences"
        target={{ key: 'globe', pose: { x: 1.45, y: -0.05, s: 1.05 }, params: { alpha: 0.4, drift: 1.0 } }}
        className="section about-section"
      >
        <div className="wrap">
          <div className="about-audiences-header">
            <Kicker index="05">Who we build for</Kicker>
            <Lines className="h1" lines={['Intelligence shaped', 'for every pioneer.']} />
            <p className="about-audiences-lede">
              The same foundational memory and reasoning engine underneath, calibrated for specialized workflows
              across industry, science, and governance.
            </p>
          </div>

          {/* 4 Core Stakeholder Cards */}
          <div className="about-stakeholder-grid">
            {AUDIENCE_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className={`about-stakeholder-card ${
                  activeAudienceFilter && !cat.audiences.includes(activeAudienceFilter) ? 'is-dimmed' : ''
                }`}
              >
                <div className="about-stakeholder-head">
                  <span className="about-category-badge">{cat.badge}</span>
                  <span className="mono about-stakeholder-metric">{cat.metric}</span>
                </div>
                <h3 className="about-stakeholder-title">{cat.title}</h3>
                <p className="about-stakeholder-desc">{cat.description}</p>
                <div className="about-stakeholder-tags">
                  {cat.audiences.map((aud) => (
                    <button
                      key={aud}
                      type="button"
                      className={`about-tag-pill ${activeAudienceFilter === aud ? 'is-selected' : ''}`}
                      onClick={() =>
                        setActiveAudienceFilter(activeAudienceFilter === aud ? null : aud)
                      }
                    >
                      {aud}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Complete Audience Filter Pill Bar */}
          <div className="about-all-audiences-bar">
            <span className="about-filter-label mono">EXPLORE ECOSYSTEM:</span>
            <div className="about-pills-row">
              <button
                type="button"
                className={`about-filter-btn ${activeAudienceFilter === null ? 'is-active' : ''}`}
                onClick={() => setActiveAudienceFilter(null)}
              >
                All Audiences
              </button>
              {AUDIENCES.map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`about-filter-btn ${activeAudienceFilter === a ? 'is-active' : ''}`}
                  onClick={() => setActiveAudienceFilter(activeAudienceFilter === a ? null : a)}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Zone>

      {/* ── 06 Continue: CTA Band ────────────────────────────────────────── */}
      <Zone
        target={{ key: 'layers', pose: { x: 1.55, y: -0.05, s: 0.9 }, params: { alpha: 0.38, drift: 0.8 } }}
        className="cta-band about-cta-band"
      >
        <div className="wrap">
          <div className="about-cta-content">
            <Kicker>Continue the journey</Kicker>
            <Lines className="h1" lines={['See the research', 'behind the thesis.']} />
            <p className="about-cta-sub">
              Explore our peer-reviewed whitepapers, mathematical memory architectures, and live experimental benchmarks in the laboratory.
            </p>
            <div className="about-cta-actions">
              <Link to="/research" className="btn btn-solid">
                Enter the lab <Arrow />
              </Link>
              <Link to="/#capabilities" className="btn btn-ghost">
                Explore capabilities
              </Link>
              <Link to="/careers" className="btn btn-ghost">
                Join the builders
              </Link>
            </div>
          </div>
        </div>
      </Zone>
    </div>
  );
}
