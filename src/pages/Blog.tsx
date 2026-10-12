import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { PageHero, Quiet } from '../components/PageHero';
import { Arrow, Reveal, toneStyle } from '../components/ui';
import { POSTS } from '../content';
import type { HueName } from '../gl/palette';
import { Cover } from '../components/art';

const CATS = ['All', ...Array.from(new Set(POSTS.map((p) => p.category)))];
const CAT_TONE: Record<string, HueName> = { Research: 'violet', Technology: 'saffron', Company: 'tangerine' };

/**
 * Column spans for n cards on a 12-column grid, so no row is left with a lone card:
 * a feature pair first (8 + 4), then rows of three, with a row of four or two where the count needs it.
 */
export function spansFor(n: number): number[] {
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
        <Link key={p.slug} to={`/services/${p.slug}`} className="fan-card" style={{ '--i': i - 1, '--d': i } as CSSProperties}>
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

export function Blog() {
  const [cat, setCat] = useState('All');
  const posts = POSTS.filter((p) => cat === 'All' || p.category === cat);
  const spans = spansFor(posts.length);
  return (
    <>
      <PageHero
        eyebrow="Services"
        tone="violet"
        title={['Notes from', 'the lab.']}
        lede="Essays and research notes on persistent memory, generative intelligence and the infrastructure underneath them."
        visual={<CoverFan />}
      >
        <ul className="hero-stats">
          <li>
            <b>{String(POSTS.length).padStart(2, '0')}</b> essays
          </li>
          <li>
            <b>{String(CATS.length - 1).padStart(2, '0')}</b> topics
          </li>
          <li>
            <b>{POSTS.reduce((t, p) => t + parseInt(p.read, 10), 0)}</b> min of reading
          </li>
        </ul>
      </PageHero>
      <Quiet className="section section-tight">
        <div className="wrap">
          <div className="segmented" role="group" aria-label="Category">
            {CATS.map((c) => (
              <button key={c} aria-pressed={cat === c} style={toneStyle(CAT_TONE[c] ?? 'ink')} onClick={() => setCat(c)}>
                <i aria-hidden="true" />
                {c}
                <small>{c === 'All' ? POSTS.length : POSTS.filter((p) => p.category === c).length}</small>
              </button>
            ))}
          </div>
          <div className="bento posts-bento" key={cat}>
            {posts.map((p, i) => {
              const wide = spans[i] >= 8 || spans[i] === 12;
              return (
                <Reveal
                  key={p.slug}
                  className={`cell post ${wide ? 'post-lead' : ''} ${spans[i] === 12 && i > 0 ? 'is-row' : ''}`}
                  style={toneStyle(CAT_TONE[p.category], { gridColumn: `span ${spans[i]}` })}
                  delay={i * 60}
                >
                  <Link to={`/services/${p.slug}`} className="cell-link">
                    <Cover index={POSTS.indexOf(p)} label={p.category} />
                    <div className="post-body">
                      <p className="post-meta">
                        <span>{p.category}</span>
                        {p.date} · {p.read}
                      </p>
                      <h3>{p.title}</h3>
                      <p>{wide ? p.excerpt : p.dek}</p>
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
