import { PageHero, Zone } from '../components/PageHero';
import { Fade, Lines } from '../components/Reveal';

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

export function About() {
  return (
    <div className="page page-about company-about-page">
      <PageHero
        title={['About Us']}
        lede="We are a creative company focused on establishing long-term relationships with our customers."
        target={{ key: 'field', params: { alpha: 0 } }}
      />

      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="section company-story-section" id="story">
        <div className="wrap company-story-grid">
          <Fade className="company-story-index">
            <span className="mono">Our story</span>
            <p>Technology designed in India for meaningful, widespread impact.</p>
          </Fade>

          <div className="company-story-copy">
            <Fade className="company-story-block">
              <Lines as="h2" className="h2" lines={["Leading India’s", 'Deep-Tech Revolution.']} />
              <p>
                Bharattech Techecosystem Pvt. Ltd. is at the forefront of India’s deep-tech innovation, offering
                cutting-edge solutions tailored to the needs of the nation. Our flagship products—BharatAI,
                CollegeCue, Recag and BSearch—are transforming industries by making technology accessible,
                affordable and impactful for businesses, startups and individuals across India.
              </p>
              <p>
                From simplifying AI integration to fostering technology-driven learning, Bharattech’s innovations
                are driving meaningful change in how people use technology for progress.
              </p>
            </Fade>

            <Fade className="company-story-block" delay={100}>
              <Lines as="h2" className="h2" lines={['Building a Thriving', 'Tech Community.']} />
              <p>
                At the heart of Bharattech is a vision to create an inclusive and supportive technology ecosystem.
                By empowering startups, fostering technology enthusiasts and nurturing innovators, we are building
                a vibrant community where groundbreaking ideas are brought to life.
              </p>
              <p>
                Through collaborations with educational institutions, government bodies and industry leaders,
                Bharattech is dedicated to advancing technological growth aligned with India’s developmental goals
                and helping shape the future of technology in the country.
              </p>
            </Fade>
          </div>
        </div>
      </Zone>

      <Zone target={{ key: 'field', params: { alpha: 0 } }} className="section company-awards-section" id="awards">
        <div className="wrap">
          <div className="company-awards-head">
            <Lines as="h2" className="h1" lines={['Awards.']} />
            <Fade as="p" className="lede" delay={100}>
              Bharattech is establishing a legacy for technology startups across leading national forums.
            </Fade>
          </div>

          <div className="company-awards-grid">
            {AWARDS.map((award, index) => (
              <Fade key={`${award.year}-${award.title}`} className="company-award-card" delay={index * 70}>
                <span className="company-award-year mono">{award.year}</span>
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
