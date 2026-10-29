// Simplified state outlines (lng, lat) and an equirectangular projection
// covering Texas + Oklahoma. Used by the SVG TerritoryMap.

const LNG_MIN = -107.6;
const LNG_MAX = -92.6;
const LAT_MIN = 25.3;
const LAT_MAX = 37.2;

export function project(lng: number, lat: number, w = 680, h = 560) {
  const x = ((lng - LNG_MIN) / (LNG_MAX - LNG_MIN)) * w;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * h;
  return { x, y };
}

export const TX_OUTLINE: [number, number][] = [
  [-106.48, 31.79], [-105.0, 31.55], [-104.55, 30.85], [-104.4, 29.35], [-103.95, 29.0],
  [-103.35, 28.88], [-102.9, 29.55], [-102.2, 29.85], [-101.85, 29.75], [-101.4, 29.85],
  [-101.0, 29.4], [-100.5, 28.75], [-100.35, 28.2], [-99.85, 27.95], [-99.45, 27.55],
  [-99.1, 26.95], [-98.4, 26.05], [-97.45, 25.95], [-97.15, 26.9], [-97.05, 27.8],
  [-96.65, 28.4], [-95.95, 28.7], [-95.3, 28.95], [-94.85, 29.3], [-94.68, 29.55],
  [-93.85, 29.68], [-93.85, 29.95], [-94.1, 30.1], [-93.75, 30.45], [-93.6, 31.3],
  [-93.85, 31.9], [-94.0, 32.55], [-94.05, 33.55], [-95.0, 33.75], [-95.9, 33.85],
  [-96.6, 33.9], [-97.15, 34.05], [-97.9, 34.2], [-98.35, 34.05], [-98.8, 34.1],
  [-99.15, 34.35], [-99.55, 34.32], [-99.9, 34.55], [-100.0, 34.57], [-100.0, 36.5],
  [-103.0, 36.5], [-103.0, 32.0], [-104.4, 32.0], [-105.5, 31.98], [-106.4, 31.97],
];

export const OK_OUTLINE: [number, number][] = [
  [-100.0, 36.5], [-103.0, 36.5], [-103.0, 37.0], [-94.6, 37.0], [-94.55, 36.85],
  [-94.43, 36.5], [-94.43, 35.8], [-94.43, 35.45], [-94.72, 35.28], [-94.43, 35.05],
  [-94.43, 34.5], [-94.43, 34.1], [-94.05, 33.55], [-95.0, 33.75], [-95.9, 33.85],
  [-96.6, 33.9], [-97.15, 34.05], [-97.9, 34.2], [-98.35, 34.05], [-98.8, 34.1],
  [-99.15, 34.35], [-99.55, 34.32], [-99.9, 34.55], [-100.0, 34.57],
];

export interface Market {
  city: string;
  state: "TX" | "OK";
  lng: number;
  lat: number;
}

