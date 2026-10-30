import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { PageHero, Quiet } from '../components/PageHero';
import { DomainGrid, DOMAIN_TONES } from '../components/DomainGrid';
import { Arrow, Headline, Reveal, BtnText } from '../components/ui';
import { Beams, Icon, Marquee, type IconName } from '../components/fx';
import { ResearchStory } from '../components/research/ResearchStory';
import { WIDE_QUERY } from '../gl/Scene';
import { DOMAINS, ECOSYSTEM, TECHNOLOGY } from '../content';

const DOMAIN_ICONS: IconName[] = ['spark', 'layers', 'cpu', 'globe', 'shield', 'code2'];

const STORY_QUERY = `${WIDE_QUERY} and (min-height: 560px) and (prefers-reduced-motion: no-preference)`;

/** The glass studio runs on desktop; compact screens and reduced motion retain the full plain page. */
export function Research() {
  const [story, setStory] = useState(() => window.matchMedia(STORY_QUERY).matches);
  const [failed, setFailed] = useState(false);
  const onFail = useCallback(() => setFailed(true), []);

  useEffect(() => {
    const query = window.matchMedia(STORY_QUERY);
    const update = () => setStory(query.matches);
    query.addEventListener('change', update);
    update();
    return () => query.removeEventListener('change', update);
  }, []);

  return story && !failed ? <ResearchStory onFail={onFail} /> : (
    <ResearchPlain />
  );
}

function ResearchPlain() {
  return (
    <>
      <PageHero
        tone="violet"
        title={['Six domains.', 'One intelligence.']}
        lede="Our research spans six connected domains."
        visual={<Beams size={440} nodes={DOMAINS.map((d, i) => ({ label: d.name, icon: <Icon name={DOMAIN_ICONS[i]} size={17} />, tone: DOMAIN_TONES[i] }))} />}
      />
      {/* the company's own words, as on the desktop story, before the domains they connect */}
      <Quiet className="section section-tight research-ecosystem-section">
        <div className="wrap research-ecosystem">
          <Headline tone="violet" lines={['One intelligence', 'ecosystem.']} />
          <div>
            <Reveal as="p" className="research-ecosystem-lead">
              {ECOSYSTEM.line} {ECOSYSTEM.intro}
            </Reveal>
            <ul className="research-ecosystem-list" aria-label="One intelligence ecosystem">
              {ECOSYSTEM.points.map((point, i) => (
                <Reveal as="li" key={point} delay={80 + i * 60}>
                  {point}
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </Quiet>
      <Quiet className="section section-tight research-domains-section">
        <div className="wrap">
          <DomainGrid link={false} numbered />
        </div>
      </Quiet>
      <Quiet className="section research-fields-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <Headline tone="violet" lines={['Where', 'we work.']} />
            </div>
            <Reveal className="section-head-link research-actions" delay={100}>
              <Link to="/contact" className="btn btn-primary">
                <BtnText>Propose a collaboration</BtnText> <Arrow />
              </Link>
              <Link to="/careers" className="btn btn-ghost">
                <BtnText>Join as a researcher</BtnText>
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

