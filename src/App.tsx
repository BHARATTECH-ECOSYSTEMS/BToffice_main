import { useEffect } from 'react';
import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { SceneProvider, useScene } from './gl/Scene';
import { Nav } from './components/Nav';
import { Rail } from './components/Rail';
import { Footer } from './components/Footer';
import { Opening } from './components/Opening';
import { useScrollFx } from './components/ScrollFx';
import { PageCurtain } from './components/PageCurtain';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Research } from './pages/Research';
import { Careers } from './pages/Careers';
import { Blog } from './pages/Blog';
import { Article } from './pages/Article';
import { Contact } from './pages/Contact';
import { Privacy, Terms } from './pages/Legal';
import { NotFound } from './pages/NotFound';

// Each chapter tints the paper a little, the way a printed report changes stock between parts.
const CHAPTER_TINT: Record<string, string> = {
  top: 'cream',
  intro: 'cream',
  mission: 'blush',
  capabilities: 'lilac',
  how: 'mist',
  architecture: 'lilac',
  network: 'sage',
  laboratory: 'sand',
  audiences: 'blush',
  builders: 'cream',
  journal: 'sand',
  faq: 'cream',
  next: 'lilac',
};

function Layout() {
  const { pathname, state } = useLocation();
  const { scrollTo } = useScene();
  useScrollFx(pathname);

  useEffect(() => {
    const target = (state as { scrollTo?: string } | null)?.scrollTo;
    scrollTo(0, true);
    if (target) {
      let raf = 0;
      let frame = 0;
      let lastTop = -1;
      const align = () => {
        const el = document.getElementById(target);
        if (!el) {
          if (frame++ < 18) raf = requestAnimationFrame(align);
          return;
        }

        // Pinned chapters calculate their full scroll height after mounting. Follow
        // that measurement until it settles so navigation never lands mid-chapter.
        const top = el.getBoundingClientRect().top + window.scrollY;
        if (Math.abs(top - lastTop) > 0.5 || Math.abs(window.scrollY - top) > 1) {
          scrollTo(top, true);
          lastTop = top;
        }
        if (frame++ < 18) raf = requestAnimationFrame(align);
      };
      raf = requestAnimationFrame(align);
      return () => cancelAnimationFrame(raf);
    }
  }, [pathname, state, scrollTo]);

  // The fill of solid buttons blooms from wherever the cursor enters.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const b = (e.target as HTMLElement).closest?.('.btn-solid') as HTMLElement | null;
      if (!b) return;
      const r = b.getBoundingClientRect();
      b.style.setProperty('--mx', `${e.clientX - r.left}px`);
      b.style.setProperty('--my', `${e.clientY - r.top}px`);
    };
    window.addEventListener('pointerover', onMove);
    return () => window.removeEventListener('pointerover', onMove);
  }, []);

  // Chapter tint: whichever section holds the middle of the screen sets the paper colour.
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('main section'));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) root.style.setProperty('--tint', `var(--tint-${CHAPTER_TINT[e.target.id] ?? 'cream'})`);
        }
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pathname]);

  // Card cursor spotlight & sheen tracking (--gx, --gy) across all cards
  useEffect(() => {
    const selector =
      '.bento, .problem-card, .cap-card, .lab-card, .aud-card, .net-list li, .faq-item, .stack, .stack-detail, .jobs-summary, .jobs-board, .scene-demo, .finale-cta, .hero-facts, .story-cover, .caps-base';
    let rafId = 0;
    let lastEvent: PointerEvent | null = null;
    const update = () => {
      rafId = 0;
      const e = lastEvent;
      const card = e?.target
        ? ((e.target as HTMLElement).closest?.(selector) as HTMLElement | null)
        : null;
      if (!e || !card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--gx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--gy', `${e.clientY - rect.top}px`);
    };
    const onPointerMove = (e: PointerEvent) => {
      lastEvent = e;
      if (!rafId) {
        rafId = requestAnimationFrame(update);
      }
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, []);

  return (
    <div className="app">
      <div className="grain" aria-hidden="true" />
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        Skip to content
      </a>
      <Nav />
      <Rail />
      <main id="main" className="folio-main" tabIndex={-1} key={pathname} style={{ outline: 'none' }}>
        <Outlet />
      </main>
      <Footer />
      <PageCurtain />
      <Opening />
    </div>
  );
}

const router = createHashRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'about', Component: About },
      { path: 'research', Component: Research },
      { path: 'careers', Component: Careers },
      { path: 'publications', Component: Blog },
      { path: 'publications/:slug', Component: Article },
      // old links keep working
      { path: 'blog', Component: Blog },
      { path: 'blog/:slug', Component: Article },
      { path: 'contact', Component: Contact },
      { path: 'privacy', Component: Privacy },
      { path: 'terms', Component: Terms },
      { path: '*', Component: NotFound },
    ],
  },
]);

export default function App() {
  return (
    <SceneProvider>
      <RouterProvider router={router} />
    </SceneProvider>
  );
}
