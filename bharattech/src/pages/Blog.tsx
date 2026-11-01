import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import { PageHero, Quiet } from '../components/PageHero';
import { Arrow, Reveal, toneStyle } from '../components/ui';
import { CATEGORY_TONE, POSTS } from '../content';
import type { HueName } from '../gl/palette';
import { Cover } from '../components/art';
import { isCompact } from '../gl/Scene';
import { BlogDeck } from '../components/blog/BlogDeck';

const CATS = ['All', ...Array.from(new Set(POSTS.map((p) => p.category)))];
const CAT_TONE: Record<string, HueName> = CATEGORY_TONE;

/**
 * Column spans for n cards on a 12-column grid, so no row is left with a lone card:
 * a feature pair first (8 + 4), then rows of three, with a row of four or two where the count needs it.
 */
function spansFor(n: number): number[] {
  if (n === 1) return [12];
  const out = [8, 4];
  let m = n - 2;
  while (m > 0) {
    const take = m === 4 ? 4 : m === 2 || m === 1 ? m : 3;
    out.push(...Array(take).fill(12 / take));
    m -= take;
  }
  return out;
}

/** Three covers fanned like a hand of cards; each one lifts and straightens under the pointer. */
function CoverFan() {
  return (
    <div className="cover-fan">
      {POSTS.slice(0, 3).map((p, i) => (
        <Link key={p.slug} to={`/blog/${p.slug}`} className="fan-card" style={{ '--i': i - 1, '--d': i } as CSSProperties}>
          <Cover index={i} label={p.category} />
          <span className="fan-meta">
            {p.date} · {p.read}
          </span>
          <b>{p.title}</b>
        </Link>
      ))}
    </div>
  );
}

/**
 * The Blog. On desktop the posts come one at a time, a deck of large cards that the scroll lifts away one by one
 * (BlogDeck); phones and reduced motion keep the plain grid of post cards.
 */
export function Blog() {
  const [flat] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches || isCompact());
  const [cat, setCat] = useState('All');
  const posts = useMemo(() => POSTS.filter((p) => cat === 'All' || p.category === cat), [cat]);
  const controls = (
    <div className="segmented" role="group" aria-label="Category">
      {CATS.map((c) => (
        <button key={c} aria-pressed={cat === c} style={toneStyle(CAT_TONE[c] ?? 'ink')} onClick={() => setCat(c)}>
          <i aria-hidden="true" />
          {c}
        </button>
      ))}
    </div>
  );
  return flat ? (
    <PostsGrid posts={posts} cat={cat} controls={controls} />
  ) : (
    <BlogDeck posts={posts} tone={(p) => CAT_TONE[p.category]} controls={controls} />
  );
}

/** The posts as a grid of cards under the page's hero, for phones and reduced motion. */
function PostsGrid({ posts, cat, controls }: { posts: typeof POSTS; cat: string; controls: ReactNode }) {
  const spans = spansFor(posts.length);
  return (
    <>
      <PageHero
        tone="violet"
        title={['Notes from', 'the lab.']}
        lede="Essays and research notes on persistent memory, generative intelligence and the infrastructure underneath them."
        visual={<CoverFan />}
      />
      <Quiet className="section section-tight">
        <div className="wrap">
          {controls}
          <div className="bento posts-bento" key={cat}>
            {posts.map((p, i) => {
              const wide = spans[i] >= 8;
              // the lead's partner stands as tall as the lead, so it has room for the full excerpt too
              const full = wide || i === 1;
              return (
                <Reveal
                  key={p.slug}
                  className={`cell post ${wide ? 'post-lead' : ''} ${spans[i] === 12 && i > 0 ? 'is-row' : ''}`}
                  style={toneStyle(CAT_TONE[p.category], { gridColumn: `span ${spans[i]}` })}
                  delay={i * 60}
                >
                  <Link to={`/blog/${p.slug}`} className="cell-link">
                    <Cover index={POSTS.indexOf(p)} label={p.category} />
                    <div className="post-body">
                      <p className="post-meta">
                        <span>{p.category}</span>
                        {p.date} · {p.read}
                      </p>
                      <h3>{p.title}</h3>
                      <p>{full ? p.excerpt : p.dek}</p>
                      <span className="cell-go">
                        Read <Arrow />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Quiet>
    </>
  );
}
