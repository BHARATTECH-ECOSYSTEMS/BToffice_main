#!/usr/bin/env node
/**
 * Renders the site's diagrams to looping MP4 clips and poster frames in public/media (git-ignored).
 *
 *   npm run reels                      # every diagram, both themes
 *   npm run reels -- remember dark     # one diagram / one theme
 *
 * Needs ffmpeg and the motion-render skill (Playwright + Chromium); set MOTION_RENDER to its
 * render.mjs if it lives elsewhere. Starts the Vite dev server itself when nothing is listening on PORT.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'media');
const PORT = Number(process.env.PORT) || 5175;
const RENDER = process.env.MOTION_RENDER || join(homedir(), '.claude/skills/motion-render/render.mjs');
const WIDTH = 1280;
const FPS = 30;
// name: [viewBox width, viewBox height, seconds per loop]; mirrors src/viz/registry.ts
const DIAGRAMS = {
  remember: [480, 300, 12], connect: [480, 300, 12], learn: [480, 300, 12],
  forgets: [480, 300, 10], fragmented: [480, 300, 10], stops: [480, 300, 12], alone: [480, 300, 10],
  network: [560, 380, 15],
};
const THEMES = ['dark', 'light'];

const [nameArg, themeArg] = process.argv.slice(2);
const names = nameArg ? [nameArg] : Object.keys(DIAGRAMS);
const themes = themeArg ? [themeArg] : THEMES;

if (!existsSync(RENDER)) {
  console.error(`motion-render not found at ${RENDER} (set MOTION_RENDER)`);
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const up = () => fetch(`http://localhost:${PORT}/reel.html`).then((r) => r.ok, () => false);
let server;
if (!(await up())) {
  server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], { cwd: ROOT, stdio: 'ignore' });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await up())) {
    server.kill();
    console.error('dev server did not start');
    process.exit(1);
  }
}

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) throw new Error(`${cmd} failed`);
};

try {
  for (const name of names) {
    const [vw, vh, seconds] = DIAGRAMS[name];
    const size = `${WIDTH}x${Math.round((WIDTH * vh) / vw / 2) * 2}`;
    for (const theme of themes) {
      const id = `${name}-${theme}`;
      const url = `http://localhost:${PORT}/reel.html?d=${name}&theme=${theme}&w=${WIDTH}`;
      const tmp = join(tmpdir(), `reel-${id}`);
      rmSync(tmp, { recursive: true, force: true });
      mkdirSync(tmp, { recursive: true });
      console.log(`▸ ${id}`);
      run('node', [RENDER, '--url', url, '--out', join(tmp, 'raw.mp4'), '--size', size, '--fps', String(FPS), '--duration', String(seconds), '--subframes', '2']);
      // small, web-friendly H.264 with the moov atom up front so it starts at once
      run('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, 'raw.mp4'), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, `${id}.mp4`)]);
      const still = (seconds * 0.8).toFixed(1);
      run('node', [RENDER, '--url', url, '--out', join(tmp, 'p.mp4'), '--size', size, '--duration', String(seconds), '--stills', still]);
      run('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, `still_${still}0s.png`), '-q:v', '3', join(OUT, `${id}.jpg`)]);
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  console.log(`done → ${OUT}`);
} finally {
  server?.kill();
}
