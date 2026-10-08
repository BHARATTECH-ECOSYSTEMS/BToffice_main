import { useRef } from 'react';
import { Link } from 'react-router';
import { useQuiet } from '../gl/Scene';
import { Arrow } from '../components/ui';
import { Aurora } from '../components/fx';

/** A page that was forgotten: the number itself comes apart. */
export function NotFound() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return (
    <section ref={ref} className="notfound">
      <Aurora className="is-page" />
      <div className="wrap notfound-copy">
        <p className="notfound-num" aria-hidden="true">
          <span>4</span>
          <span>0</span>
          <span>4</span>
        </p>
        <h1 className="h1">This page was forgotten.</h1>
        <p className="lede">Which is exactly the problem we are working on.</p>
        <Link to="/" className="btn btn-primary">
          Back to the start <Arrow />
        </Link>
      </div>
    </section>
  );
}
