import type { Entity, Point } from '../core/types';
import type { Dungeon } from '../maps/dungeon';
import { aStar } from './astar';
import { canEnterDungeonTile, isBlockedByEntity } from './rules';

/**
 * Computes the next step for a monster toward the player.
 * @param monster The monster entity.
 * @param player The player entity.
 * @param dungeon The dungeon instance.
 * @param entities All entities in the dungeon.
 * @returns The next step, or undefined if no path.
 */
export function nextMonsterStep(monster: Entity, player: Entity, dungeon: Dungeon, entities: Entity[]): Point | undefined {
  const path: Point[] | undefined = aStar(
    monster.pos,
    player.pos,
    (p: Point) => canEnterDungeonTile(dungeon, p),
    (p: Point) => !!isBlockedByEntity(entities, 'dungeon', dungeon.id, undefined, p)
  );

  if (!path || path.length < 2) {
    return undefined;
  }
  return path[1];
}
