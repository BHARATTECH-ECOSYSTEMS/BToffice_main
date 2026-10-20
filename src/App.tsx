import { useEffect, useLayoutEffect, type ComponentType } from 'react';
import { createHashRouter, Navigate, Outlet, RouterProvider, useLocation } from 'react-router';
import { SceneProvider, useScene } from './gl/Scene';
import { Nav } from './components/Nav';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { RouteSweep } from './components/RouteSweep';
import { BackToTop } from './components/BackToTop';
import { LoginProvider } from './components/Login';
import { usePointerBloom } from './components/usePointerBloom';
import { useGlassMotion } from './components/useGlassMotion';
// Every page but Home loads on its first visit (see `page` below), but every stylesheet stays here, in the order the
// pages used to be imported in: styles are shared across pages (the footer's verification form uses the contact
// form's), and loading a sheet later would change which rule wins.
import './styles/company-about.css';
import './styles/careers.css';
import './styles/services.css';
import './styles/research.css';
import './styles/contact.css';
import './styles/portal.css';
import './styles/id-card.css';

/** A route whose component is loaded on its first visit: `name` is the component's export in the module. */
const page =
  <M, K extends keyof M>(load: () => Promise<M>, name: K) =>
  async () => ({ Component: (await load())[name] as ComponentType });

const loadAbout = () => import('./pages/About');
const loadResearch = () => import('./pages/Research');
const loadCareers = () => import('./pages/Careers');
const loadBlog = () => import('./pages/Blog');
const loadServices = () => import('./pages/Services');
const loadArticle = () => import('./pages/Article');
const loadContact = () => import('./pages/Contact');
const loadLegal = () => import('./pages/Legal');
const loadNotFound = () => import('./pages/NotFound');
const loadPortal = () => import('./portal/PortalLayout');
const loadDashboard = () => import('./portal/pages/Dashboard');
const loadPeople = () => import('./portal/pages/People');
const loadResources = () => import('./portal/pages/Resources');
const loadCertificates = () => import('./portal/pages/Certificates');
const loadPolicy = () => import('./portal/pages/Policy');
const loadSettings = () => import('./portal/pages/Settings');
const loadCommunity = () => import('./portal/pages/Community');
const loadProfile = () => import('./portal/pages/Profile');
const loadVerification = () => import('./portal/pages/Verification');
const loadLmsParts = () => import('./portal/pages/lms/parts');
const loadCatalogue = () => import('./portal/pages/lms/Catalogue');
const loadCourseDetail = () => import('./portal/pages/lms/CourseDetail');
const loadLearning = () => import('./portal/pages/lms/Learning');
const loadEducator = () => import('./portal/pages/lms/Educator');
const loadAddCourse = () => import('./portal/pages/lms/AddCourse');

/**
 * Once the first page is up and the browser is idle, the other pages are fetched one at a time, so moving between
 * pages stays instant. The public pages come first; the portal follows, as most visitors never sign in.
 */
