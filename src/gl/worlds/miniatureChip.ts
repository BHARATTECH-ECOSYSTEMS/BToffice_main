import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { easeInOut, easeOutBack, lerp, span } from '../ink';
import {
  BRAND,
  HUE,
  TAU,
  type DomainWorld,
  createContactShadow,
  createGrowingTube,
  createPointCloud,
  createStage,
  disposeScene,
  frosted,
  lacquer,
  seeded,
  setColor,
  setGroupOpacity,
  timeline,
} from './kit';

/**
 * 06 · Miniature Intelligence — poured into a phone.
 * shrink: a swirling cloud of model particles funnels into one phone's screen and its chip lights up ·
 * deploy: a laptop, a watch and earbuds appear and each receives a stream · local: every device runs its
 * own screen · connected: dotted links carry packets back and forth to the phone.
 */

const PHONE = { w: 0.88, h: 1.76, d: 0.08 };
const PHONE_Y = -0.08;
const SCREEN = { w: 0.78, h: 1.62 };
const PIX_X = 13;
const PIX_Y = 26;
const CLOUD = 900;
const CLOUD_CENTRE = new THREE.Vector3(0, 0.95, 0.15);
const STREAM = 26;
const LINK_BEADS = 20;
const BARS = 6;

/**
 * Screens are opaque: a transparent screen is sorted and drawn after the particles landing on it,
 * and would paint over them.
 */
function glowMaterial(colour: THREE.Color) {
  const m = frosted(colour, 1);
  m.transparent = false;
  m.depthWrite = true;
  m.emissive = colour.clone();
  m.emissiveIntensity = 0.15;
  return m;
}

