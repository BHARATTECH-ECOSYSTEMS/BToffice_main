import gsap from 'gsap';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { cardWriter, cssStage, facingOf, smooth, pointerIn } from './shared';

/** A team card, in CSS pixels (= world units). */
export const TEAM_W = 210;
export const TEAM_H = 250;

const PITCH = 252; // room per card around the ring: wider than a card, so neighbours never touch
const FOV = 30;
const AUTO_SPEED = 0.1; // radians per second at rest
const HOVER_GAIN = 0.7; // how far the ring follows the mouse moving over the cards
const HOVER_GLIDE = 0.35; // share of that speed it keeps once the mouse stops
const HOVER_GRACE = 300; // ms the cursor may spend between cards and still turn it
const FRICTION = 2.6;
const DRAG_SLOP = 6;
const DROP = 420; // how far above its place each card starts, for the entrance

export interface TeamRing {
  frame: (now: number) => void;
  /** Whether the last press became a drag, so it should not count as a click. */
  dragged: () => boolean;
  destroy: () => void;
}

/**
 * The Careers hero: every team on one ring that turns slowly, seen from a little above (after Scrolltide's
 * Circular Slider). On arrival the cards are laid one after another, each dropping onto its place and settling, so the
 * page opens on a foundation being set. The mouse moving across the cards turns the ring with it; a press and drag
 * started on a card does the same on touch. Empty space does neither.
 */
