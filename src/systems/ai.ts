import type { Entity, Point } from "../core/types";

export function stepChase(monster: Entity, player: Entity): Point {
  const dx: number = player.pos.x - monster.pos.x;
  const dy: number = player.pos.y - monster.pos.y;

  const stepX: number = dx === 0 ? 0 : (dx > 0 ? 1 : -1);
  const stepY: number = dy === 0 ? 0 : (dy > 0 ? 1 : -1);

  if (Math.abs(dx) > Math.abs(dy)) return { x: monster.pos.x + stepX, y: monster.pos.y };
  return { x: monster.pos.x, y: monster.pos.y + stepY };
}
