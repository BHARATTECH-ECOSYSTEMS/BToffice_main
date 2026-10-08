import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { PageHero, Quiet } from '../components/PageHero';
import { DomainGrid, DOMAIN_TONES } from '../components/DomainGrid';
import { MetricsArt, WorkflowArt } from '../components/art';
import { Arrow, Eyebrow, Headline, Reveal } from '../components/ui';
import { Beams, Icon, Marquee, type IconName } from '../components/fx';
import { DOMAINS, TECHNOLOGY } from '../content';

const DOMAIN_ICONS: IconName[] = ['spark', 'layers', 'cpu', 'globe', 'shield', 'code2'];

export function Research() {
  const rivinity = DOMAINS[0];
  return (
    <>
      <PageHero
        eyebrow="Research"
        tone="emerald"
        title={['Six domains.', 'One intelligence.']}
        lede="Our research spans six connected domains. They are not separate products: each one strengthens every other, and all of them share one memory."
        visual={<Beams size={440} nodes={DOMAINS.map((d, i) => ({ label: d.name, icon: <Icon name={DOMAIN_ICONS[i]} size={17} />, tone: DOMAIN_TONES[i] }))} />}
      />
      <Quiet className="section section-tight">
        <div className="wrap">
          <DomainGrid link={false} />
        </div>
      </Quiet>
      <Quiet className="section section-ink">
        <div className="wrap">
          <div className="section-head">
            <div>
              <Eyebrow tone="violet">Flagship programme</Eyebrow>
              <Headline tone="violet" lines={[rivinity.name, 'learns after it ships.']} />
            </div>
            <Reveal as="p" className="lede" delay={100}>
              {rivinity.body}
            </Reveal>
          </div>
          <div className="bento">
            <Reveal className="cell cell-glass" style={{ gridColumn: 'span 7' }}>
              <p className="cell-label">Agents that inherit memory</p>
              <WorkflowArt />
            </Reveal>
            <Reveal className="cell cell-glass" style={{ gridColumn: 'span 5' }} delay={90}>
              <p className="cell-label">Watched in production</p>
              <MetricsArt />
            </Reveal>
            {rivinity.focus.map((f, i) => (
              <Reveal key={f} className="cell cell-glass focus-cell" style={{ gridColumn: 'span 4', '--tone': DOMAIN_TONES[i] } as CSSProperties} delay={i * 60}>
                <span className="num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{f}</h3>
              </Reveal>
            ))}
            <Reveal className="cell cell-glass focus-cell is-cta" style={{ gridColumn: 'span 4' }} delay={320}>
              <Link to="/contact" className="cell-link">
                <h3>Collaborate on Rivinity</h3>
                <span className="cell-go">
                  Get in touch <Arrow />
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </Quiet>
      <Quiet>
        <div className="wrap">
          <Reveal as="p" className="statement">
            Research improves every model. Memory is shared. <span>Specialised systems collaborate, knowledge flows continuously, and new capabilities emerge through interaction.</span>
          </Reveal>
        </div>
      </Quiet>
      <Quiet>
        <div className="wrap">
          <div className="section-head">
            <div>
              <Eyebrow tone="violet">Fields</Eyebrow>
              <Headline tone="violet" lines={['Where', 'we work.']} />
            </div>
            <Reveal className="section-head-link" delay={100}>
              <Link to="/contact" className="btn btn-primary">
                Propose a collaboration <Arrow />
              </Link>
            </Reveal>
          </div>
        </div>
        <div className="fields-marquee">
          <Marquee speed={60}>
            {TECHNOLOGY.slice(0, 7).map((t) => (
              <span key={t} className="field-pill">{t}</span>
            ))}
          </Marquee>
          <Marquee speed={50} reverse>
            {TECHNOLOGY.slice(7).map((t) => (
              <span key={t} className="field-pill">{t}</span>
            ))}
          </Marquee>
        </div>
      </Quiet>
    </>
  );
}
