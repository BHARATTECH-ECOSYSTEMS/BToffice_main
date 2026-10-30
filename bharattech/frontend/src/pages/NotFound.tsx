import { useRef } from 'react';
import { Link } from 'react-router';
import { useQuiet } from '../gl/Scene';
import { Arrow, BtnText } from '../components/ui';

/** A page that was forgotten: the number itself comes apart. */
export function NotFound() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return (
    <section ref={ref} className="notfound">
      <div className="wrap notfound-copy">
        <p className="notfound-num" aria-hidden="true">
          <span>4</span>
          <span>0</span>
          <span>4</span>
        </p>
        <h1 className="h1">This page was forgotten.</h1>
        <p className="lede">Which is exactly the problem we are working on.</p>
        <div className="notfound-actions">
          <Link to="/" className="btn btn-primary">
            <BtnText>Back to the start</BtnText> <Arrow />
          </Link>
          <Link to="/research" className="btn btn-ghost">
            <BtnText>Explore research</BtnText>
          </Link>
          <Link to="/contact" className="btn btn-ghost">
            <BtnText>Contact us</BtnText>
          </Link>
        </div>
      </div>
    </section>
  );
}
