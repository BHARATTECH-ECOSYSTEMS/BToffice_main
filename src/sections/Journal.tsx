import { useEffect, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { Arrow, Headline, toneStyle, BtnText } from '../components/ui';
import { useQuiet, useScene, WIDE_QUERY } from '../gl/Scene';
import { Cover } from '../components/art';
import { pageScroll, trackBox } from '../components/trackBox';
import { POSTS } from '../content';
import type { HueName } from '../gl/palette';
import { clamp01, easeInOut, smooth01 as smooth } from '../gl/ink';
import '../styles/domain-cinema.css';
import '../styles/services-swing.css';

const TONES: HueName[] = ['violet', 'tangerine', 'saffron'];
const SHOWN = POSTS.slice(0, 3);
/** One card per post; careers follow in their own section. */
const COUNT = SHOWN.length;
/** Share of each card's turn that it simply holds, before it swings away. */
const HOLD = 0.3;
/** How far a card turns about its pivot (well below it) on its way out to the right. */
const SWING_DEG = 55;
/** Cards waiting behind the front one: how far each sits up, and how much smaller. */
const BEHIND_PX = 16;
const BEHIND_SCALE = 0.05;
/**
 * The point a leaving card swings about: well below it and left of centre, so it travels out to the right on a
 * wide arc. A waiting card scales from its top edge instead; the two only swap while the card is at rest.
 */
const PIVOT = '30% 230%';

/**
 * Services, one card at a time. The section pins while it is read; scrolling, the front card
 * swings out to the right along an arc, as if hung from a point below it, and the card waiting behind rises
 * into its place. Scrolling back swings it home again. Every frame is set from the scroll alone (transform and
 * opacity only), in the same frame the smooth scroll moves the page.
 */
export function Journal() {
  const ref = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const { lenis } = useScene();
  useQuiet(ref);

  useEffect(() => {
    const trackEl = track.current;
    if (!trackEl) return;
    // one at a time on wide screens; stacked on a phone the cards simply follow each other
    const wide = window.matchMedia(WIDE_QUERY);
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    let box: { top: number; height: number } | null = null;
    let last = -1;

    const apply = (scroll: number, force = false) => {
      if (!box) return;
      if (!wide.matches) {
        if (last !== -2) cards.current.forEach((el) => el && (el.style.transform = el.style.transformOrigin = el.style.opacity = el.style.visibility = ''));
        last = -2;
        return;
      }
      const run = Math.max(1, box.height - window.innerHeight);
      const b = clamp01((scroll - box.top) / run) * (COUNT - 1);
      if (b === last && !force) return;
      last = b;
      // how many cards have swung away, the one on its way counting as a fraction
      let gone = 0;
      for (let i = 0; i < COUNT - 1; i++) {
        const t = clamp01((b - i - HOLD) / (1 - HOLD));
        gone += calm.matches ? (t > 0.5 ? 1 : 0) : easeInOut(t);
      }
      cards.current.forEach((el, j) => {
        if (!el) return;
        const rel = j - gone;
        if (rel < 0) {
          // on its way out: turned about the pivot below it, and gone before it could ghost over the next card
          const l = Math.min(1, -rel);
          el.style.transformOrigin = PIVOT;
          el.style.transform = `rotate(${(l * SWING_DEG).toFixed(2)}deg)`;
          el.style.opacity = (1 - smooth(clamp01((l - 0.3) / 0.5))).toFixed(3);
          el.style.visibility = l >= 1 ? 'hidden' : '';
        } else {
          // in front, or waiting behind it: a little higher and smaller for each card in between
          el.style.transformOrigin = '50% 0';
          el.style.transform = `translate3d(0, ${(-rel * BEHIND_PX).toFixed(2)}px, 0) scale(${(1 - Math.min(rel, 3) * BEHIND_SCALE).toFixed(4)})`;
          // only the next card shows fully behind; the one after is a faint edge
          el.style.opacity = clamp01(2.5 - rel).toFixed(3);
          el.style.visibility = rel >= 2.5 ? 'hidden' : '';
        }
      });
    };

    // measured on layout changes only; trackBox calls back at once, then whenever the page reflows
    const tracked = trackBox(trackEl, () => apply(lenis ? lenis.scroll : window.scrollY, true));
    box = tracked.box;
    apply(lenis ? lenis.scroll : window.scrollY, true);
    // with Lenis the page moves inside its own frame callback: follow it there, in the same frame
    const off = lenis?.on('scroll', () => apply(lenis.scroll));
    let raf = 0;
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), apply(pageScroll())));
    };
    if (!lenis) window.addEventListener('scroll', onScroll, { passive: true });
    const onMedia = () => apply(lenis ? lenis.scroll : window.scrollY, true);
    wide.addEventListener('change', onMedia);
    calm.addEventListener('change', onMedia);
    return () => {
      off?.();
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      wide.removeEventListener('change', onMedia);
      calm.removeEventListener('change', onMedia);
      tracked.release();
    };
  }, [lenis]);

  const keep = (j: number) => (el: HTMLElement | null) => {
    cards.current[j] = el;
  };

  return (
    <section id="journal" ref={ref} className="section services-swing">
      <div ref={track} className="swing-track" style={{ '--count': COUNT } as CSSProperties}>
        <div className="swing-pin">
          <div className="wrap wrap-sheet">
            <div className="section-head wrap-col">
              <div>
                <Headline tone="cobalt" lines={['Services,', 'and people.']} />
              </div>
              <div className="swing-side">
                <Link to="/services" className="btn btn-ghost">
                  <BtnText>All services</BtnText> <Arrow />
                </Link>
              </div>
            </div>
            <div className="swing-stage">
              {SHOWN.map((p, i) => (
                <article key={p.slug} ref={keep(i)} className="swing-card" style={{ zIndex: COUNT - i }}>
                  <Link to={`/services/${p.slug}`} className="stack-card__inner swing-face" style={toneStyle(TONES[i])}>
                    <div className="stack-card__copy">
                      <span className="stack-card__num">
                        {p.category}
                      </span>
                      <h3 className="stack-card__title">{p.title}</h3>
                      <p className="stack-card__body">{p.excerpt}</p>
                      <p className="post-meta">
                        {p.date} · {p.read}
                      </p>
                      <span className="link-arrow">
                        Read the piece <Arrow />
                      </span>
                    </div>
                    <figure className="stack-card__media swing-cover">
                      <Cover index={i} label={p.category} />
                    </figure>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
