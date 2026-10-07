import { Zone } from '../components/PageHero';
import { Fade, Lines } from '../components/Reveal';

const PRINCIPLES = [
  {
    title: 'Deep-tech innovation',
    body: 'We build advanced technology around the needs of India, turning ambitious research into practical products and services.',
  },
  {
    title: 'Accessible technology',
    body: 'Our work makes powerful technology more affordable and useful for businesses, startups and individuals across the country.',
  },
  {
    title: 'Learning through collaboration',
    body: 'We work with educational institutions, government bodies and industry leaders to strengthen the wider technology ecosystem.',
  },
  {
    title: 'Impact that lasts',
    body: 'Every initiative is shaped around meaningful progress, from technology-driven learning to long-term national growth.',
  },
] as const;

const AWARDS = [
  {
    year: '2023',
    title: 'Uttar Pradesh Global Investor Summit',
    body: 'Launching of BSearch by PM Shri Narendra Modi and recognition among the top technology startups in the state.',
  },
  {
    year: '2023',
    title: 'International Trade Show',
    body: 'Representation of Bharattech at the UP International Trade Show 2023.',
  },
  {
    year: '2024',
    title: 'Indian Web Browser Development Challenge',
    body: 'Participation of Bharattech in the Indian Web Browser Development Challenge.',
  },
  {
    year: '2024',
    title: 'MeitY Open Challenge Program',
    body: 'Participation of Bharattech in the MeitY Open Challenge Program.',
  },
] as const;

export function AboutTest() {
  return (
    <div className="page about-template-page">
      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="about-template-hero">
        <div className="wrap about-template-hero-inner">
          <Fade className="about-template-kicker">What we are</Fade>
          <Lines
            as="h1"
            className="about-template-title"
            lines={['Leading India’s', <span className="accent">deep-tech revolution.</span>]}
          />
          <Fade as="p" className="about-template-lede" delay={120}>
            Bharattech Techecosystem Pvt. Ltd. is at the forefront of India’s deep-tech innovation, creating
            accessible, affordable and impactful technology for businesses, startups and individuals.
          </Fade>
          <Fade className="about-template-note" delay={180}>
            <span className="about-template-note-mark" aria-hidden="true" />
            <span>
              <strong>Technology designed in India</strong>
              <small>For meaningful, widespread impact</small>
            </span>
          </Fade>
        </div>
      </Zone>

      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="about-template-story" id="about-test-story">
        <div className="wrap">
          <div className="about-template-story-grid">
            <div className="about-template-story-heading">
              <Fade className="about-template-kicker">About us</Fade>
              <Lines as="h2" className="about-template-section-title" lines={['Who we are']} />
            </div>
            <div className="about-template-story-copy">
              <Fade as="p" className="about-template-lead">
                From simplifying AI integration to fostering technology-driven learning, Bharattech’s innovations
                are changing how people use technology for progress.
              </Fade>
              <Fade as="p" delay={80}>
                Our flagship products—BharatAI, CollegeCue, Recag and BSearch—are built around the needs of the
                nation and designed to make technology useful at scale.
              </Fade>
              <Fade as="p" delay={120}>
                At the heart of Bharattech is a vision to create an inclusive and supportive technology ecosystem
                where startups, technology enthusiasts and innovators can bring groundbreaking ideas to life.
              </Fade>
            </div>
          </div>

          <div className="about-template-principles">
            <Fade className="about-template-subhead">What drives us</Fade>
            <div className="about-template-principle-grid">
              {PRINCIPLES.map((principle, index) => (
                <Fade className="about-template-principle" key={principle.title} delay={index * 60}>
                  <span className="about-template-index">{String(index + 1).padStart(2, '0')}</span>
                  <h3>{principle.title}</h3>
                  <p>{principle.body}</p>
                </Fade>
              ))}
            </div>
          </div>
        </div>
      </Zone>

      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="about-template-awards" id="about-test-awards">
        <div className="wrap about-template-awards-panel">
          <div className="about-template-awards-head">
            <div>
              <Fade className="about-template-kicker about-template-kicker--dark">Recognition</Fade>
              <Lines as="h2" className="about-template-section-title" lines={['Awards and', 'milestones.']} />
            </div>
            <Fade as="p" delay={100}>
              Bharattech is establishing a legacy for technology startups across leading national forums.
            </Fade>
          </div>

          <div className="about-template-award-line" aria-hidden="true">
            <span />
          </div>

          <div className="about-template-award-grid">
            {AWARDS.map((award, index) => (
              <Fade className="about-template-award" key={`${award.year}-${award.title}`} delay={index * 70}>
                <span className="about-template-award-count">{String(index + 1).padStart(2, '0')} / 04</span>
                <span className="about-template-award-year">{award.year}</span>
                <h3>{award.title}</h3>
                <p>{award.body}</p>
              </Fade>
            ))}
          </div>
        </div>
      </Zone>
    </div>
  );
}
