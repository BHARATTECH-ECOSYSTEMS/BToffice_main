import { useRef } from 'react';
import { Link } from 'react-router';
import { useStage } from '../gl/Scene';
import { Fade, Arrow, SectionHead } from '../components/Reveal';
import { Cover } from '../components/Cover';
import { POSTS } from '../content';

export function Story({ post, index }: { post: (typeof POSTS)[number]; index: number }) {
  return (
    <Fade as="article" delay={index * 140}>
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
  // no card of its own: on wide screens the mark rests in the panel, on phones it stays out of sight
  useStage(ref, 'notes', {
    fig: '10',
    name: 'Notes',
    caption: 'Notes from the people building it, newest on top',
    labels: () => POSTS.slice(0, 3).map((p, i) => ({ text: `0${i + 1} · ${p.category}`, hot: i === 0, side: 'above' as const })),
  });
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
