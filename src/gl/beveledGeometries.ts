import * as THREE from 'three';

/**
 * Creates a rounded rectangle shape for extrusions.
 */
export function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  const radius = Math.min(r, w / 2, h / 2);

  shape.moveTo(x + radius, y);
  shape.lineTo(x + w - radius, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + radius);
  shape.lineTo(x + w, y + h - radius);
  shape.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  shape.lineTo(x + radius, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

/**
 * Creates a high-end beveled box geometry with smooth rounded edges that catch specular light.
 */
export function createBeveledBoxGeometry(
  w: number,
  h: number,
  d: number,
  r = 0.04,
  bevel = 0.015,
  bevelSegments = 4
): THREE.BufferGeometry {
  const shape = createRoundedRectShape(w - bevel * 2, h - bevel * 2, Math.max(0.005, r - bevel));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, d - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments: 16,
  });
  geometry.center();
  return geometry;
}

/**
 * Creates a curved quadrant shell petal geometry for capsule unfolding.
 */
export function createCurvedPetalGeometry(
  radius: number,
  height: number,
  arcAngle: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const innerR = radius - thickness;

  // Arc path from -arcAngle/2 to +arcAngle/2
  const startAngle = -arcAngle / 2;
  const endAngle = arcAngle / 2;

  shape.absarc(0, 0, radius, startAngle, endAngle, false);
  shape.absarc(0, 0, innerR, endAngle, startAngle, true);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
  });
  geometry.center();
  return geometry;
}
