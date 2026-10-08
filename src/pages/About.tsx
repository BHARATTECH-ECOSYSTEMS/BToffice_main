import { Quiet } from '../components/PageHero';
import { Reveal } from '../components/ui';
import { AWARDS } from '../content';
import '../styles/company-about.css';

const AWARD_COPY = [
  'Launching of BSearch by PM Shri Narendra Modi and recognition among the top technology startups in the state.',
  'Representation of Bharattech at the UP International Trade Show 2023.',
  'Participation of Bharattech in the Indian Web Browser Development Challenge.',
  'Participation of Bharattech in the MeitY Open Challenge Program.',
];

export function About() {
  return <div className="company-about-page">
    <Quiet className="company-about-hero"><div className="wrap">
      <Reveal as="h1">About Us</Reveal>
      <Reveal as="p" delay={100}>We are a creative company focused on establishing long-term relationships with our customers.</Reveal>
    </div></Quiet>
    <Quiet id="story" className="section company-story-section"><div className="wrap company-story-grid">
      <aside className="company-story-index"><span>Our story</span><p>Technology designed in India for meaningful, widespread impact.</p></aside>
      <div className="company-story-copy">
        <Reveal className="company-story-block">
          <h2>Leading India’s<br />Deep-Tech Revolution.</h2>
          <p>Bharattech Techecosystem Pvt. Ltd. is at the forefront of India’s deep-tech innovation, offering cutting-edge solutions tailored to the needs of the nation. Our flagship products—BharatAI, CollegeCue, Recag and BSearch—are transforming industries by making technology accessible, affordable and impactful for businesses, startups and individuals across India.</p>
          <p>From simplifying AI integration to fostering technology-driven learning, Bharattech’s innovations are driving meaningful change in how people use technology for progress.</p>
        </Reveal>
        <Reveal className="company-story-block" delay={100}>
          <h2>Building a Thriving<br />Tech Community.</h2>
          <p>At the heart of Bharattech is a vision to create an inclusive and supportive technology ecosystem. By empowering startups, fostering technology enthusiasts and nurturing innovators, we are building a vibrant community where groundbreaking ideas are brought to life.</p>
          <p>Through collaborations with educational institutions, government bodies and industry leaders, Bharattech is dedicated to advancing technological growth aligned with India’s developmental goals and helping shape the future of technology in the country.</p>
        </Reveal>
      </div>
    </div></Quiet>
    <Quiet id="awards" className="section company-awards-section"><div className="wrap">
      <div className="company-awards-head"><Reveal as="h2">Awards.</Reveal><Reveal as="p" delay={100}>Bharattech is establishing a legacy for technology startups across leading national forums.</Reveal></div>
      <div className="company-awards-grid">
        {AWARDS.map((award, index) => (
          <Reveal key={award.title} className="company-award-card" delay={index * 70}>
            <span className="company-award-year">{award.year}</span>
            <h3>{award.title}</h3>
            <p>{AWARD_COPY[index]}</p>
          </Reveal>
        ))}
      </div>
    </div></Quiet>
  </div>;
}
