import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import { Arrow, Headline, toneStyle } from '../ui';
import { Cover } from '../art';
import { useQuiet, useScene } from '../../gl/Scene';
import type { HueName } from '../../gl/palette';
import { POSTS } from '../../content';
import { pinnedScrollTop, useStageFrames } from '../careers/useStageFrames';
import { pointerIn } from '../../gl/careers/shared';
import { deckAt, pageAt, stopOf } from './deckPlan';
import { morphCover } from './coverMorph';

type Post = (typeof POSTS)[number];

/** How far each waiting card sits above and behind the one in front of it, how much smaller, and how veiled. */
const PEEK_Y = 24;
const PEEK_SCALE = 0.05;
const PEEK_FADE = 0.32;
/** How far the front card leans after the pointer, in degrees. */
const LEAN = 2.5;

/**
 * The Blog on desktop: one post at a time. The section pins while the page scrolls; one large card holds the post in
 * front (its cover, title, summary and excerpt) with the next two waiting just behind it, and each stretch of scroll
 * lifts the front card away and brings the next one forward. The marks under the deck show where the reader is and
 * jump to any post; the arrow keys and Page Up/Down move one post at a time.
 */
export function BlogDeck({ posts, tone, controls }: { posts: Post[]; tone: (p: Post) => HueName; controls: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLOListElement>(null);
  const frame = useStageFrames(sectionRef, pinRef);
  const [page, setPage] = useState(0);
  const [ready, setReady] = useState(false);
  const { scrollTo } = useScene();
  const navigate = useNavigate();
  const count = posts.length;
  const pageRef = useRef(page);
  pageRef.current = page;
  useQuiet(sectionRef);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 60);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const deck = deckRef.current;
    const pin = pinRef.current;
    if (!deck || !pin) return;
    const cards = Array.from(deck.querySelectorAll<HTMLElement>(':scope > li'));
    const veils = cards.map((card) => card.querySelector<HTMLElement>('.dk-veil')!);
    // styles are written only when they change, so a deck at rest costs nothing per frame
    const written = new Map<HTMLElement, Record<string, string>>();
    const write = (el: HTMLElement, prop: string, value: string) => {
      const seen = written.get(el) ?? {};
      if (seen[prop] === value) return;
      seen[prop] = value;
      written.set(el, seen);
      el.style.setProperty(prop, value);
    };
    const target = { x: 0, y: 0 };
    const lean = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      [target.x, target.y] = pointerIn(e);
    };
    const onLeave = () => {
      target.x = target.y = 0;
    };
    pin.addEventListener('pointermove', onMove);
    pin.addEventListener('pointerleave', onLeave);
    let shown = -1;
    frame.current = (_now, progress) => {
      lean.x += (target.x - lean.x) * 0.08;
      lean.y += (target.y - lean.y) * 0.08;
      const at = deckAt(progress, count);
      cards.forEach((card, k) => {
        const rel = k - at;
        let y = 0;
        let scale = 1;
        let tilt = 0;
        let opacity = 1;
        if (rel < 0) {
          // lifting away: solid all the way, so it uncovers the next card like a photo slid off a pile instead of
          // fading through it; it slides up under the title and out of the window, its foot swinging back a little
          const off = Math.min(1, -rel);
          y = -off * window.innerHeight;
          tilt = -off * 10;
          scale = 1 - off * 0.04;
          opacity = off > 0.85 ? (1 - off) / 0.15 : 1;
        } else {
          // waiting behind: each one higher and smaller, and dimmed by a veil of the page colour rather than made
          // see-through, so no card's text ever shows through the one in front; past the next two they are gone
          y = -rel * PEEK_Y;
          scale = 1 - rel * PEEK_SCALE;
          opacity = rel > 2 ? Math.max(0, 1 - (rel - 2) * 2) : 1;
        }
        write(veils[k], 'opacity', Math.min(1, Math.max(0, rel) * PEEK_FADE).toFixed(2));
        // the card in front leans a little after the pointer
        const front = Math.max(0, 1 - Math.abs(rel));
        const rx = tilt - lean.y * LEAN * front;
        const ry = lean.x * LEAN * front;
        write(
          card,
          'transform',
          `translateY(${y.toFixed(1)}px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
        );
        write(card, 'opacity', opacity.toFixed(2));
        write(card, 'z-index', String(rel < 0 ? 200 : 100 - k));
        write(card, 'visibility', opacity < 0.02 ? 'hidden' : 'visible');
        // cards out of sight pause their covers' endless pings (base.css [data-offscreen])
        if (card.hasAttribute('data-offscreen') !== opacity < 0.02) card.toggleAttribute('data-offscreen', opacity < 0.02);
      });
      const now = pageAt(progress, count);
      if (now !== shown) {
        shown = now;
        setPage(now);
      }
    };
    return () => {
      frame.current = null;
      pin.removeEventListener('pointermove', onMove);
      pin.removeEventListener('pointerleave', onLeave);
    };
  }, [frame, count, posts]);

  const goTo = (k: number) => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    if (section && pin && k >= 0 && k < count) scrollTo(pinnedScrollTop(section, pin, stopOf(k, count)));
  };
  const goToRef = useRef(goTo);
  goToRef.current = goTo;

  // a filter changes the cards under the reader, so the deck starts again at its first card. The jump is instant and
  // waits a frame: the section has just shrunk, and a glide would start from a scroll position that no longer exists.
  useEffect(() => {
    setPage(0);
    const section = sectionRef.current;
    if (!section || section.getBoundingClientRect().top >= 0) return;
    const raf = requestAnimationFrame(() => scrollTo(section, true));
    return () => cancelAnimationFrame(raf);
  }, [posts, scrollTo]);

  // while the deck is pinned, the arrow keys and Page Up/Down move one post; past either end the page scrolls as usual
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable]')) return;
      const section = sectionRef.current;
      if (!section) return;
      const box = section.getBoundingClientRect();
      if (box.top > 1 || box.bottom < window.innerHeight - 1) return;
      const step = ({ ArrowRight: 1, PageDown: 1, ArrowLeft: -1, PageUp: -1 } as Record<string, number>)[e.key];
      const to = pageRef.current + (step ?? 0);
      if (!step || to < 0 || to >= count) return;
      e.preventDefault();
      goToRef.current(to);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count]);

  const open = (k: number) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    const to = `/blog/${posts[k].slug}`;
    const from = e.currentTarget.querySelector<HTMLElement>('.cover');
    if (from) morphCover(from, () => navigate(to));
    else navigate(to);
  };

  return (
    <section ref={sectionRef} className="dk" aria-labelledby="dk-title" style={{ '--count': Math.max(1, count) } as CSSProperties}>
      <div ref={pinRef} className="dk-pin">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="wrap dk-top">
          <div className="dk-head">
            <div id="dk-title">
              <Headline as="h1" className="h1 dk-title" tone="violet" lines={['Notes from', 'the lab.']} show={ready} />
            </div>
            <p className="dk-lede">
              Essays and research notes on persistent memory, generative intelligence and the infrastructure underneath them.
            </p>
          </div>
          {controls}
        </div>
        <div className="dk-stage">
          <ol ref={deckRef} className="dk-deck">
            {posts.map((p, k) => (
              <li key={p.slug} style={toneStyle(tone(p))} aria-current={page === k || undefined}>
                <Link
                  to={`/blog/${p.slug}`}
                  className="dk-card"
                  data-morph=""
                  onClick={open(k)}
                  onFocus={(e) => {
                    // a keyboard reader tabbing to a card still waiting behind brings it to the front
                    if (k !== page && e.currentTarget.matches(':focus-visible')) goTo(k);
                  }}
                >
                  <i className="dk-veil" aria-hidden="true" />
                  <Cover index={POSTS.indexOf(p)} label={p.category} />
                  <span className="dk-text">
                    <span className="post-meta">
                      <span>{p.category}</span>
                      {p.date} · {p.read}
                    </span>
                    <h2 className="dk-post-title">{p.title}</h2>
                    <span className="dk-dek">{p.dek}</span>
                    <p className="dk-excerpt">{p.excerpt}</p>
                    <span className="dk-read">
                      Read <Arrow />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {count > 1 && (
            <nav className="dk-marks" aria-label="Posts">
              {posts.map((p, k) => (
                <button
                  key={p.slug}
                  type="button"
                  aria-label={p.title}
                  aria-current={page === k || undefined}
                  style={toneStyle(tone(p))}
                  onClick={() => goTo(k)}
                />
              ))}
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}