export function mountTeamRing({ stage, hosts, reduced }: { stage: HTMLElement; hosts: HTMLElement[]; reduced: boolean }): TeamRing {
  const n = hosts.length;
  const ringR = (n * PITCH) / (2 * Math.PI);
  const angles = hosts.map((_, i) => (i / n) * Math.PI * 2);

  let fitD = 1;
  const { camera, scene, objects, size, render, destroy: destroyStage } = cssStage(stage, hosts, TEAM_W, TEAM_H, (w, h) => {
    // stand back far enough that the whole ring fits the stage: across, the cards at the sides are seen nearly edge
    // on, so the ring is about its diameter wide; down, the cards and the ring's far side seen from above
    const half = Math.tan((FOV / 2) * (Math.PI / 180));
    const byWidth = (ringR * 2 + 150) / (2 * half * (w / h));
    const byHeight = (TEAM_H * 1.5 + ringR * 0.8) / (2 * half);
    fitD = Math.max(byWidth, byHeight) + ringR * 0.6;
  });
  camera.fov = FOV;
  const write = cardWriter(hosts, objects);

  // the ground the ring stands on, lying flat under the cards' feet: a soft violet pool with a fine rim
  const floorEl = document.createElement('div');
  floorEl.className = 'cr-ring__floor';
  floorEl.style.width = floorEl.style.height = `${Math.round(ringR * 2 + 240)}px`;
  const floor = new CSS3DObject(floorEl);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -TEAM_H / 2 - 22;
  scene.add(floor);
  const laid = reduced ? null : gsap.from(floor.scale, { x: 0.45, y: 0.45, duration: 1.5, ease: 'expo.out', delay: 0.1 });

  // the entrance: each card falls onto its place in turn
  const drops = hosts.map(() => ({ v: reduced ? 0 : 1 }));
  const intro = reduced ? null : gsap.to(drops, { v: 0, duration: 1.15, ease: 'expo.out', stagger: 0.09, delay: 0.2 });

  // the ring also turns a little way into place while the cards land, so the drop and the turn read as one motion
  const entry = { a: reduced ? 0 : -0.6 };
  const settle = reduced ? null : gsap.to(entry, { a: 0, duration: 2.2, ease: 'expo.out', delay: 0.2 });
  let turned = 0; // turn from the visitor and the idle clock
  let velocity = 0;
  let idleSpeed = 1;
  let overCard = false;
  let dragging = false;
  let pressedCard = false;
  let pressX = 0;
  let lastX = 0;
  let lastT = 0;
  let moved = 0;
  let front = -1;
  let last = performance.now();
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  const turnBy = (a: number) => {
    turned += a;
  };

  const frame = (now: number) => {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!reduced) {
      idleSpeed += ((overCard || dragging ? 0 : 1) - idleSpeed) * Math.min(1, dt * 5);
      if (!dragging) {
        turnBy(velocity * dt + AUTO_SPEED * idleSpeed * dt);
        velocity *= Math.exp(-FRICTION * dt);
      }
      pointer.x += (pointer.tx - pointer.x) * Math.min(1, dt * 3);
      pointer.y += (pointer.ty - pointer.y) * Math.min(1, dt * 3);
    }

    camera.position.set(pointer.x * 60, fitD * 0.34 - pointer.y * 30, fitD);
    camera.lookAt(0, -24, 0);
    camera.updateMatrixWorld();

    const theta = entry.a + turned;
    let best = -1;
    let bestFacing = -2;
    for (let i = 0; i < n; i++) {
      const b = angles[i] + theta;
      const drop = smooth(drops[i].v);
      const obj = objects[i];
      obj.position.set(Math.sin(b) * ringR, drop * DROP, Math.cos(b) * ringR);
      obj.rotation.set(-drop * 0.5, b, 0, 'YXZ');
      const facing = facingOf(obj, camera);
      // the far side recedes rather than showing a row of blank backs
      const alpha = (1 - drop) * (0.2 + 0.8 * smooth((facing + 0.05) / 0.5));
      write(i, alpha, facing);
      if (facing > bestFacing) {
        bestFacing = facing;
        best = i;
      }
    }
    if (best !== front) {
      if (front >= 0) hosts[front].removeAttribute('data-front');
      hosts[best]?.setAttribute('data-front', '');
      front = best;
    }
    render();
  };

  // ── pointer
  let hoverX = 0;
  let hoverT = 0;
  let lastOnCard = -Infinity;
  const onCard = (e: Event) => !!(e.target as Element).closest?.('.cr-team');
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    pressedCard = onCard(e);
    pressX = lastX = e.clientX;
    lastT = performance.now();
    moved = 0;
  };
  const onMove = (e: PointerEvent) => {
    if (!reduced && e.pointerType === 'mouse') {
      [pointer.tx, pointer.ty] = pointerIn(e);
    }
    const t = performance.now();
    if (!(e.buttons & 1)) {
      // a mouse moving across the cards, no button held: the ring travels with it
      if (onCard(e)) lastOnCard = t;
      const dx = e.clientX - hoverX;
      const dtS = Math.max(0.008, (t - hoverT) / 1000);
      hoverX = e.clientX;
      hoverT = t;
      if (reduced || e.pointerType !== 'mouse' || t - lastOnCard > HOVER_GRACE || Math.abs(dx) > 160) return;
      const turn = (dx / size.width) * Math.PI * 0.9 * HOVER_GAIN;
      turnBy(turn);
      velocity = (turn / dtS) * HOVER_GLIDE;
      return;
    }
    if (!pressedCard) return;
    moved = Math.max(moved, Math.abs(e.clientX - pressX));
    if (!dragging && moved > DRAG_SLOP) {
      dragging = true;
      stage.setPointerCapture(e.pointerId);
      stage.classList.add('is-dragging');
    }
    if (!dragging) return;
    const turn = ((e.clientX - lastX) / size.width) * Math.PI * 0.9;
    turnBy(turn);
    velocity = reduced ? 0 : turn / Math.max(0.008, (t - lastT) / 1000);
    lastX = e.clientX;
    lastT = t;
  };
  const onUp = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    stage.releasePointerCapture?.(e.pointerId);
    stage.classList.remove('is-dragging');
    if (performance.now() - lastT > 80) velocity = 0; // a pause before letting go means no flick
  };
  const onOver = (e: PointerEvent) => (overCard = onCard(e));
  const onLeave = () => {
    overCard = false;
    pointer.tx = 0;
    pointer.ty = 0;
  };
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerover', onOver);
  stage.addEventListener('pointerleave', onLeave);

  return {
    frame,
    dragged: () => moved > DRAG_SLOP,
    destroy: () => {
      intro?.kill();
      settle?.kill();
      laid?.kill();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('pointerover', onOver);
      stage.removeEventListener('pointerleave', onLeave);
      destroyStage();
    },
  };
}
