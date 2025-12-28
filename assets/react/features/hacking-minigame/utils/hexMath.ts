/**
 * Hexagonal grid utilities using cube coordinates.
 * Reference: https://www.redblobgames.com/grids/hexagons/
 */

export interface HexCoord {
  q: number;
  r: number;
  s: number;
}

export interface PixelCoord {
  x: number;
  y: number;
}

// Cube coordinate directions for pointy-top hexagons
const DIRECTIONS: HexCoord[] = [
  { q: 1, r: -1, s: 0 },
  { q: 1, r: 0, s: -1 },
  { q: 0, r: 1, s: -1 },
  { q: -1, r: 1, s: 0 },
  { q: -1, r: 0, s: 1 },
  { q: 0, r: -1, s: 1 },
];

export function cubeToId(hex: HexCoord): string {
  return `${hex.q},${hex.r},${hex.s}`;
}

export function idToHex(id: string): HexCoord {
  const [q, r, s] = id.split(',').map(Number);
  return { q, r, s };
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r && a.s === b.s;
}

export function getNeighbors(hex: HexCoord): HexCoord[] {
  return DIRECTIONS.map(d => ({
    q: hex.q + d.q,
    r: hex.r + d.r,
    s: hex.s + d.s,
  }));
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

export function generateHexGrid(radius: number): HexCoord[] {
  const hexes: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const s = -q - r;
      hexes.push({ q, r, s });
    }
  }
  return hexes;
}

/**
 * Convert cube coordinates to pixel coordinates (pointy-top hexagons)
 */
export function hexToPixel(hex: HexCoord, size: number): PixelCoord {
  const x = size * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
  const y = size * ((3 / 2) * hex.r);
  return { x, y };
}

/**
 * Convert pixel coordinates to cube coordinates (pointy-top hexagons)
 */
export function pixelToHex(pixel: PixelCoord, size: number): HexCoord {
  const q = ((Math.sqrt(3) / 3) * pixel.x - (1 / 3) * pixel.y) / size;
  const r = ((2 / 3) * pixel.y) / size;
  return hexRound({ q, r, s: -q - r });
}

/**
 * Round fractional hex coordinates to nearest integer hex
 */
export function hexRound(hex: HexCoord): HexCoord {
  let q = Math.round(hex.q);
  let r = Math.round(hex.r);
  let s = Math.round(hex.s);

  const qDiff = Math.abs(q - hex.q);
  const rDiff = Math.abs(r - hex.r);
  const sDiff = Math.abs(s - hex.s);

  if (qDiff > rDiff && qDiff > sDiff) {
    q = -r - s;
  } else if (rDiff > sDiff) {
    r = -q - s;
  } else {
    s = -q - r;
  }

  return { q, r, s };
}

/**
 * Get hexagon corner points for rendering
 */
export function getHexCorners(center: PixelCoord, size: number): PixelCoord[] {
  const corners: PixelCoord[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6; // Pointy-top
    corners.push({
      x: center.x + size * Math.cos(angle),
      y: center.y + size * Math.sin(angle),
    });
  }
  return corners;
}
