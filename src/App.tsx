import { useEffect, useRef } from 'react';
import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router';
import { SceneProvider, useScene } from './gl/Scene';
import { Nav } from './components/Nav';
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
import { RouteSweep } from './components/RouteSweep';

/** A hairline along the top of the window that fills as the page is read. */
function ReadProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let max = 1;
    const measureMax = () => {
      max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    const update = () => {
      raf = 0;
      if (ref.current) ref.current.style.transform = `scaleX(${Math.min(1, Math.max(0, window.scrollY / max))})`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    measureMax();
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { measureMax(); onScroll(); }, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return <div className="read-progress" ref={ref} aria-hidden="true" />;
}

function Layout() {
  const { pathname, state } = useLocation();
  const { scrollTo } = useScene();

  // A new page starts at the top, or at the section a link asked for once it has laid out.
  useEffect(() => {
    const target = (state as { scrollTo?: string } | null)?.scrollTo;
    scrollTo(0, true);
    if (!target) return;
    let raf = 0;
    let frame = 0;
    const align = () => {
      const el = document.getElementById(target);
      if (el) scrollTo(el.getBoundingClientRect().top + window.scrollY, true);
      if (frame++ < 12) raf = requestAnimationFrame(align);
    };
    raf = requestAnimationFrame(align);
    return () => cancelAnimationFrame(raf);
  }, [pathname, state, scrollTo]);

  // Cards and solid buttons light up where the cursor is.
  useEffect(() => {
    let raf = 0;
    let last: PointerEvent | null = null;
    const update = () => {
      raf = 0;
      const t = (last?.target as HTMLElement | null)?.closest?.('.cell, .btn-primary, .nav-cta') as HTMLElement | null;
      if (!t || !last) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--mx', `${last.clientX - r.left}px`);
      t.style.setProperty('--my', `${last.clientY - r.top}px`);
    };
    const on = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', on);
    };
  }, []);

  return (
    <div className="app">
      <a className="skip" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
        Skip to content
      </a>
      <ReadProgress />
      <RouteSweep />
      <Nav />
      <main id="main" tabIndex={-1} key={pathname}>
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
