import { useEffect } from 'react';
import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { SceneProvider, useScene } from './gl/Scene';
import { Nav } from './components/Nav';
import { Rail } from './components/Rail';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Research } from './pages/Research';
import { Careers } from './pages/Careers';
import { Blog } from './pages/Blog';
import { Article } from './pages/Article';
import { Contact } from './pages/Contact';
import { Privacy, Terms } from './pages/Legal';
import { NotFound } from './pages/NotFound';

function Layout() {
  const { pathname, state } = useLocation();
  const { scrollTo } = useScene();

  useEffect(() => {
    const target = (state as { scrollTo?: string } | null)?.scrollTo;
    scrollTo(0, true);
    if (target) {
      const t = setTimeout(() => {
        const el = document.getElementById(target);
        if (el) scrollTo(el);
      }, 120);
      return () => clearTimeout(t);
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

  // Card cursor spotlight & sheen tracking (--gx, --gy) across all cards
  useEffect(() => {
    const selector =
      '.bento, .problem-card, .cap-card, .lab-card, .aud-card, .net-list li, .faq-item, .stack-detail, .jobs-summary, .jobs-board, .scene-demo';
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
