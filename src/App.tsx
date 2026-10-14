import { useEffect } from 'react';
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
import { BackToTop } from './components/BackToTop';
import { LoginProvider } from './components/Login';

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

  // Dark mode trigger from URL: ?theme=dark, #/?theme=dark, or #/dark
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const searchTheme = searchParams.get('theme');
    const hash = window.location.hash || '';
    const isDark = searchTheme === 'dark' || hash.includes('theme=dark') || hash.includes('/dark') || pathname.startsWith('/dark');

    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.add('dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      document.body.classList.remove('dark');
    }
  }, [pathname]);

  // Endless decorative animations (pulses, beams, spinning dials) pause while their section is off screen;
  // the matching rule is [data-offscreen] in base.css. <main> remounts per page, so this re-runs for each.
  useEffect(() => {
    const io = new IntersectionObserver((entries) => entries.forEach((e) => e.target.toggleAttribute('data-offscreen', !e.isIntersecting)));
    document.querySelectorAll('#main section, .footer').forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pathname]);

  // Cards and buttons light up where the cursor is.
  useEffect(() => {
    let raf = 0;
    let last: PointerEvent | null = null;
    const update = () => {
      raf = 0;
      const t = (last?.target as HTMLElement | null)?.closest?.('.cell, .btn-primary, .btn-ghost, .btn-light, .nav-cta') as HTMLElement | null;
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
    <LoginProvider>
      <div className="app">
        <a className="skip" href="#main" onClick={(e) => (e.preventDefault(), document.getElementById('main')?.focus())}>
          Skip to content
        </a>
        <RouteSweep />
        <Nav />
        <main id="main" tabIndex={-1} key={pathname}>
          <Outlet />
        </main>
        <Footer />
        <BackToTop />
      </div>
    </LoginProvider>
  );
}

const router = createHashRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'dark', Component: Home },
      { path: 'about', Component: About },
      { path: 'research', Component: Research },
      { path: 'careers', Component: Careers },
      { path: 'services', Component: Blog },
      { path: 'services/:slug', Component: Article },
      // old links keep working
      { path: 'publications', Component: Blog },
      { path: 'publications/:slug', Component: Article },
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
