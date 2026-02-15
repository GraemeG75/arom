export type Point = { x: number; y: number };

export type Mode = "overworld" | "dungeon";

export type MapRef =
  | { kind: "overworld" }
  | { kind: "dungeon"; dungeonId: string };

export type EntityKind = "player" | "monster";

export type Entity = {
  id: string;
  kind: EntityKind;
  name: string;
  pos: Point;
  mapRef: MapRef;
  hp: number;
  maxHp: number;
};

export type Action =
  | { kind: "move"; dx: number; dy: number }
  | { kind: "use" }
  | { kind: "wait" }
  | { kind: "toggleRenderer" }
  | { kind: "toggleFov" }
  | { kind: "help" };

export type OverworldTile = "water" | "grass" | "forest" | "mountain" | "dungeon";
export type DungeonTile = "wall" | "floor" | "stairsUp" | "stairsDown";

export type TileVisibility = "unseen" | "seen" | "visible";

export type Message = { text: string; t: number };
