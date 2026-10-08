import { Link } from 'react-router';
import { Arrow } from '../components/ui';
import { EMAIL, HQ } from '../content';

export function Finale() {
  return (
    <section id="next" className="finale-film">
      <div className="finale-pin">
        <div className="wrap finale-copy">
          <h2 className="finale-title">
            The next era of intelligence <span>begins here.</span>
          </h2>
          <p className="finale-lede">Direct access to our research and engineering teams: joint research, fellowships and foundational deployments.</p>
          <div className="beat-actions finale-actions">
            <Link to="/contact" className="btn btn-primary btn-lg">
              Start a conversation <Arrow />
            </Link>
            <a href={`mailto:${EMAIL}`} className="btn btn-ghost btn-lg">
              {EMAIL}
            </a>
          </div>
          <p className="finale-meta">{HQ} · Made in Bharat</p>
        </div>
      </div>
    </section>
  );
}
