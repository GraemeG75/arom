import type { Point } from './types';

/**
 * Clamps a number within a range.
 * @param value The value to clamp.
 * @param min The minimum value.
 * @param max The maximum value.
 * @returns The clamped value.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Adds two points together.
 * @param a The first point.
 * @param b The second point.
 * @returns The summed point.
 */
export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Computes Manhattan distance between two points.
 * @param a The first point.
 * @param b The second point.
 * @returns The Manhattan distance.
 */
export function manhattan(a: Point, b: Point): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Serializes a point as a string key.
 * @param p The point to serialize.
 * @returns The serialized point key.
 */
export function keyPoint(p: Point): string {
  return `${p.x},${p.y}`;
}

/**
 * Parses a serialized point key.
 * @param k The serialized point key.
 * @returns The parsed point, or undefined if invalid.
 */
export function parseKeyPoint(k: string): Point | undefined {
  const parts: string[] = k.split(',');
  if (parts.length !== 2) {
    return undefined;
  }
  const x: number = Number(parts[0]);
  const y: number = Number(parts[1]);
  if (Number.isNaN(x) || Number.isNaN(y)) {
    return undefined;
  }
  return { x, y };
}
