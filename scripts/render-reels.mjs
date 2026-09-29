#!/usr/bin/env node
/**
 * Renders the motion scenes in src/reel to looping MP4 clips + poster frames in public/media.
 *
 *   npm run reels                 # every scene, both themes
 *   npm run reels -- memory dark  # one scene / one theme
 *
 * Needs ffmpeg and the motion-render skill (Playwright + Chromium). Set MOTION_RENDER to
 * its render.mjs if it lives somewhere else. Starts the Vite dev server itself when nothing
 * is listening on PORT.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'public', 'media');
const PORT = Number(process.env.PORT) || 5175;
const RENDER = process.env.MOTION_RENDER || join(homedir(), '.claude/skills/motion-render/render.mjs');
const SCENES = ['memory', 'connect', 'learn', 'origin'];
const THEMES = ['dark', 'light'];
const SIZE = '1280x800';
const FPS = 30;
const DURATION = 8;

const [sceneArg, themeArg] = process.argv.slice(2);
const scenes = sceneArg ? [sceneArg] : SCENES;
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
  for (const scene of scenes) {
    for (const theme of themes) {
      const name = `${scene}-${theme}`;
      const url = `http://localhost:${PORT}/reel.html?scene=${scene}&theme=${theme}&w=1280`;
      const tmp = join(tmpdir(), `reel-${name}`);
      rmSync(tmp, { recursive: true, force: true });
      mkdirSync(tmp, { recursive: true });
      console.log(`▸ ${name}`);
      run('node', [RENDER, '--url', url, '--out', join(tmp, 'raw.mp4'), '--size', SIZE, '--fps', String(FPS), '--duration', String(DURATION), '--subframes', '3']);
      // small, web-friendly H.264 with the moov atom up front so it starts playing at once
      run('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, 'raw.mp4'), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', join(OUT, `${name}.mp4`)]);
      run('node', [RENDER, '--url', url, '--out', join(tmp, 'p.mp4'), '--size', SIZE, '--duration', String(DURATION), '--stills', '4.5']);
      run('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(tmp, 'still_4.50s.png'), '-q:v', '4', join(OUT, `${name}.jpg`)]);
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  console.log(`done → ${OUT}`);
} finally {
  server?.kill();
}
