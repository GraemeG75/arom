import type { Entity, Mode } from "../core/types";
import type { Overworld } from "../maps/overworld";
import type { Dungeon } from "../maps/dungeon";
import { getDungeonTile, getVisibility } from "../maps/dungeon";

export type CanvasRenderContext = {
  mode: Mode;
  overworld: Overworld;
  dungeon: Dungeon | undefined;
  player: Entity;
  entities: Entity[];
  useFov: boolean;
};

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const c: CanvasRenderingContext2D | null = canvas.getContext("2d");
    if (!c) throw new Error("Canvas 2D context not available.");
    this.ctx = c;
    this.ctx.font = "12px monospace";
  }

  public render(ctx: CanvasRenderContext, viewWidth: number, viewHeight: number): void {
    const tileSize: number = 16;
    const halfW: number = Math.floor(viewWidth / 2);
    const halfH: number = Math.floor(viewHeight / 2);

    const originX: number = ctx.player.pos.x;
    const originY: number = ctx.player.pos.y;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y: number = -halfH; y <= halfH; y++) {
      for (let x: number = -halfW; x <= halfW; x++) {
        const wx: number = originX + x;
        const wy: number = originY + y;

        const px: number = (x + halfW) * tileSize;
        const py: number = (y + halfH) * tileSize;

        if (ctx.mode === "overworld") {
          const t = ctx.overworld.getTile(wx, wy);
          this.drawOverworldTile(t, px, py, tileSize);
        } else {
          const dungeon: Dungeon | undefined = ctx.dungeon;
          if (!dungeon) continue;
          if (wx < 0 || wy < 0 || wx >= dungeon.width || wy >= dungeon.height) continue;

          if (ctx.useFov) {
            const v = getVisibility(dungeon, wx, wy);
            if (v === "unseen") continue;
            if (v === "seen") {
              this.drawDungeonTile(getDungeonTile(dungeon, wx, wy), px, py, tileSize, 0.35);
            } else {
              this.drawDungeonTile(getDungeonTile(dungeon, wx, wy), px, py, tileSize, 1.0);
            }
          } else {
            this.drawDungeonTile(getDungeonTile(dungeon, wx, wy), px, py, tileSize, 1.0);
          }
        }

        const monster: Entity | undefined = this.findMonsterAt(ctx, wx, wy);
        if (monster) {
          this.ctx.fillStyle = "#7CFF9E";
          this.ctx.fillText("g", px + 5, py + 12);
        }

        if (x === 0 && y === 0) {
          this.ctx.fillStyle = "#FFFFFF";
          this.ctx.fillText("@", px + 5, py + 12);
        }
      }
    }
  }

  private findMonsterAt(ctx: CanvasRenderContext, x: number, y: number): Entity | undefined {
    for (const e of ctx.entities) {
      if (e.kind !== "monster") continue;
      if (ctx.mode === "overworld") {
        if (e.mapRef.kind !== "overworld") continue;
        if (e.pos.x === x && e.pos.y === y) return e;
      } else {
        if (!ctx.dungeon) continue;
        if (e.mapRef.kind !== "dungeon") continue;
        if (e.mapRef.dungeonId !== ctx.dungeon.id) continue;
        if (ctx.useFov) {
          const v = getVisibility(ctx.dungeon, x, y);
          if (v !== "visible") continue;
        }
        if (e.pos.x === x && e.pos.y === y) return e;
      }
    }
    return undefined;
  }

  private drawOverworldTile(tile: string, x: number, y: number, s: number): void {
    switch (tile) {
      case "water": this.ctx.fillStyle = "#0b355a"; break;
      case "grass": this.ctx.fillStyle = "#11402a"; break;
      case "forest": this.ctx.fillStyle = "#0e2a1b"; break;
      case "mountain": this.ctx.fillStyle = "#3a3f46"; break;
      case "dungeon": this.ctx.fillStyle = "#553a8a"; break;
      default: this.ctx.fillStyle = "#222"; break;
    }
    this.ctx.fillRect(x, y, s, s);
    if (tile === "dungeon") {
      this.ctx.fillStyle = "#e6d7ff";
      this.ctx.fillText("D", x + 5, y + 12);
    }
  }

  private drawDungeonTile(tile: string, x: number, y: number, s: number, alpha: number): void {
    this.ctx.globalAlpha = alpha;
    switch (tile) {
      case "wall": this.ctx.fillStyle = "#1b2430"; break;
      case "floor": this.ctx.fillStyle = "#0b1320"; break;
      case "stairsUp": this.ctx.fillStyle = "#122033"; break;
      case "stairsDown": this.ctx.fillStyle = "#122033"; break;
      default: this.ctx.fillStyle = "#222"; break;
    }
    this.ctx.fillRect(x, y, s, s);
    this.ctx.globalAlpha = 1.0;

    if (tile === "stairsUp") {
      this.ctx.fillStyle = "#cfe3ff";
      this.ctx.fillText("<", x + 5, y + 12);
    }
    if (tile === "stairsDown") {
      this.ctx.fillStyle = "#cfe3ff";
      this.ctx.fillText(">", x + 5, y + 12);
    }
  }
}
