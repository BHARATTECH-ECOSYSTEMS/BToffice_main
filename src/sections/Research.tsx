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
        <div className="section-head section-head--split">
          <div>
            <Eyebrow tone="violet">Research Architecture</Eyebrow>
            <Headline tone="violet" lines={['Six domains.', 'One intelligence.']} />
            <Reveal as="p" className="lede" delay={120}>
              Six connected physical intelligence systems engineered on the Rivinity substrate. They are not separate products: each one strengthens every other.
            </Reveal>
          </div>
        </div>
        <DomainGrid />
      </div>
    </section>
  );
}