const PREFETCH = [loadServices, loadCareers, loadResearch, loadAbout, loadContact, loadBlog, loadArticle, loadLegal, loadNotFound, loadPortal, loadDashboard];
/** A link's page, by the start of its hash path, so pointing at a link starts its page loading before the click. */
const BY_PATH: [string, () => Promise<unknown>][] = [
  ['/services/', loadArticle],
  ['/blog/', loadArticle],
  ['/services', loadServices],
  ['/careers', loadCareers],
  ['/research', loadResearch],
  ['/about', loadAbout],
  ['/contact', loadContact],
  ['/blog', loadBlog],
  ['/privacy', loadLegal],
  ['/terms', loadLegal],
];
function usePrefetchPages() {
  useEffect(() => {
    const onIntent = (e: Event) => {
      const href = (e.target as Element | null)?.closest?.('a[href^="#/"]')?.getAttribute('href')?.slice(1);
      const hit = href && BY_PATH.find(([path]) => href.startsWith(path));
      if (hit) hit[1]().catch(() => undefined);
    };
    document.addEventListener('pointerover', onIntent, { passive: true });
    document.addEventListener('focusin', onIntent);
    return () => {
      document.removeEventListener('pointerover', onIntent);
      document.removeEventListener('focusin', onIntent);
    };
  }, []);
  useEffect(() => {
    const idle = (fn: () => void) => (typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(fn, { timeout: 4000 }) : window.setTimeout(fn, 200));
    let cancelled = false;
    let k = 0;
    const next = () => {
      if (cancelled || k >= PREFETCH.length) return;
      PREFETCH[k++]()
        .catch(() => undefined) // a failed prefetch is retried by the real visit
        .then(() => idle(next));
    };
    // after the first page's own idle warm-ups (the home page builds its 3D worlds in its first seconds)
    const start = window.setTimeout(() => idle(next), 8000);
    return () => {
      cancelled = true;
      window.clearTimeout(start);
    };
  }, []);
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

  // Dark mode trigger from URL: ?theme=dark, #/?theme=dark, or #/dark. The Services and Research pages are always dark:
  // a night journey and a glowing swarm, and the whole page (nav, closing section, footer) stays with them.
  // A layout effect, so the theme is right before any page's effects run: the hero's 3D scene reads it once when it
  // is built, and coming from Services (always dark) it used to be built while the page was still dark.
  useLayoutEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const searchTheme = searchParams.get('theme');
    const hash = window.location.hash || '';
    const isDark =
      searchTheme === 'dark' || hash.includes('theme=dark') || hash.includes('/dark') || pathname.startsWith('/dark') || pathname === '/services' || pathname === '/research';

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

  usePointerBloom();
  usePrefetchPages();
  // the glass boxes lean towards the mouse on a spring, and a shine follows it
  useGlassMotion();

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
    // opening a page straight from its link shows the page colour for the moment its code takes to arrive
    HydrateFallback: () => null,
    children: [
      { index: true, Component: Home },
      { path: 'dark', Component: Home },
      { path: 'about', lazy: page(loadAbout, 'About') },
      { path: 'research', lazy: page(loadResearch, 'Research') },
      { path: 'careers', lazy: page(loadCareers, 'Careers') },
      { path: 'services', lazy: page(loadServices, 'Services') },
      { path: 'services/:slug', lazy: page(loadArticle, 'Article') },
      // old links keep working
      { path: 'publications', lazy: page(loadBlog, 'Blog') },
      { path: 'publications/:slug', lazy: page(loadArticle, 'Article') },
      { path: 'blog', lazy: page(loadBlog, 'Blog') },
      { path: 'blog/:slug', lazy: page(loadArticle, 'Article') },
      { path: 'contact', lazy: page(loadContact, 'Contact') },
      { path: 'privacy', lazy: page(loadLegal, 'Privacy') },
      { path: 'terms', lazy: page(loadLegal, 'Terms') },
      { path: '*', lazy: page(loadNotFound, 'NotFound') },
    ],
  },
  // The employee portal, opened by signing in. It has its own shell, so the site's nav and footer stay out.
  {
    path: '/portal',
    lazy: page(loadPortal, 'PortalLayout'),
    HydrateFallback: () => null,
    children: [
      { index: true, lazy: page(loadDashboard, 'Dashboard') },
      { path: 'people', lazy: page(loadPeople, 'People') },
      { path: 'community', lazy: page(loadCommunity, 'Community') },
      { path: 'profile', lazy: page(loadProfile, 'Profile') },
      { path: 'resources', lazy: page(loadResources, 'Resources') },
      { path: 'tools/:id', lazy: page(loadResources, 'ToolPage') },
      { path: 'certificates', lazy: page(loadCertificates, 'Certificates') },
      { path: 'policy', lazy: page(loadPolicy, 'Policy') },
      { path: 'settings', lazy: page(loadSettings, 'Settings') },
      {
        path: 'lms',
        lazy: page(loadLmsParts, 'LmsShell'),
        children: [
          { index: true, lazy: page(loadCatalogue, 'LmsHome') },
          { path: 'courses', lazy: page(loadCatalogue, 'CourseList') },
          { path: 'course/:id', lazy: page(loadCourseDetail, 'CourseDetail') },
          { path: 'enrollments', lazy: page(loadLearning, 'MyEnrollments') },
          { path: 'player/:id', lazy: page(loadLearning, 'Player') },
          {
            path: 'educator',
            lazy: page(loadEducator, 'EducatorOnly'),
            children: [
              { index: true, lazy: page(loadEducator, 'EducatorDashboard') },
              { path: 'add', lazy: page(loadAddCourse, 'AddCourse') },
              { path: 'courses', lazy: page(loadEducator, 'MyCourses') },
              { path: 'students', lazy: page(loadEducator, 'StudentsEnrolled') },
            ],
          },
        ],
      },
      {
        path: 'interview',
        lazy: async () => {
          const { Soon } = await loadResources();
          return { element: <Soon title="Interview" sub="Interview tests for candidates." body="This section will be connected once its screens are available." /> };
        },
      },
      { path: 'verification', element: <Navigate to="company" replace /> },
      { path: 'verification/company', lazy: page(loadVerification, 'CompanyVerification') },
      { path: 'verification/employee', lazy: page(loadVerification, 'EmployeeVerification') },
      { path: 'verification/requests', lazy: page(loadVerification, 'EmploymentVerification') },
      { path: '*', lazy: page(loadResources, 'PortalNotFound') },
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
