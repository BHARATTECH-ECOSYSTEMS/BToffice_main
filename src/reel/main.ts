import { mountScene } from './live';
import { DURATION, SCENE_NAMES, type SceneName } from './scenes';
import type { ThemeName } from './stage';

/**
 * Deterministic export of a scene, for scripts/render-reels.mjs.
 *   /reel.html?scene=memory&theme=dark&w=1280        (video renderer, seek-driven)
 *   /reel.html?scene=memory&theme=dark&w=1280&live=1 (interactive preview)
 */
const q = new URLSearchParams(location.search);
const name = (SCENE_NAMES.includes(q.get('scene') as SceneName) ? q.get('scene') : 'memory') as SceneName;
const theme: ThemeName = q.get('theme') === 'light' ? 'light' : 'dark';
const w = Number(q.get('w')) || 1280;

const host = document.getElementById('host') as HTMLElement;
host.style.width = `${w}px`;
const m = mountScene(host, name, theme, { live: !!q.get('live') });
Object.assign(window, { seek: m.seek, __duration: DURATION });
