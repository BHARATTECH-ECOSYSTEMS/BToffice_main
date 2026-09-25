import { useRef } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import { Lines, Fade, Arrow } from '../components/Reveal';

export function NotFound() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'fragments', params: { decay: 0.6, drift: 0.3 } });
  return (
    <section ref={ref} className="page lost">
      <Fade as="p" className="kicker">
        <span className="kicker-num">404</span>
        <span>Memory not found</span>
      </Fade>
      <Lines as="h1" className="display" lines={['This page', 'was forgotten.']} show />
      <Fade as="p" className="lede" style={{ margin: '0 auto' }}>
        Ironic, for us. Let’s take you back to where everything connects.
      </Fade>
      <Fade>
        <Link to="/" className="btn btn-solid">
          Return to origin <Arrow />
        </Link>
      </Fade>
    </section>
  );
}
