import { useEffect, useRef } from 'react';
import { mountScene } from '../reel/live';
import type { SceneName } from '../reel/scenes';
import { useTheme } from '../theme';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A live three.js scene with annotations that reacts to the cursor. It pauses off-screen and follows the theme. */
export function LiveScene({ name, label }: { name: SceneName; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [theme] = useTheme();
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const m = mountScene(el, name, theme, { still: reduced() });
    return () => m.destroy();
  }, [name, theme]);
  return <div ref={host} className="live-scene" role="img" aria-label={`${label}: an interactive illustration`} />;
}
