import { useEffect, useRef } from 'react';
import { useTheme } from '../theme';

/**
 * A short explainer loop from /public/media in the site's theme (`name-light` / `name-dark`), muted, playing only while
 * it is on screen. With reduced motion it shows its poster frame instead.
 */
export function ThemedVideo({ name, label }: { name: string; label: string }) {
  const [theme] = useTheme();
  const ref = useRef<HTMLVideoElement>(null);
  const v = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // React does not reliably set the muted attribute, and browsers only autoplay muted video
    el.muted = true;
    el.defaultMuted = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [v]);

  return (
    <video
      ref={ref}
      key={v}
      className="themed-video"
      src={`/media/${name}-${v}.mp4`}
      poster={`/media/${name}-${v}.jpg`}
      muted
      loop
      playsInline
      preload="metadata"
      aria-label={label}
    />
  );
}
