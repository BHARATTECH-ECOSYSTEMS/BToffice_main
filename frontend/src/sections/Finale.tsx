import { Link } from 'react-router';
import { Arrow, BtnText } from '../components/ui';
import { InkStrands } from '../components/InkStrands';
import { EMAIL, EMAIL_HREF, HQ } from '../content';

export function Finale() {
  return (
    <section id="next" className="finale-film">
      <div className="finale-pin">
        <div className="wrap finale-copy">
          <h2 className="finale-title">
            The next era of intelligence <span>begins here.</span>
          </h2>
          <p className="finale-lede">Direct access to our research and engineering teams: joint research, fellowships and foundational deployments.</p>
          <InkStrands className="beat-actions finale-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">
              <BtnText>Start a conversation</BtnText> <Arrow />
            </Link>
            <a href={EMAIL_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-lg">
              <BtnText>{EMAIL}</BtnText>
            </a>
          </InkStrands>
          <p className="finale-meta">{HQ} · Made in Bharat</p>
        </div>
      </div>
    </section>
  );
}
