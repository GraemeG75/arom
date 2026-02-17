import { OverworldTile } from './types';
import type { Point } from './types';
import type { Overworld } from '../maps/overworld';
import { t } from '../i18n';

export enum DiscoveredPoiKind {
  Town = 'town',
  Dungeon = 'dungeon',
  Cave = 'cave'
}

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
  const tile: OverworldTile = overworld.getTile(playerPos.x, playerPos.y);
  if (tile !== OverworldTile.Town && tile !== OverworldTile.Dungeon && tile !== OverworldTile.Cave) {
    return false;
  }

  const kind: DiscoveredPoiKind =
    tile === OverworldTile.Town ? DiscoveredPoiKind.Town : tile === OverworldTile.Cave ? DiscoveredPoiKind.Cave : DiscoveredPoiKind.Dungeon;
  const id: string = poiId(kind, playerPos);
  if (discovered.some((p) => p.id === id)) {
    return false;
  }

  const count: number = discovered.filter((p) => p.kind === kind).length + 1;
  const name: string =
    kind === DiscoveredPoiKind.Town
      ? t('poi.town', { num: count })
      : kind === DiscoveredPoiKind.Cave
        ? t('poi.cave', { num: count })
        : t('poi.dungeon', { num: count });

  discovered.push({ id, kind, name, pos: { x: playerPos.x, y: playerPos.y }, discoveredTurn: turnCounter });
  return true;
}