// Commercially relevant markets across TX & OK (extensible, not exhaustive).
export const MARKETS: Market[] = [
  { city: "Houston", state: "TX", lng: -95.37, lat: 29.76 },
  { city: "Katy", state: "TX", lng: -95.82, lat: 29.79 },
  { city: "Sugar Land", state: "TX", lng: -95.63, lat: 29.62 },
  { city: "The Woodlands", state: "TX", lng: -95.46, lat: 30.17 },
  { city: "Dallas", state: "TX", lng: -96.8, lat: 32.78 },
  { city: "Fort Worth", state: "TX", lng: -97.33, lat: 32.75 },
  { city: "Plano", state: "TX", lng: -96.7, lat: 33.02 },
  { city: "Frisco", state: "TX", lng: -96.82, lat: 33.15 },
  { city: "McKinney", state: "TX", lng: -96.64, lat: 33.2 },
  { city: "Arlington", state: "TX", lng: -97.11, lat: 32.74 },
  { city: "Austin", state: "TX", lng: -97.74, lat: 30.27 },
  { city: "Round Rock", state: "TX", lng: -97.68, lat: 30.51 },
  { city: "Georgetown", state: "TX", lng: -97.68, lat: 30.63 },
  { city: "Cedar Park", state: "TX", lng: -97.82, lat: 30.5 },
  { city: "San Antonio", state: "TX", lng: -98.49, lat: 29.42 },
  { city: "New Braunfels", state: "TX", lng: -98.12, lat: 29.7 },
  { city: "Waco", state: "TX", lng: -97.15, lat: 31.55 },
  { city: "Temple", state: "TX", lng: -97.34, lat: 31.1 },
  { city: "Killeen", state: "TX", lng: -97.73, lat: 31.12 },
  { city: "College Station", state: "TX", lng: -96.33, lat: 30.63 },
  { city: "Tyler", state: "TX", lng: -95.3, lat: 32.35 },
  { city: "Longview", state: "TX", lng: -94.74, lat: 32.5 },
  { city: "Corpus Christi", state: "TX", lng: -97.4, lat: 27.8 },
  { city: "El Paso", state: "TX", lng: -106.49, lat: 31.76 },
  { city: "Midland", state: "TX", lng: -102.08, lat: 31.99 },
  { city: "Odessa", state: "TX", lng: -102.37, lat: 31.85 },
  { city: "Lubbock", state: "TX", lng: -101.86, lat: 33.58 },
  { city: "Amarillo", state: "TX", lng: -101.83, lat: 35.22 },
  { city: "Abilene", state: "TX", lng: -99.73, lat: 32.45 },
  { city: "Wichita Falls", state: "TX", lng: -98.49, lat: 33.91 },
  { city: "Oklahoma City", state: "OK", lng: -97.52, lat: 35.47 },
  { city: "Tulsa", state: "OK", lng: -95.99, lat: 36.15 },
  { city: "Norman", state: "OK", lng: -97.44, lat: 35.22 },
  { city: "Edmond", state: "OK", lng: -97.48, lat: 35.65 },
  { city: "Broken Arrow", state: "OK", lng: -95.79, lat: 36.05 },
  { city: "Lawton", state: "OK", lng: -98.39, lat: 34.6 },
  { city: "Stillwater", state: "OK", lng: -97.06, lat: 36.12 },
  { city: "Enid", state: "OK", lng: -97.88, lat: 36.4 },
  { city: "Muskogee", state: "OK", lng: -95.37, lat: 35.75 },
  { city: "Bartlesville", state: "OK", lng: -95.98, lat: 36.75 },
  { city: "Shawnee", state: "OK", lng: -96.93, lat: 35.33 },
];

// ─── Distance & routing helpers ─────────────────────────────────────────────
export function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Nearest-neighbor greedy route order from a start point. */
export function optimizeOrder(startLat: number, startLng: number, points: { id: string; lat: number; lng: number }[]): string[] {
  const remaining = [...points];
  const order: string[] = [];
  let curLat = startLat;
  let curLng = startLng;
  while (remaining.length) {
    let bestIdx = 0;
    let bestD = Infinity;
    remaining.forEach((p, i) => {
      const d = haversineMiles(curLat, curLng, p.lat, p.lng);
      if (d < bestD) {
        bestD = d;
        bestIdx = i;
      }
    });
    const [next] = remaining.splice(bestIdx, 1);
    order.push(next.id);
    curLat = next.lat;
    curLng = next.lng;
  }
  return order;
}

export function routeMileage(startLat: number, startLng: number, points: { lat: number; lng: number }[]) {
  let total = 0;
  let curLat = startLat;
  let curLng = startLng;
  for (const p of points) {
    total += haversineMiles(curLat, curLng, p.lat, p.lng);
    curLat = p.lat;
    curLng = p.lng;
  }
  return Math.round(total * 1.28); // ~28% road-vs-crow-fly adjustment
}

/** Common Texas/Oklahoma start points for route planning. */
export const START_POINTS = [
  { label: "Austin HQ", lat: 30.27, lng: -97.74 },
  { label: "Dallas", lat: 32.78, lng: -96.8 },
  { label: "Houston", lat: 29.76, lng: -95.37 },
  { label: "San Antonio", lat: 29.42, lng: -98.49 },
  { label: "Fort Worth", lat: 32.75, lng: -97.33 },
  { label: "Oklahoma City", lat: 35.47, lng: -97.52 },
  { label: "Tulsa", lat: 36.15, lng: -95.99 },
];
