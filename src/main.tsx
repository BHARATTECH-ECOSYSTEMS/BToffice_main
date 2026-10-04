import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import './styles/paper.css';
import './styles/motion.css';
import './styles/chapter.css';
import './styles/nav.css';

createRoot(document.getElementById('root')!).render(<App />);
