import { createRoot } from 'react-dom/client';
// The shared styles load first, so the styles each section imports alongside its component can refine them.
// Imported after App they came last and silently overrode those section rules.
import './styles/base.css';
import './styles/fx.css';
import './styles/search-pill.css';
import './styles/story.css';
import './styles/film.css';
// the shared 3D glass for light boxes; last, so it layers over each box's own colour
import './styles/glass.css';
import App from './App';

// A tab opened before a new build still asks for the old build's page files, which are gone, and the page broke into
// the router's error screen. Reload once to pick up the new build; the 10 s guard stops a loop if a file is truly missing.
window.addEventListener('vite:preloadError', () => {
  const KEY = 'bt-reloaded-for-build';
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 10_000) return;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return; // storage blocked: without the guard a reload could repeat, so show the error instead
  }
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(<App />);
