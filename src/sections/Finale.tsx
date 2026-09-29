import { useRef } from 'react';
import { useFormation } from '../gl/Scene';
import { Lines, Kicker } from '../components/Reveal';

/** Everything returns to the mark: rising over the horizon like a planet. */
export function Finale() {
  const ref = useRef<HTMLElement>(null);
  // The mark rises over the horizon, then keeps pace with the footer so it always sits on its edge.
  const lift = useRef(0);
  useFormation(
    ref,
    () => ({ key: 'logo', pose: { x: 0, y: -3.35 + lift.current * 2.1, s: 1.75 }, mobilePose: { x: 0, y: -2.6 + lift.current * 2.4, s: 1.1 } }),
    (p) => {
      lift.current = Math.min(1, Math.max(0, (p - 0.42) / 0.56));
    },
  );
  return (
    <section id="next" ref={ref} className="section finale" data-chapter="Next era">
      <div className="wrap">
        <Kicker index="12">What comes next</Kicker>
        <Lines className="display" lines={['The next era of', 'intelligence', 'begins here.']} />
      </div>
    </section>
  );
}
