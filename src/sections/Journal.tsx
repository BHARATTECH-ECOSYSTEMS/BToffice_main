import { useRef } from 'react';
import { Link } from 'react-router';
import { useFormation } from '../gl/Scene';
import { Fade, Arrow, SectionHead } from '../components/Reveal';
import { Cover } from '../components/Cover';
import { POSTS } from '../content';

export function Story({ post, index }: { post: (typeof POSTS)[number]; index: number }) {
  return (
    <Fade as="article" delay={index * 90}>
      <Link to={`/blog/${post.slug}`} className="story">
        <div className="story-cover">
          <Cover seed={post.slug} variant={index} />
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          <p className="story-meta">
            <span>{post.category}</span>
            <span>{post.date}</span>
            <span>{post.read}</span>
          </p>
          <h3 className="story-title">{post.title}</h3>
          <p className="story-dek">{post.dek}</p>
        </div>
      </Link>
    </Fade>
  );
}

export function Journal() {
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });
  const [lead, ...rest] = POSTS;
  return (
    <section id="journal" ref={ref} className="section journal" data-chapter="Journal">
      <div className="wrap">
        <SectionHead
          index="10"
          label="Journal"
          title={['Notes from the frontier.']}
          aside={
            <Link to="/blog" className="link">
              Read the journal <Arrow size={13} />
            </Link>
          }
        />
        <div className="journal-grid">
          <Story post={lead} index={0} />
          <div className="journal-side">
            {rest.slice(0, 2).map((p, i) => (
              <Story key={p.slug} post={p} index={i + 1} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
