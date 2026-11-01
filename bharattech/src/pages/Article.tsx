import { useEffect, useRef, type CSSProperties, type RefObject } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { Quiet } from '../components/PageHero';
import { Arrow, BtnText, toneStyle } from '../components/ui';
import { CATEGORY_TONE, EMAIL, POSTS } from '../content';
import { NotFound } from './NotFound';
import { Cover } from '../components/art';
import { useQuiet } from '../gl/Scene';
import { trackBox } from '../components/trackBox';
import type { HueName } from '../gl/palette';

type Post = (typeof POSTS)[number];

const toneOf = (p: Post): HueName => CATEGORY_TONE[p.category] ?? 'violet';
/** Text on a field of the post's colour: white reads on violet, ink on the warm orange and yellow. */
const onTone = (tone: HueName) => (tone === 'violet' ? '#FFFFFF' : '#14130F');

export function Article() {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const articleRef = useRef<HTMLElement>(null);
  useQuiet(articleRef);
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) return <NotFound />;
  const at = POSTS.indexOf(post);
  const tone = toneOf(post);
  // the posts either side in the Blog's own order, the way the deck runs
  const prev = POSTS[at - 1];
  const next = POSTS[at + 1];
  // A post opens from the Blog and from the home page's services deck; the way back and the next reads stay in
  // the section it was opened from (old /publications links belong to the Blog).
  const [base, baseLabel] = pathname.startsWith('/services/') ? ['/services', 'Services'] : ['/blog', 'Blog'];
  return (
    <>
      <ReadingProgress article={articleRef} tone={tone} />
      <section ref={articleRef} className="article" style={toneStyle(tone, { '--on-tone': onTone(tone) } as CSSProperties)}>
        <div className="wrap">
          <Link to={base} className="text-link back">
            <Arrow dir="left" size={12} /> {baseLabel}
          </Link>
          <header className="article-hero">
            <div className="article-hero-text">
              <p className="post-meta">
                <span>{post.category}</span>
                {post.date} · {post.read} read
              </p>
              <h1 className="h1 article-title">{post.title}</h1>
              <p className="article-dek">{post.dek}</p>
            </div>
            {/* where the cover lands when the post is opened from the Blog's deck (components/blog/coverMorph.ts) */}
            <div className="article-hero-art" data-morph-target="">
              <Cover index={at} label={post.category} />
            </div>
          </header>
          <div className="article-column">
            <p className="article-body">{post.excerpt}</p>
            <aside className="article-end" aria-labelledby="article-end-title">
              <h2 id="article-end-title">Full essay coming.</h2>
              <p>We publish the full piece once it has been reviewed. Want it when it lands?</p>
              <a href={`mailto:${EMAIL}?subject=${encodeURIComponent(`Essay: ${post.title}`)}`} className="btn btn-primary">
                <BtnText>Ask us to send it</BtnText> <Arrow />
              </a>
            </aside>
          </div>
        </div>
      </section>
      <Quiet className="section article-more">
        <div className="wrap">
          <nav className="article-pager" aria-label="More posts">
            {prev && <PagerCard post={prev} to={`${base}/${prev.slug}`} dir="prev" />}
            {next && <PagerCard post={next} to={`${base}/${next.slug}`} dir="next" />}
          </nav>
        </div>
      </Quiet>
    </>
  );
}

/** The post before or after this one, with its cover, in its category's colour. */
function PagerCard({ post, to, dir }: { post: Post; to: string; dir: 'prev' | 'next' }) {
  return (
    <Link to={to} className={`pager-card is-${dir}`} style={toneStyle(toneOf(post))}>
      <Cover index={POSTS.indexOf(post)} label={post.category} />
      <span className="pager-copy">
        <span className="pager-dir">
          {dir === 'prev' ? (
            <>
              <Arrow dir="left" size={12} /> Previous
            </>
          ) : (
            <>
              Next <Arrow size={12} />
            </>
          )}
        </span>
        <span className="pager-title">{post.title}</span>
        <span className="pager-dek">{post.dek}</span>
      </span>
    </Link>
  );
}

/** A thin bar across the top of the window that fills as the article is read; written only on scroll. */
function ReadingProgress({ article, tone }: { article: RefObject<HTMLElement>; tone: HueName }) {
  const fill = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = article.current;
    const bar = fill.current;
    if (!el || !bar) return;
    const { box, release } = trackBox(el);
    let raf = 0;
    let shown = '';
    const draw = () => {
      raf = 0;
      const run = box.height - window.innerHeight;
      const p = run > 1 ? Math.min(1, Math.max(0, (window.scrollY - box.top) / run)) : 1;
      const value = `scaleX(${p.toFixed(3)})`;
      if (value !== shown) bar.style.transform = shown = value;
    };
    const onScroll = () => (raf ||= requestAnimationFrame(draw));
    window.addEventListener('scroll', onScroll, { passive: true });
    draw();
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      release();
    };
  }, [article]);
  return (
    <div className="article-progress" style={toneStyle(tone)} aria-hidden="true">
      <i ref={fill} />
    </div>
  );
}
