// Low-resolution geography for the network globe. Precision is deliberately
// coarse: at dot-matrix scale only the silhouette needs to read.

export type LonLat = [number, number];

/** India outline (official boundary, simplified), clockwise from Kutch. */
export const INDIA: LonLat[] = [
  [68.2, 23.7], [68.8, 22.3], [70.0, 20.9], [72.6, 21.2], [72.8, 19.0], [73.4, 16.5],
  [74.1, 14.8], [74.8, 12.9], [75.8, 11.2], [76.3, 9.5], [77.5, 8.1], [78.2, 8.9],
  [79.3, 10.3], [79.9, 12.0], [80.3, 13.1], [80.1, 15.5], [81.3, 16.4], [82.3, 17.0],
  [83.3, 17.7], [84.8, 19.2], [86.5, 20.2], [87.0, 21.5], [88.9, 21.6], [88.7, 23.0],
  [88.1, 24.6], [88.4, 26.2], [89.8, 26.1], [92.2, 25.0], [92.3, 23.4], [92.7, 22.0],
  [93.4, 22.8], [94.2, 23.9], [95.2, 26.0], [96.9, 27.3], [97.3, 28.2], [95.4, 29.3],
  [93.8, 28.2], [92.0, 27.5], [89.9, 26.9], [88.8, 28.1], [88.0, 27.4], [86.0, 26.9],
  [84.0, 27.4], [82.0, 27.9], [80.1, 28.8], [80.9, 30.2], [79.0, 31.1], [78.5, 32.5],
  [79.5, 34.5], [77.8, 35.6], [75.8, 36.8], [74.4, 37.0], [72.6, 36.2], [73.4, 34.3],
  [74.0, 32.6], [74.6, 32.3], [74.6, 31.1], [73.9, 30.2], [72.2, 28.3], [70.6, 27.8],
  [69.5, 27.0], [70.2, 25.8], [69.9, 24.3], [68.8, 24.2],
];

export const INDIA_HUBS: { name: string; at: LonLat }[] = [
  { name: 'New Delhi', at: [77.21, 28.61] },
  { name: 'Mumbai', at: [72.88, 19.08] },
  { name: 'Bengaluru', at: [77.59, 12.97] },
  { name: 'Hyderabad', at: [78.49, 17.39] },
  { name: 'Chennai', at: [80.27, 13.08] },
  { name: 'Kolkata', at: [88.36, 22.57] },
  { name: 'Pune', at: [73.86, 18.52] },
  { name: 'Ahmedabad', at: [72.57, 23.02] },
  { name: 'Guwahati', at: [91.74, 26.14] },
  { name: 'Jaipur', at: [75.79, 26.91] },
];

export const WORLD: { name: string; at: LonLat }[] = [
  { name: 'London', at: [-0.13, 51.51] },
  { name: 'Berlin', at: [13.4, 52.52] },
  { name: 'New York', at: [-74.0, 40.71] },
  { name: 'San Francisco', at: [-122.42, 37.77] },
  { name: 'São Paulo', at: [-46.63, -23.55] },
  { name: 'Nairobi', at: [36.82, -1.29] },
  { name: 'Dubai', at: [55.27, 25.2] },
  { name: 'Singapore', at: [103.82, 1.35] },
  { name: 'Tokyo', at: [139.69, 35.69] },
  { name: 'Seoul', at: [126.98, 37.57] },
  { name: 'Sydney', at: [151.21, -33.87] },
  { name: 'Jakarta', at: [106.85, -6.21] },
];

export const INDIA_BBOX = { minLon: 68, maxLon: 97.5, minLat: 7.8, maxLat: 37.2 };

export function inPolygon([x, y]: LonLat, poly: LonLat[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Globe orientation: India's centre faces the camera. */
export const GLOBE_CENTER: LonLat = [80, 21];

const D2R = Math.PI / 180;

/** Lon/lat to a point on a sphere of radius r, rotated so GLOBE_CENTER faces +z. */
export function lonLatToVec(lon: number, lat: number, r: number): [number, number, number] {
  const la = lat * D2R;
  const lo = (lon - GLOBE_CENTER[0]) * D2R;
  const x = Math.cos(la) * Math.sin(lo);
  const y = Math.sin(la);
  const z = Math.cos(la) * Math.cos(lo);
  // tilt around X so the centre latitude sits on the equator of the view
  const t = GLOBE_CENTER[1] * D2R;
  const y2 = y * Math.cos(t) - z * Math.sin(t);
  const z2 = y * Math.sin(t) + z * Math.cos(t);
  return [x * r, y2 * r, z2 * r];
}
