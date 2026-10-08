import { Link } from 'react-router';
import { PageHero, Quiet } from '../components/PageHero';
import type { CSSProperties } from 'react';
import { Arrow, Eyebrow, Headline, Reveal, toneStyle, useInView } from '../components/ui';
import { DomainArt } from '../components/art';
import { AWARDS, PRINCIPLES, PRODUCTS, VALUES } from '../content';
import type { HueName } from '../gl/palette';
import { Beams, Icon, Marquee, type IconName } from '../components/fx';

const PRINCIPLE_ICONS: IconName[] = ['book', 'spark', 'users', 'shield', 'cloud', 'globe'];
const VALUE_ICONS: IconName[] = ['clock', 'layers', 'spark', 'rocket'];

const PRINCIPLE_TONES: HueName[] = ['cobalt', 'emerald', 'tangerine', 'violet', 'saffron', 'pink'];
/** Each principle borrows the research drawing closest to it: memory rings, routes, sensors, a watch, a chip, the world. */
const PRINCIPLE_ART = [0, 1, 2, 4, 5, 3];
const VALUE_TONES: HueName[] = ['violet', 'cobalt', 'emerald', 'tangerine'];

/** The milestones on one line that draws itself; each stop rises in turn. */
function Track() {
  const [ref, inView] = useInView<HTMLOListElement>('0px 0px -20% 0px');
  return (
    <ol className="track" ref={ref} data-in={inView || undefined}>
      {AWARDS.map((a, i) => (
        <li key={a.title} style={{ '--k': i } as CSSProperties}>
          <span className="track-year">{a.year}</span>
          <span className="track-dot" aria-hidden="true" />
          <div className="track-card">
            <h3>{a.title}</h3>
            <p>{a.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function About() {
  return (
    <>
      <PageHero
        eyebrow="About"
        tone="saffron"
        title={['Deep technology,', 'designed in India.']}
        lede="Bharattech builds technology for meaningful, widespread impact. Origin is our research lab for the layer underneath it all: an operating system for intelligence."
        object="globe"
      />

      <Quiet>
        <div className="wrap">
          <div className="bento about-bento">
            <Reveal className="cell about-story">
              <p className="cell-label">Our story</p>
              <h3>Leading India’s deep-tech revolution.</h3>
              <p>
                Bharattech Techecosystem Pvt. Ltd. builds technology tailored to the nation’s needs. Our products make technology accessible, affordable and useful for
                businesses, startups and individuals across India.
              </p>
              <div className="product-strip">
                <Marquee speed={22}>
                  {PRODUCTS.map((p) => (
                    <span key={p} className="product-pill">
                      <i aria-hidden="true" />
                      {p}
                    </span>
                  ))}
                </Marquee>
              </div>
            </Reveal>
            <Reveal className="cell about-story" delay={80}>
              <p className="cell-label">Our community</p>
              <h3>Building a thriving tech community.</h3>
              <p>
                We work with educational institutions, government bodies and industry to support startups, students and innovators, and to grow technology in step with
                India’s goals.
              </p>
              <Beams
                size={300}
                nodes={[
                  { label: 'Institutions', icon: <Icon name="cap" size={16} />, tone: 'var(--emerald)' },
                  { label: 'Government', icon: <Icon name="landmark" size={16} />, tone: 'var(--saffron)' },
                  { label: 'Industry', icon: <Icon name="building" size={16} />, tone: 'var(--cobalt)' },
                  { label: 'Startups', icon: <Icon name="rocket" size={16} />, tone: 'var(--pink)' },
                  { label: 'Students', icon: <Icon name="users" size={16} />, tone: 'var(--tangerine)' },
                ]}
              />
            </Reveal>
            <Reveal className="cell cell-ink about-quote" delay={140}>
              <p className="about-quote-text">“People remain the constant. Technology exists to amplify human potential.”</p>
              <p className="cell-label">From our principles</p>
            </Reveal>
          </div>
        </div>
      </Quiet>

      <Quiet id="principles">
        <div className="wrap">
          <div className="section-head">
            <div>
              <Eyebrow tone="cobalt">Principles</Eyebrow>
              <Headline tone="cobalt" lines={['What intelligence', 'should be.']} />
            </div>
          </div>
          <div className="bento principle-bento">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} className="cell principle-cell" style={toneStyle(PRINCIPLE_TONES[i])} delay={(i % 3) * 70}>
                <div className="principle-art">
                  <DomainArt index={PRINCIPLE_ART[i]} />
                  <span className="icon-tile">
                    <Icon name={PRINCIPLE_ICONS[i]} size={18} />
                  </span>
                </div>
                <div className="principle-copy">
                  <p className="cell-label">{String(i + 1).padStart(2, '0')}</p>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Quiet>

      <Quiet id="recognition">
        <div className="wrap">
          <div className="section-head">
            <div>
              <Eyebrow tone="tangerine">Recognition</Eyebrow>
              <Headline tone="tangerine" lines={['Along', 'the way.']} />
            </div>
            <Reveal as="p" className="lede" delay={100}>
              Milestones since our first public launch, from the state investor summit to national technology challenges.
            </Reveal>
          </div>
          <Track />
        </div>
      </Quiet>

      <Quiet id="values">
        <div className="wrap">
          <div className="section-head">
            <div>
              <Eyebrow tone="emerald">How we work</Eyebrow>
              <Headline tone="emerald" lines={['Built for', 'decades.']} />
            </div>
            <Reveal className="section-head-link" delay={100}>
              <Link to="/careers" className="btn btn-primary">
                Join the team <Arrow />
              </Link>
            </Reveal>
          </div>
          <div className="bento values-bento">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} className="cell value-cell" style={toneStyle(VALUE_TONES[i])} delay={i * 60}>
                <span className="value-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="icon-tile">
                  <Icon name={VALUE_ICONS[i]} />
                </span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </Quiet>
    </>
  );
}
