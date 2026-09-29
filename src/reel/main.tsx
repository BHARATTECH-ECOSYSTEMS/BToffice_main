import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import '../styles/global.css';
import { Diagram } from '../viz/Diagram';
import { REGISTRY } from '../viz/registry';

/**
 * Deterministic export of one diagram, for scripts/render-reels.mjs.
 *   /reel.html?d=remember&theme=dark&w=1280
 * Every frame is a pure function of t, so the renderer can seek to any moment and the clips loop seamlessly.
 */
const q = new URLSearchParams(location.search);
const name = q.get('d') && q.get('d')! in REGISTRY ? q.get('d')! : 'remember';
const entry = REGISTRY[name];
document.documentElement.dataset.theme = q.get('theme') === 'light' ? 'light' : 'dark';

const host = document.getElementById('root')!;
host.style.width = `${Number(q.get('w')) || 1280}px`;
host.style.background = 'var(--card-2)';
const root = createRoot(host);

const seek = (t: number) =>
  flushSync(() => root.render(<Diagram draw={entry.draw} period={entry.period} w={entry.w} h={entry.h} at={((t % entry.period) + entry.period) % entry.period} label={name} />));

Object.assign(window, { seek, __duration: entry.period });
seek(0);
