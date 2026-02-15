import { Rng } from "../core/rng";
import { hash2D } from "../core/hash";
import type { OverworldTile } from "../core/types";

export const CHUNK_SIZE: number = 64;

export type OverworldChunk = {
  chunkX: number;
  chunkY: number;
  tiles: OverworldTile[]; // CHUNK_SIZE * CHUNK_SIZE
};

export class Overworld {
  private readonly worldSeed: number;
  private readonly chunks: Map<string, OverworldChunk>;

  public constructor(worldSeed: number) {
    this.worldSeed = worldSeed;
    this.chunks = new Map<string, OverworldChunk>();
  }

  public getTile(worldX: number, worldY: number): OverworldTile {
    const chunkX: number = Math.floor(worldX / CHUNK_SIZE);
    const chunkY: number = Math.floor(worldY / CHUNK_SIZE);
    const localX: number = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localY: number = ((worldY % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    const chunk: OverworldChunk = this.getOrCreateChunk(chunkX, chunkY);
    return chunk.tiles[localY * CHUNK_SIZE + localX];
  }

  public isWalkable(tile: OverworldTile): boolean {
    return tile !== "water" && tile !== "mountain";
  }

  private getOrCreateChunk(chunkX: number, chunkY: number): OverworldChunk {
    const key: string = `${chunkX},${chunkY}`;
    const existing: OverworldChunk | undefined = this.chunks.get(key);
    if (existing) return existing;

    const created: OverworldChunk = generateOverworldChunk(this.worldSeed, chunkX, chunkY);
    this.chunks.set(key, created);
    return created;
  }
}

function index2D(x: number, y: number, width: number): number {
  return y * width + x;
}

export function generateOverworldChunk(worldSeed: number, chunkX: number, chunkY: number): OverworldChunk {
  const chunkSeed: number = hash2D(worldSeed, chunkX, chunkY);
  const rng: Rng = new Rng(chunkSeed);

  const tiles: OverworldTile[] = new Array<OverworldTile>(CHUNK_SIZE * CHUNK_SIZE);

  for (let y: number = 0; y < CHUNK_SIZE; y++) {
    for (let x: number = 0; x < CHUNK_SIZE; x++) {
      const tileSeed: number = hash2D(chunkSeed, x, y);
      const tileRng: Rng = new Rng(tileSeed);

      const height: number = tileRng.nextFloat();
      const moisture: number = tileRng.nextFloat();

      let tile: OverworldTile = "grass";

      if (height < 0.22) tile = "water";
      else if (height > 0.86) tile = "mountain";
      else if (moisture > 0.78) tile = "forest";
      else tile = "grass";

      tiles[index2D(x, y, CHUNK_SIZE)] = tile;
    }
  }

  const entranceCount: number = rng.nextInt(0, 3);
  for (let i: number = 0; i < entranceCount; i++) {
    const ex: number = rng.nextInt(0, CHUNK_SIZE);
    const ey: number = rng.nextInt(0, CHUNK_SIZE);
    const idx: number = index2D(ex, ey, CHUNK_SIZE);
    const base: OverworldTile = tiles[idx];

    if (base === "water" || base === "mountain") continue;

    tiles[idx] = "dungeon";
  }

  return { chunkX, chunkY, tiles };
}

export function dungeonIdFromWorldPos(worldSeed: number, worldX: number, worldY: number): string {
  return `dng_${worldSeed}_${worldX}_${worldY}`;
}

export function dungeonSeedFromWorldPos(worldSeed: number, worldX: number, worldY: number): number {
  return hash2D(worldSeed, worldX, worldY);
}
