/**
 * Simple xorshift-based RNG for repeatable gameplay.
 */
export class Rng {
  private state: number;

  /**
   * Creates a new RNG seeded with a 32-bit integer.
   * @param seed The seed value.
   */
  public constructor(seed: number) {
    this.state = seed | 0;
    if (this.state === 0) {
      this.state = 0x1234567;
    }
  }

  /**
   * Generates the next 32-bit unsigned integer.
   * @returns The next random value.
   */
  public nextU32(): number {
    // xorshift32
    let x: number = this.state | 0;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x | 0;
    return x >>> 0;
  }

  /**
   * Generates a float in [0, 1].
   * @returns The random float.
   */
  public nextFloat(): number {
    return this.nextU32() / 0xffffffff;
  }

  /**
   * Generates an integer in [minInclusive, maxExclusive).
   * @param minInclusive The inclusive minimum.
   * @param maxExclusive The exclusive maximum.
   * @returns The random integer.
   */
  public nextInt(minInclusive: number, maxExclusive: number): number {
    const span: number = maxExclusive - minInclusive;
    if (span <= 0) {
      return minInclusive;
    }
    return minInclusive + (this.nextU32() % span);
  }

  /**
   * Picks a random element from a non-empty list.
   * @param items The list to pick from.
   * @returns The selected element.
   */
  public pickOne<T>(items: T[]): T {
    return items[this.nextInt(0, items.length)];
  }
}
