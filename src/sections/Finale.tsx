import { useRef } from 'react';
import { Link } from 'react-router';
import { fitTo, useFormation } from '../gl/Scene';
import { MARK_SIZE } from '../gl/Engine';
import { Arrow, Headline, Reveal } from '../components/ui';
import { Aurora } from '../components/fx';
import { EMAIL, HQ } from '../content';

/** The story closes where it began: the globe folds back into the mark. */
export function Finale() {
  const ref = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useFormation(ref, () => ({ key: 'mark', flow: 1, pose: fitTo(stage.current, MARK_SIZE, 0.8), follow: 30 }));
  return (
    <section id="next" ref={ref} className="section finale">
      <Aurora className="is-finale" />
      <div className="wrap finale-inner">
        <div className="finale-stage" ref={stage} aria-hidden="true" />
        <Headline className="display finale-title" tone="violet" lines={['The next era of intelligence', 'begins here.']} />
        <Reveal as="p" className="lede" delay={120}>
          Direct access to our research and engineering teams: joint research, fellowships and foundational deployments.
        </Reveal>
        <Reveal className="finale-actions" delay={200}>
          <Link to="/contact" className="btn btn-primary btn-lg">
            Start a conversation <Arrow />
          </Link>
          <a href={`mailto:${EMAIL}`} className="btn btn-ghost btn-lg">
            {EMAIL}
          </a>
        </Reveal>
        <Reveal as="p" className="finale-meta" delay={260}>
          {HQ} · Made in Bharat
        </Reveal>
      </div>
    </section>
  );
}
