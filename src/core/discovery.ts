import type { Point } from './types';
import type { Overworld } from '../maps/overworld';
import { t } from '../i18n';

export type DiscoveredPoiKind = 'town' | 'dungeon' | 'cave';

export type DiscoveredPoi = {
  id: string;
  kind: DiscoveredPoiKind;
  name: string;
  pos: Point;
  discoveredTurn: number;
};

/**
 * Builds a stable id for a discovered point of interest.
 * @param kind The POI kind.
 * @param pos The world position.
 * @returns The POI id.
 */
export function poiId(kind: DiscoveredPoiKind, pos: Point): string {
  return `${kind}:${pos.x},${pos.y}`;
}

/**
 * Checks whether the player discovers a POI at the current position.
 * @param overworld The overworld map.
 * @param playerPos The player position.
 * @param discovered The current list of discovered POIs.
 * @param turnCounter The current turn counter.
 * @returns True if a new POI is discovered.
 */
export function maybeDiscoverPois(overworld: Overworld, playerPos: Point, discovered: DiscoveredPoi[], turnCounter: number): boolean {
  const tile: string = overworld.getTile(playerPos.x, playerPos.y);
  if (tile !== 'town' && tile !== 'dungeon' && tile !== 'cave') {
    return false;
  }

  const kind: DiscoveredPoiKind = tile === 'town' ? 'town' : tile === 'cave' ? 'cave' : 'dungeon';
  const id: string = poiId(kind, playerPos);
  if (discovered.some((p) => p.id === id)) {
    return false;
  }

  const count: number = discovered.filter((p) => p.kind === kind).length + 1;
  const name: string =
    kind === 'town' ? t('poi.town', { num: count }) : kind === 'cave' ? t('poi.cave', { num: count }) : t('poi.dungeon', { num: count });

  discovered.push({ id, kind, name, pos: { x: playerPos.x, y: playerPos.y }, discoveredTurn: turnCounter });
  return true;
}
