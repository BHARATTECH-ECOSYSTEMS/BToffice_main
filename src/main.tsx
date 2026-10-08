import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/base.css';
import './styles/fx.css';
import './styles/story.css';
import './styles/film.css';

createRoot(document.getElementById('root')!).render(<App />);
