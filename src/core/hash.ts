/**
 * Computes a deterministic 2D hash from a seed and coordinates.
 * @param seed The seed value.
 * @param x The x coordinate.
 * @param y The y coordinate.
 * @returns The hashed value.
 */
export function hash2D(seed: number, x: number, y: number): number {
  let h: number = seed | 0;
  h ^= (x * 374761393) | 0;
  h ^= (y * 668265263) | 0;
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177) | 0;
  h ^= h >>> 16;
  return h | 0;
}
