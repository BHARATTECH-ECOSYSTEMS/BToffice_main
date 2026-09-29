// Shared GLSL. The CPU mirrors `stagger` and `transit` exactly (see Engine.snapshot)
// so a morph can be interrupted mid-flight without particles popping.

export const particleVertex = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aAccFrom;
  attribute float aAccTo;
  attribute float aGrpFrom;
  attribute float aGrpTo;
  attribute vec4 aRand; // size, phase, threshold, speed

  uniform float uMix;
  uniform float uTime;
  uniform float uDrift;
  uniform vec3 uMouse;
  uniform float uMouseAmt;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform float uDecay;
  uniform float uHighlight;
  uniform float uHighlightAmt;
  uniform float uWave;
  uniform float uExplode;
  uniform float uWarp;

  varying float vAcc;
  varying float vAlpha;
  varying float vShade;
  varying float vHl;
  varying float vTint;

  float stagger(float m, float th) {
    float s = clamp(m * 1.45 - th * 0.45, 0.0, 1.0);
    return s * s * (3.0 - 2.0 * s);
  }

  void main() {
    float st = stagger(uMix, aRand.z);
    float transit = sin(3.14159265 * st);
    vec3 p = mix(aFrom, aTo, st);
    p += transit * vec3(
      sin(aRand.y * 6.2831 + aTo.y * 2.0),
      cos(aRand.y * 5.1 + aFrom.x * 2.0),
      sin(aRand.y * 3.7)
    ) * 0.1;

    float t = uTime * aRand.w;
    p += vec3(
      sin(t * 0.7 + aRand.y * 6.2831),
      cos(t * 0.6 + aRand.y * 4.7),
      sin(t * 0.5 + aRand.y * 3.1)
    ) * 0.008 * uDrift;

    // terrain breathes
    float waveW = (aGrpTo < -1.5 ? st : 0.0) + (aGrpFrom < -1.5 ? 1.0 - st : 0.0);
    p.y += sin(p.x * 1.1 + uTime * 0.45) * cos(p.z * 0.9 + uTime * 0.32) * 0.22 * waveW * uWave;

    // exploded view: layers above the highlighted one lift, layers below drop
    float g = st < 0.5 ? aGrpFrom : aGrpTo;
    if (uExplode > 0.001 && uHighlight > -0.5 && g > -0.5) p.y += clamp(uHighlight - g, -1.0, 1.0) * uExplode * 0.24;

    vec4 world = modelMatrix * vec4(p, 1.0);

    // the cursor gently displaces what it passes over
    vec2 d = world.xy - uMouse.xy;
    float dist = length(d);
    float push = smoothstep(0.6, 0.0, dist) * uMouseAmt;
    world.xy += (d / max(dist, 1e-4)) * push * 0.1;
    world.z += push * 0.12;

    // scrolling fast stretches the field; it settles when you stop
    world.y += (aRand.y - 0.5) * uWarp * 0.9;
    world.z += (aRand.z - 0.5) * uWarp * 0.6;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;

    float grp = st < 0.5 ? aGrpFrom : aGrpTo;
    float hl = (uHighlight > -0.5 && abs(grp - uHighlight) < 0.5) ? uHighlightAmt : 0.0;
    vHl = hl;

    gl_PointSize = uSize * aRand.x * uPixelRatio * (1.0 + hl * 0.3) * (7.0 / -mv.z) * 2.2;
    vTint = step(0.82, fract(aRand.y * 7.31)) * (0.5 + 0.5 * sin(p.x * 1.3 + p.y * 0.9 + uTime * 0.4));

    // Parked particles (acc -1) only fade; they borrow the colour of the other side.
    bool hideFrom = aAccFrom < -0.5;
    bool hideTo = aAccTo < -0.5;
    float accF = hideFrom ? aAccTo : aAccFrom;
    float accT = hideTo ? accF : aAccTo;
    vAcc = max(mix(accF, accT, st), 0.0);
    vShade = clamp(dot(normalize(p + vec3(0.0001)), normalize(vec3(0.35, 0.55, 0.75))) * 0.5 + 0.5, 0.0, 1.0);

    float depth = smoothstep(-10.5, -5.2, mv.z);
    float forgotten = step(aRand.z, uDecay);
    float dim = (uHighlight > -0.5) ? mix(1.0, 0.45, uHighlightAmt) : 1.0;
    float shown = mix(hideFrom ? 0.0 : 1.0, hideTo ? 0.0 : 1.0, st);
    vAlpha = mix(0.3, 1.0, depth) * (1.0 - forgotten * 0.94) * mix(dim, 1.0, hl) * shown;
  }
`;

export const particleFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uInk;
  uniform vec3 uDeep;
  uniform vec3 uBright;
  uniform vec3 uHot;
  uniform float uAlpha;
  uniform float uInkAlpha;
  uniform vec3 uCyan;
  uniform vec3 uYellow;
  uniform float uHalo;

  varying float vAcc;
  varying float vAlpha;
  varying float vShade;
  varying float vHl;
  varying float vTint;

  void main() {
    // a crisp core inside a soft halo: points read as light, not dots
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.42, 0.18, d);
    float halo = exp(-d * d * 5.0) * uHalo;
    vec3 accent = mix(uDeep, uBright, pow(vShade, 1.4));
    vec3 warm = mix(uCyan, uYellow, step(0.5, fract(vAcc * 9.3 + vShade * 5.1)));
    accent = mix(accent, warm, vTint * 0.75);
    vec3 col = mix(uInk, accent, smoothstep(0.0, 1.0, vAcc));
    col = mix(col, uHot, vHl * 0.6);
    float a = (core + halo) * vAlpha * uAlpha * mix(uInkAlpha, 1.0, vAcc) * 0.85;
    gl_FragColor = vec4(col, a);
  }
`;

export const trailVertex = /* glsl */ `
  attribute float aT;      // 0…1 along its curve
  attribute float aSeed;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uSpeed;
  varying float vGlow;

  void main() {
    float head = fract(uTime * uSpeed + aSeed);
    float behind = head - aT;
    behind = behind < 0.0 ? behind + 1.0 : behind;
    vGlow = exp(-behind * 9.0) + 0.1;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uPixelRatio * (0.55 + vGlow) * (7.0 / -mv.z);
  }
`;

export const trailFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uVisible;
  varying float vGlow;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * vGlow * uVisible;
    gl_FragColor = vec4(uColor, a);
  }
`;
