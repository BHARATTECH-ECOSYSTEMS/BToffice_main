import { useRef } from 'react';
import { useQuiet } from '../gl/Scene';
import { Eyebrow, Headline, Reveal } from '../components/ui';
import { DomainGrid } from '../components/DomainGrid';

export function Research() {
  const ref = useRef<HTMLElement>(null);
  useQuiet(ref);
  return (
    <section id="research" ref={ref} className="section research">
      <div className="wrap">
        <div className="section-head">
          <div>
            <Eyebrow tone="emerald">Research</Eyebrow>
            <Headline tone="emerald" lines={['Six domains.', 'One intelligence.']} />
          </div>
          <Reveal as="p" className="lede" delay={120}>
            Our research spans six connected domains. They are not separate products: each one strengthens every other.
          </Reveal>
        </div>
        <DomainGrid />
      </div>
    </section>
  );
}
