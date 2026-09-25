import { useRef } from 'react';
import { Link, useParams } from 'react-router';
import { useFormation } from '../gl/Scene';
import { Cover } from '../components/Cover';
import { Arrow, Fade, Lines } from '../components/Reveal';
import { POSTS, EMAIL } from '../content';
import { NotFound } from './NotFound';

export function Article() {
  const { slug } = useParams();
  const ref = useRef<HTMLElement>(null);
  useFormation(ref, { key: 'field', params: { alpha: 0 } });
  const i = POSTS.findIndex((p) => p.slug === slug);
  if (i < 0) return <NotFound />;
  const post = POSTS[i];
  const next = POSTS[(i + 1) % POSTS.length];
  return (
    <article ref={ref} className="page section" style={{ paddingTop: 160 }}>
      <div className="wrap article">
        <Fade as="p" className="story-meta">
          <Link to="/blog" className="link">
            ← Journal
          </Link>
          <span>{post.category}</span>
          <span>{post.date}</span>
          <span>{post.read} read</span>
        </Fade>
        <Lines as="h1" className="h1" lines={[post.title]} />
        <Fade as="p" className="lede">
          {post.dek}
        </Fade>
        <Fade className="article-cover" delay={200}>
          <Cover seed={post.slug} variant={i} />
        </Fade>
        <Fade className="article-body" delay={250}>
          <p>{post.excerpt}</p>
          <p>
            The full essay is being prepared for publication. For early access or to discuss the research, write to{' '}
            <a className="link violet" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
            .
          </p>
        </Fade>
        <hr className="rule" style={{ margin: '64px 0 32px' }} />
        <Link to={`/blog/${next.slug}`} className="story" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
          <div>
            <p className="mono muted">Next essay</p>
            <p className="story-title" style={{ marginTop: 10 }}>
              {next.title}
            </p>
          </div>
          <Arrow size={22} />
        </Link>
      </div>
    </article>
  );
}
