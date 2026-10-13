import { createRoot } from 'react-dom/client';
// The shared styles load first, so the styles each section imports alongside its component can refine them.
// Imported after App they came last and silently overrode those section rules.
import './styles/base.css';
import './styles/fx.css';
import './styles/story.css';
import './styles/film.css';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