export function createMiniatureChip(): DomainWorld {
  const { scene, camera, rig, frame } = createStage(
    [
      { radius: 1.95, bottom: -1.02, top: 0.2 },
      { radius: 1.05, bottom: -1.02, top: 1.35 },
    ],
    0.22,
    30,
    new THREE.Vector3(0, -0.07, 0),
    1.22
  );
  const world = new THREE.Group();
  scene.add(world);

  const shadow = createContactShadow(1.6, 0.12);
  shadow.position.y = PHONE_Y - PHONE.h / 2 - 0.02;
  shadow.scale.set(1.15, 1, 0.6);
  world.add(shadow);

  // The phone
  const phone = new THREE.Group();
  phone.position.y = PHONE_Y;
  phone.rotation.y = -0.18;
  const body = new THREE.Mesh(new RoundedBoxGeometry(PHONE.w, PHONE.h, PHONE.d, 4, 0.1), lacquer(HUE.ink));
  const screenMat = glowMaterial(HUE.paper.clone().lerp(HUE.violet, 0.1));
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN.w, SCREEN.h), screenMat);
  screen.position.z = PHONE.d / 2 + 0.002;
  const chipMat = glowMaterial(HUE.saffron);
  const chip = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.22, 0.02, 2, 0.03), chipMat);
  chip.position.set(0, -0.48, PHONE.d / 2 + 0.012);
  const chipHalo = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 8, 48), frosted(HUE.saffron, 0.8));
  chipHalo.position.copy(chip.position);
  phone.add(body, screen, chip, chipHalo);
  world.add(phone);

  // Screen pixels, in phone space; the cloud lands on these.
  const pixels = Array.from({ length: PIX_X * PIX_Y }, (_, i) => {
    const x = ((i % PIX_X) / (PIX_X - 1) - 0.5) * SCREEN.w * 0.86;
    const y = (Math.floor(i / PIX_X) / (PIX_Y - 1) - 0.5) * SCREEN.h * 0.9;
    return new THREE.Vector3(x, y, PHONE.d / 2 + 0.01);
  });

  // The model cloud, in world space; each particle pours toward one pixel.
  const rnd = seeded(31);
  const cloud = createPointCloud(CLOUD);
  const grains = Array.from({ length: CLOUD }, (_, i) => ({
    angle: rnd() * TAU,
    radius: 0.25 + Math.sqrt(rnd()) * 0.7,
    lift: (rnd() - 0.5) * 0.5,
    delay: rnd() * 0.35,
    pixel: i % pixels.length,
    colour: BRAND[i % 3],
  }));
  world.add(cloud.points);

  // Edge devices
  const laptop = new THREE.Group();
  const lapShell = lacquer(HUE.paper);
  const lapBase = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.03, 0.5, 2, 0.012), lapShell);
  const lid = new THREE.Group();
  lid.position.set(0, 0.015, -0.24);
  lid.rotation.x = -0.26;
  const lidShell = new THREE.Mesh(new RoundedBoxGeometry(0.76, 0.48, 0.02, 2, 0.012), lapShell);
  lidShell.position.y = 0.24;
  const lapScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.4), glowMaterial(HUE.paper.clone().lerp(HUE.orange, 0.12)));
  lapScreen.position.set(0, 0.24, 0.011);
  const bars = Array.from({ length: BARS }, (_, k) => {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 1), glowMaterial(BRAND[k % 3]));
    bar.geometry.translate(0, 0.5, 0);
    bar.position.set((k - (BARS - 1) / 2) * 0.1, 0.07, 0.013);
    lid.add(bar);
    return bar;
  });
  lid.add(lidShell, lapScreen);
  laptop.add(lapBase, lid);
  laptop.position.set(-1.45, -0.98, 0.12);
  laptop.rotation.y = 0.5;

  const watch = new THREE.Group();
  const band = lacquer(HUE.violet.clone().lerp(HUE.paper, 0.4));
  const bandTop = new THREE.Mesh(new RoundedBoxGeometry(0.2, 0.26, 0.04, 2, 0.015), band);
  bandTop.position.y = 0.26;
  const bandBottom = bandTop.clone();
  bandBottom.position.y = -0.26;
  const face = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 40), lacquer(HUE.paper));
  face.rotation.x = Math.PI / 2;
  const dial = new THREE.Mesh(new THREE.CircleGeometry(0.14, 40), glowMaterial(HUE.paper.clone().lerp(HUE.saffron, 0.15)));
  dial.position.z = 0.032;
  const dialRing = createGrowingTube(
    new THREE.CatmullRomCurve3(
      Array.from({ length: 40 }, (_, i) => new THREE.Vector3(Math.sin((i / 40) * TAU) * 0.105, Math.cos((i / 40) * TAU) * 0.105, 0.036)),
      true
    ),
    0.012,
    lacquer(HUE.saffron),
    60
  );
  watch.add(bandTop, bandBottom, face, dial, dialRing.mesh);
  watch.position.set(1.42, -0.3, 0.1);
  watch.rotation.y = -0.45;

  const buds = new THREE.Group();
  const budCase = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.22, 0.22, 3, 0.09), lacquer(HUE.paper));
  budCase.position.y = 0.11;
  const budPulses: THREE.Mesh[] = [];
  [-0.09, 0.09].forEach((x, k) => {
    const bud = new THREE.Mesh(new THREE.SphereGeometry(0.07, 20, 14), lacquer(k ? HUE.orange : HUE.violet));
    bud.position.set(x, 0.29, 0);
    const pulse = new THREE.Mesh(new THREE.TorusGeometry(1, 0.008, 8, 40), frosted(k ? HUE.orange : HUE.violet, 0.8));
    pulse.position.copy(bud.position);
    budPulses.push(pulse);
    buds.add(bud, pulse);
  });
  buds.add(budCase);
  buds.position.set(0.95, -1.0, 0.72);
  buds.rotation.y = -0.3;

  const devices = [laptop, watch, buds];
  /** Where each device receives its stream, in device-local space. */
  const slotsLocal = [new THREE.Vector3(0, 0.3, -0.14), new THREE.Vector3(0, 0, 0.04), new THREE.Vector3(0, 0.3, 0)];
  const slots = devices.map(() => new THREE.Vector3());
  world.add(...devices);

  const sparks = createPointCloud(devices.length * (STREAM + LINK_BEADS + 2));
  world.add(sparks.points);

  const p = new THREE.Vector3();
  const ctrl = new THREE.Vector3();
  const bez = new THREE.QuadraticBezierCurve3(new THREE.Vector3(), ctrl, new THREE.Vector3());
  const screenCentre = new THREE.Vector3();
  const target = new THREE.Vector3();
  const tone = new THREE.Color();

  return {
    scene,
    camera,
    frame,
    update(f) {
      const { t } = f;
      rig(f, 0.35);
      world.rotation.y = Math.sin(t * 0.2) * 0.18;
      world.updateMatrixWorld(true);

      const shrink = timeline(f, 0, 0.95);
      const deploy = timeline(f, 1, 0.85);
      const local = timeline(f, 2, 0.4);
      const connect = timeline(f, 3, 0.6);

      phone.scale.setScalar(Math.max(0.0001, easeOutBack(span(shrink, 0, 0.2))));
      phone.updateMatrixWorld(true);
      screenCentre.set(0, 0, PHONE.d / 2);
      phone.localToWorld(screenCentre);
      world.worldToLocal(screenCentre);

      // The cloud swirls above the phone, then pours down through a funnel onto the screen.
      const spin = t * 0.9;
      grains.forEach((g, i) => {
        const pour = easeInOut(span(shrink, 0.3 + g.delay, 0.62 + g.delay));
        const a = g.angle + spin * (1 + (1 - g.radius) * 0.8);
        const swirlR = g.radius * (1 - pour * 0.85);
        p.set(Math.cos(a) * swirlR, g.lift * (1 - pour), Math.sin(a) * swirlR * 0.55).add(CLOUD_CENTRE);
        target.copy(pixels[g.pixel]);
        phone.localToWorld(target);
        world.worldToLocal(target);
        p.lerp(target, pour * pour);
        cloud.pos.set([p.x, p.y, p.z], i * 3);
        const landed = pour >= 1;
        setColor(cloud.col, i, tone.copy(g.colour).lerp(HUE.violet, pour * 0.6));
        cloud.size[i] = lerp(0.034, 0.026, pour);
        // Once on the screen only one grain per pixel stays, shimmering while the device works.
        const shimmer = 0.75 + 0.25 * Math.sin(t * 5 + g.pixel * 0.7) * local;
        cloud.alpha[i] = span(shrink, 0.08, 0.25) * (landed ? (i < pixels.length ? shimmer : 0) : 0.85);
      });
      cloud.commit();

      const chipOn = span(shrink, 0.85, 1);
      chipMat.emissiveIntensity = 0.1 + chipOn * (0.25 + 0.15 * Math.sin(t * 3));
      chip.scale.setScalar(Math.max(0.0001, easeOutBack(chipOn)));
      const haloU = (t * 0.7) % 1;
      chipHalo.scale.setScalar(1 + haloU * 0.8);
      setGroupOpacity(chipHalo, chipOn * (1 - haloU) * (0.4 + 0.6 * connect));

      devices.forEach((device, i) => {
        const show = easeOutBack(span(deploy, i * 0.12, i * 0.12 + 0.35));
        device.scale.setScalar(Math.max(0.0001, show));
        device.visible = show > 0;
        slots[i].copy(slotsLocal[i]);
        device.localToWorld(slots[i]);
        world.worldToLocal(slots[i]);
      });

      bars.forEach((bar, k) => {
        bar.scale.y = Math.max(0.0001, 0.04 + local * (0.12 + 0.12 * Math.abs(Math.sin(t * 4 + k * 0.9))));
      });
      dialRing.grow(local > 0 ? (t * 0.4) % 1 : 0);
      budPulses.forEach((pulse, k) => {
        const u = (t * 0.9 + k * 0.5) % 1;
        pulse.scale.setScalar(0.08 + u * 0.08);
        setGroupOpacity(pulse, local * (1 - u));
      });

      let n = 0;
      devices.forEach((_, i) => {
        // Stream: the model flowing from the phone into the device.
        bez.v0.copy(screenCentre);
        bez.v2.copy(slots[i]);
        ctrl.copy(screenCentre).lerp(slots[i], 0.5).setY(Math.max(screenCentre.y, slots[i].y) + 0.55);
        const flow = span(deploy, 0.2 + i * 0.12, 0.65 + i * 0.12);
        for (let k = 0; k < STREAM; k++) {
          const u = (k / STREAM + t * 0.6) % 1;
          bez.getPoint(u, p);
          sparks.pos.set([p.x, p.y, p.z], n * 3);
          setColor(sparks.col, n, BRAND[i]);
          sparks.size[n] = 0.035;
          sparks.alpha[n] = (flow > 0 && flow < 1 ? 1 : 0) * span(u, 0, 0.1) * (1 - span(u, 0.9, 1)) * 0.9;
          n++;
        }
        // Link: a dotted arc that stays, with a packet each way.
        for (let k = 0; k < LINK_BEADS; k++) {
          bez.getPoint(k / (LINK_BEADS - 1), p);
          sparks.pos.set([p.x, p.y, p.z], n * 3);
          setColor(sparks.col, n, HUE.mist);
          sparks.size[n] = 0.022;
          sparks.alpha[n] = span(connect, (k / LINK_BEADS) * 0.5 + i * 0.08, (k / LINK_BEADS) * 0.5 + i * 0.08 + 0.06) * 0.85;
          n++;
        }
        [0, 1].forEach((back) => {
          const u = (t * 0.45 + i / 3 + back * 0.5) % 1;
          bez.getPoint(back ? 1 - u : u, p);
          sparks.pos.set([p.x, p.y, p.z], n * 3);
          setColor(sparks.col, n, back ? HUE.violet : BRAND[i]);
          sparks.size[n] = 0.07;
          sparks.alpha[n] = span(connect, 0.7, 1);
          n++;
        });
      });
      sparks.commit();
    },
    dispose: () => disposeScene(scene),
  };
}
