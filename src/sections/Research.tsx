import { useRef } from 'react';
import { useQuiet } from '../gl/Scene';
import { Headline } from '../components/ui';
import { DomainGrid } from '../components/DomainGrid';

export function Research() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return (
    <section id="research" ref={ref} className="section research">
      <div className="wrap">
        <div className="section-head section-head--split">
          <div className="research-head-block">
            <div className="research-eyebrow">
              <span className="research-eyebrow__dot" />
              <span>RESEARCH ARCHITECTURE</span>
            </div>
            <Headline tone="violet" lines={['Six domains.', 'One intelligence.']} />
          </div>
        </div>
        <DomainGrid />
      </div>
    </section>
  );
}
