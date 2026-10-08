import { Link } from 'react-router';
import { PageHero, Quiet } from '../components/PageHero';
import { DomainGrid, DOMAIN_TONES } from '../components/DomainGrid';
import { Arrow, Eyebrow, Headline, Reveal } from '../components/ui';
import { Beams, Icon, Marquee, type IconName } from '../components/fx';
import { DOMAINS, TECHNOLOGY } from '../content';

const DOMAIN_ICONS: IconName[] = ['spark', 'layers', 'cpu', 'globe', 'shield', 'code2'];

export function Research() {
  return (
    <>
      <PageHero
        eyebrow="Research"
        tone="violet"
        title={['Six domains.', 'One intelligence.']}
        lede="Our research spans six connected domains. They are not separate products: each one strengthens every other, and all of them share one memory."
        visual={<Beams size={440} nodes={DOMAINS.map((d, i) => ({ label: d.name, icon: <Icon name={DOMAIN_ICONS[i]} size={17} />, tone: DOMAIN_TONES[i] }))} />}
      />
      <Quiet className="section section-tight research-domains-section">
        <div className="wrap">
          <DomainGrid link={false} />
        </div>
      </Quiet>
      <Quiet className="section research-fields-section">
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

