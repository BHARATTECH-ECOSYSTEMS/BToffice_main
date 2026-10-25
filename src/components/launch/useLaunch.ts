import { useCallback, type MouseEvent } from 'react';
import { BRANDS, isPlainClick, launchAllowed, openTab, type Net } from './launchPlan';
import type { LaunchScene } from './launchScene';

/**
 * Starts the app-launch animation (launchPlan.ts) from a brand's icon. `prepare` makes the scene ahead of time
 * (three.js, a WebGL context and two small shaders, ~0.4 s of work on an integrated GPU), meant for when the mouse
 * comes onto the icons; `launch` is the icon's click handler. A link ends by opening its page; an icon with no address
 * yet (a button) ends on a "coming soon" note. Anything we don't animate (a ctrl/middle click, reduced motion, touch,
 * no WebGL, a scene that isn't ready in time) falls back to the link opening as it always did, or the note at once.
 */

let scene: Promise<LaunchScene | null> | null = null;
const make = () => (scene ??= import('./launchScene').then((m) => m.createLaunchScene()).catch(() => null));

const allowed = () =>
  launchAllowed({
    finePointer: window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  });

/** How long a click waits for a scene that is still being made before the link just opens. */
const WAIT_MS = 600;

/** A small note at the bottom of the screen; one at a time. */
function showNote(text: string, ms: number, link?: { href: string; label: string }) {
  document.querySelector('.launch-note')?.remove();
  const note = document.createElement('div');
  note.className = 'launch-note';
  note.setAttribute('role', 'status');
  note.append(text);
  const remove = () => note.remove();
  if (link) {
    const a = document.createElement('a');
    a.href = link.href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = `Open ${link.label}`;
    a.addEventListener('click', remove);
    note.append(' ', a);
  }
  document.body.append(note);
  window.setTimeout(remove, ms);
}

export function useLaunch() {
  const prepare = useCallback(() => {
    if (allowed()) void make();
  }, []);

  const launch = useCallback((e: MouseEvent<HTMLElement>, net: Net, label: string) => {
    const brand = BRANDS[net];
    const link = e.currentTarget;
    const href = link instanceof HTMLAnchorElement ? link.href : null;
    // the launch's last beat: the page in a new tab (a browser that refuses it gets the link in a note, so the
    // visitor is never stuck), or for an icon without an address yet, the note that says so
    const open = href
      ? () => {
          if (openTab(href) === 'blocked') showNote('Your browser kept the new tab closed.', 8000, { href, label });
        }
      : () => showNote(`${label} is coming soon.`, 4000);
    if (!brand || !isPlainClick(e) || !allowed()) {
      if (!href) open();
      return;
    }
    e.preventDefault();
    const icon = (link.querySelector('svg') ?? link).getBoundingClientRect();
    let pointer = { x: e.clientX, y: e.clientY };
    const onMove = (m: PointerEvent) => (pointer = { x: m.clientX, y: m.clientY });

    const ready = Promise.race([make(), new Promise<null>((r) => window.setTimeout(() => r(null), WAIT_MS))]);
    void ready.then((s) => {
      if (!s) return open();
      if (s.playing) return;
      // Escape skips to the end; so does the tab going to the background (the new tab took the screen), so the page
      // is as it was when the visitor comes back
      const onKey = (k: KeyboardEvent) => k.key === 'Escape' && s.finish();
      const onHide = () => document.hidden && s.finish();
      window.addEventListener('pointermove', onMove, { passive: true });
      window.addEventListener('keydown', onKey);
      document.addEventListener('visibilitychange', onHide);
      s.play({
        brand,
        from: { x: icon.left + icon.width / 2, y: icon.top + icon.height / 2, size: icon.width },
        page: getComputedStyle(document.body).backgroundColor,
        pointer: () => pointer,
        onOpen: open,
        onDone: () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('keydown', onKey);
          document.removeEventListener('visibilitychange', onHide);
        },
      });
    });
  }, []);

  return { prepare, launch };
}
