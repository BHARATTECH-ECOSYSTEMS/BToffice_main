import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { Story } from '../sections/Story';
import { Capabilities } from '../sections/Capabilities';
import { HowItWorks } from '../sections/HowItWorks';
import { Architecture } from '../sections/Architecture';
import { Network } from '../sections/Network';
import { Research } from '../sections/Research';
import { Audiences } from '../sections/Audiences';
import { Journal } from '../sections/Journal';
import { CareersSection } from '../sections/CareersSection';
import { Faq } from '../sections/Faq';
import { Finale } from '../sections/Finale';

// everything below the opening story, in page order
const LOWER = [
  <Capabilities key="capabilities" />,
  <HowItWorks key="how" />,
  <Architecture key="architecture" />,
  <Network key="network" landOn="#research .research-head-block" />,
  <Research key="research" />,
  <Audiences key="audiences" />,
  <Journal key="journal" />,
  <CareersSection key="careers" />,
  <Faq key="faq" />,
  <Finale key="finale" />,
];

// phones and tablets build the whole page at once, as before (owner's 4-2A: desktop only)
export const STAGED_MEDIA = '(min-width: 1025px)';
// any of these may take the visitor anywhere on the page (a scroll, a nav link, a key), so everything is built first
export const BUILD_ALL_ON = ['pointerdown', 'wheel', 'keydown', 'touchstart'] as const;
// the most a section waits for a quiet moment, so the page is whole within a second or two even when it's busy
const QUIET_WAIT_MS = 150;

const whenQuiet = (fn: () => void) => {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(fn, { timeout: QUIET_WAIT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(fn, 50);
  return () => window.clearTimeout(id);
};

/**
 * On desktop the opening story comes first and each section below it is built in the browser's next quiet moment,
 * so the top shows without waiting for the whole page's first layout (~0.35 s on the owner's laptop).
 */
export function Home() {
  const { state } = useLocation();
  // a link from another page to one of the sections (Layout scrolls to it) needs it there now
  const jump = !!(state as { scrollTo?: string } | null)?.scrollTo;
  const [built, setBuilt] = useState(() => (window.matchMedia(STAGED_MEDIA).matches ? 0 : LOWER.length));
  const whole = jump || built >= LOWER.length;

  useEffect(() => {
    if (whole) {
      // once whole, never smaller again, whatever the address says later
      if (built < LOWER.length) setBuilt(LOWER.length);
      return;
    }
    const everything = () => setBuilt(LOWER.length);
    BUILD_ALL_ON.forEach((type) => window.addEventListener(type, everything, { capture: true, passive: true }));
    const cancel = whenQuiet(() => setBuilt((n) => n + 1));
    return () => {
      BUILD_ALL_ON.forEach((type) => window.removeEventListener(type, everything, { capture: true }));
      cancel();
    };
  }, [whole, built]);

  return (
    <>
      <Story />
      {whole ? LOWER : LOWER.slice(0, built)}
    </>
  );
}
