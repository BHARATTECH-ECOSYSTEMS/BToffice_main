import { Link, useParams } from 'react-router';
import { Quiet } from '../components/PageHero';
import { Arrow, Reveal, toneStyle } from '../components/ui';
import { EMAIL, POSTS } from '../content';
import { NotFound } from './NotFound';
import { Cover } from '../components/art';

export function Article() {
  const { slug } = useParams();
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return <NotFound />;
  const more = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);
  return (
    <>
      <Quiet className="article">
        <div className="wrap article-wrap">
          <Link to="/publications" className="text-link back">
            <Arrow dir="left" size={12} /> Publications
          </Link>
          <p className="post-meta" style={toneStyle('violet')}>
            <span>{post.category}</span>
            {post.date} · {post.read} read
          </p>
          <h1 className="h1">{post.title}</h1>
          <p className="article-dek">{post.dek}</p>
          <div className="article-cover">
            <Cover index={POSTS.indexOf(post)} label={post.category} />
          </div>
          <p className="article-body">{post.excerpt}</p>
          <div className="cell cell-tint article-note" style={toneStyle('violet')}>
            <p className="cell-label">Full essay coming</p>
            <p>
              We publish the full piece once it has been reviewed. Want it when it lands? <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Essay: ${post.title}`)}`}>Ask us to send it.</a>
            </p>
          </div>
        </div>
      </Quiet>
      <Quiet>
        <div className="wrap">
          <p className="cell-label more-label">Read next</p>
          <div className="bento posts-bento">
            {more.map((p, i) => (
              <Reveal key={p.slug} className="cell post" delay={i * 70}>
                <Link to={`/publications/${p.slug}`} className="cell-link" style={toneStyle('violet')}>
                  <Cover index={POSTS.indexOf(p)} label={p.category} />
                  <p className="post-meta">
                    <span>{p.category}</span>
                    {p.date}
                  </p>
                  <h3>{p.title}</h3>
                  <p>{p.dek}</p>
                  <span className="cell-go">
                    Read <Arrow />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </Quiet>
    </>
  );
}
