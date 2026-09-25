import { useState } from 'react';
import { PageHero, Zone } from '../components/PageHero';
import { Story } from '../sections/Journal';
import { POSTS } from '../content';

const CATS = ['All', 'Research', 'Technology', 'Company'];

export function Blog() {
  const [cat, setCat] = useState('All');
  const list = cat === 'All' ? POSTS : POSTS.filter((p) => p.category === cat);
  return (
    <div className="page">
      <PageHero
        index="Journal"
        label="Ideas · Research · Impact"
        title={['Notes from', 'the frontier.']}
        lede="Essays on memory, reasoning and the architecture of intelligence, written by the people building it."
        target={{ key: 'fragments', params: { alpha: 0.45 }, pose: { x: 0.6 } }}
      />
      <Zone target={{ key: 'field', params: { alpha: 0.4 } }} className="section" id="posts">
        <div className="wrap">
          <div className="filters" style={{ marginBottom: 48 }}>
            <div className="segmented" role="group" aria-label="Category">
              {CATS.map((c) => (
                <button key={c} aria-pressed={cat === c} onClick={() => setCat(c)}>
                  {c}
                </button>
              ))}
            </div>
            <span className="mono muted">{list.length} essays</span>
          </div>
          <div className="journal-list">
            {list.map((p, i) => (
              <Story key={p.slug} post={p} index={i} />
            ))}
          </div>
        </div>
      </Zone>
    </div>
  );
}
