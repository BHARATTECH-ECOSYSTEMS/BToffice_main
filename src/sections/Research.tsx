import { useRef } from 'react';
import { Link } from 'react-router';
import { useQuiet } from '../gl/Scene';
import { Arrow, Headline } from '../components/ui';
import { DomainGrid } from '../components/DomainGrid';

export function Research() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return (
    <section id="research" ref={ref} className="section research">
      <div className="wrap wrap-sheet">
        <div className="research-head wrap-col">
          <div className="research-head-block">
            <Headline tone="violet" lines={['Six domains.', 'One intelligence.']} />
          </div>
          <Link to="/research" className="btn btn-primary">
            Explore all research <Arrow />
          </Link>
        </div>
        <DomainGrid />
      </div>
    </section>
  );
}
