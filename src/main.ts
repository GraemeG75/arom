import type { Action, Entity, Mode, Point } from "./core/types";
import { Rng } from "./core/rng";
import { add } from "./core/util";
import { Overworld, dungeonIdFromWorldPos, dungeonSeedFromWorldPos } from "./maps/overworld";
import type { Dungeon } from "./maps/dungeon";
import { generateDungeon, getDungeonTile, randomFloorPoint } from "./maps/dungeon";
import { computeDungeonFov, decayVisibilityToSeen } from "./systems/fov";
import { canEnterDungeonTile, canEnterOverworldTile, isBlockedByEntity } from "./systems/rules";
import { stepChase } from "./systems/ai";
import { renderAscii } from "./render/ascii";
import { CanvasRenderer } from "./render/canvas";
import { MessageLog } from "./ui/log";

type RendererMode = "ascii" | "canvas";

type GameState = {
  worldSeed: number;
  rng: Rng;

  mode: Mode;

  overworld: Overworld;
  dungeons: Map<string, Dungeon>;
  entranceReturnPos?: Point;

  player: Entity;
  entities: Entity[];

  rendererMode: RendererMode;
  useFov: boolean;

  log: MessageLog;
};

const VIEW_W: number = 61;
const VIEW_H: number = 33;

const asciiEl: HTMLElement = document.getElementById("ascii")!;
const canvasWrap: HTMLElement = document.getElementById("canvasWrap")!;
const modePill: HTMLElement = document.getElementById("modePill")!;
const renderPill: HTMLElement = document.getElementById("renderPill")!;
const statsEl: HTMLElement = document.getElementById("stats")!;
const logEl: HTMLElement = document.getElementById("log")!;

const btnAscii: HTMLButtonElement = document.getElementById("btnAscii") as HTMLButtonElement;
const btnCanvas: HTMLButtonElement = document.getElementById("btnCanvas") as HTMLButtonElement;
const btnNewSeed: HTMLButtonElement = document.getElementById("btnNewSeed") as HTMLButtonElement;

const canvas: HTMLCanvasElement = document.getElementById("gameCanvas") as HTMLCanvasElement;
const canvasRenderer: CanvasRenderer = new CanvasRenderer(canvas);

function newGame(worldSeed: number): GameState {
  const rng: Rng = new Rng(worldSeed);

  const overworld: Overworld = new Overworld(worldSeed);

  const player: Entity = {
    id: "player",
    kind: "player",
    name: "You",
    pos: { x: 0, y: 0 },
    mapRef: { kind: "overworld" },
    hp: 20,
    maxHp: 20
  };

  player.pos = findStartPosition(overworld, rng);

  const state: GameState = {
    worldSeed,
    rng,
    mode: "overworld",
    overworld,
    dungeons: new Map<string, Dungeon>(),
    player,
    entities: [player],
    rendererMode: "ascii",
    useFov: true,
    log: new MessageLog(80)
  };

  state.log.push("Welcome. Find a dungeon entrance (D). Stand on it and press Enter to enter.");
  return state;
}

function findStartPosition(overworld: Overworld, rng: Rng): Point {
  for (let i: number = 0; i < 3000; i++) {
    const x: number = rng.nextInt(-200, 200);
    const y: number = rng.nextInt(-200, 200);
    if (canEnterOverworldTile(overworld, { x, y })) return { x, y };
  }
  return { x: 0, y: 0 };
}

let state: GameState = newGame(Date.now() & 0xffffffff);

function getCurrentDungeon(s: GameState): Dungeon | undefined {
  if (s.player.mapRef.kind !== "dungeon") return undefined;
  return s.dungeons.get(s.player.mapRef.dungeonId);
}

function ensureDungeonForEntrance(s: GameState, worldPos: Point): Dungeon {
  const dungeonId: string = dungeonIdFromWorldPos(s.worldSeed, worldPos.x, worldPos.y);
  const existing: Dungeon | undefined = s.dungeons.get(dungeonId);
  if (existing) return existing;

  const seed: number = dungeonSeedFromWorldPos(s.worldSeed, worldPos.x, worldPos.y);
  const dungeon: Dungeon = generateDungeon(dungeonId, seed, 80, 50);
  spawnMonstersInDungeon(s, dungeon, seed);
  s.dungeons.set(dungeonId, dungeon);
  return dungeon;
}

function spawnMonstersInDungeon(s: GameState, dungeon: Dungeon, seed: number): void {
  const monsterCount: number = 10;
  for (let i: number = 0; i < monsterCount; i++) {
    const p: Point = randomFloorPoint(dungeon, seed + 1000 + i * 17);
    const monster: Entity = {
      id: `m_${dungeon.id}_${i}`,
      kind: "monster",
      name: "Goblin",
      pos: p,
      mapRef: { kind: "dungeon", dungeonId: dungeon.id },
      hp: 6,
      maxHp: 6
    };
    s.entities.push(monster);
  }
}

function removeDeadEntities(s: GameState): void {
  s.entities = s.entities.filter((e: Entity) => e.hp > 0 || e.kind === "player");
}

function handleAction(action: Action): void {
  if (action.kind === "toggleRenderer") {
    state.rendererMode = state.rendererMode === "ascii" ? "canvas" : "ascii";
    syncRendererUi();
    render();
    return;
  }

  if (action.kind === "toggleFov") {
    state.useFov = !state.useFov;
    state.log.push(state.useFov ? "FOV enabled." : "FOV disabled.");
    render();
    return;
  }

  if (action.kind === "help") {
    state.log.push("Keys: WASD/Arrows move • Enter use/enter/exit • R toggle renderer • F toggle FOV • Space wait.");
    render();
    return;
  }

  const acted: boolean = playerTurn(action);
  if (!acted) {
    render();
    return;
  }

  monstersTurn();
  removeDeadEntities(state);

  if (state.player.hp <= 0) {
    state.log.push("You died. Press New Seed to restart.");
  }

  render();
}

function playerTurn(action: Action): boolean {
  if (state.player.hp <= 0) return false;

  if (action.kind === "wait") {
    state.log.push("You wait.");
    return true;
  }

  if (action.kind === "use") {
    if (state.mode === "overworld") {
      const t = state.overworld.getTile(state.player.pos.x, state.player.pos.y);
      if (t === "dungeon") {
        enterDungeonAt(state.player.pos);
        return true;
      }
      state.log.push("Nothing to use here.");
      return false;
    } else {
      const dungeon: Dungeon | undefined = getCurrentDungeon(state);
      if (!dungeon) return false;

      const tile = getDungeonTile(dungeon, state.player.pos.x, state.player.pos.y);
      if (tile === "stairsUp") {
        leaveDungeon();
        return true;
      }
      state.log.push("Nothing to use here.");
      return false;
    }
  }

  if (action.kind === "move") {
    return tryMovePlayer(action.dx, action.dy);
  }

  return false;
}

function tryMovePlayer(dx: number, dy: number): boolean {
  const target: Point = add(state.player.pos, { x: dx, y: dy });

  if (state.mode === "dungeon") {
    const dungeon: Dungeon | undefined = getCurrentDungeon(state);
    if (!dungeon) return false;

    const blocker: Entity | undefined = isBlockedByEntity(state.entities, "dungeon", dungeon.id, target);
    if (blocker && blocker.kind === "monster") {
      attack(state.player, blocker);
      return true;
    }

    if (!canEnterDungeonTile(dungeon, target)) return false;

    state.player.pos = target;
    return true;
  }

  if (!canEnterOverworldTile(state.overworld, target)) return false;

  state.player.pos = target;

  const t = state.overworld.getTile(target.x, target.y);
  if (t === "dungeon") {
    state.log.push("Dungeon entrance found. Press Enter to enter.");
  }

  return true;
}

function attack(attacker: Entity, defender: Entity): void {
  const dmg: number = Math.max(1, 1 + state.rng.nextInt(0, 4));
  defender.hp -= dmg;
  state.log.push(`${attacker.name} hits ${defender.name} for ${dmg}. (${Math.max(0, defender.hp)}/${defender.maxHp})`);
  if (defender.hp <= 0) {
    state.log.push(`${defender.name} dies.`);
  }
}

function monstersTurn(): void {
  if (state.mode !== "dungeon") return;

  const dungeon: Dungeon | undefined = getCurrentDungeon(state);
  if (!dungeon) return;

  let visible: Set<string> | undefined;

  if (state.useFov) {
    decayVisibilityToSeen(dungeon);
    visible = computeDungeonFov(dungeon, state.player.pos, 10);
  }

  for (const e of state.entities) {
    if (e.kind !== "monster") continue;
    if (e.mapRef.kind !== "dungeon") continue;
    if (e.mapRef.dungeonId !== dungeon.id) continue;
    if (e.hp <= 0) continue;

    const dist: number = Math.abs(e.pos.x - state.player.pos.x) + Math.abs(e.pos.y - state.player.pos.y);
    if (dist <= 1) {
      attack(e, state.player);
      continue;
    }

    const chaseOk: boolean = !state.useFov || (visible ? visible.has(`${e.pos.x},${e.pos.y}`) : true);
    if (dist <= 8 && chaseOk) {
      const next: Point = stepChase(e, state.player);

      const blocked: Entity | undefined = isBlockedByEntity(state.entities, "dungeon", dungeon.id, next);
      if (blocked) continue;

      if (canEnterDungeonTile(dungeon, next)) {
        e.pos = next;
      }
    }
  }
}

function enterDungeonAt(worldPos: Point): void {
  const dungeon: Dungeon = ensureDungeonForEntrance(state, worldPos);

  state.entranceReturnPos = { x: worldPos.x, y: worldPos.y };
  state.mode = "dungeon";
  state.player.mapRef = { kind: "dungeon", dungeonId: dungeon.id };
  state.player.pos = { x: dungeon.stairsUp.x, y: dungeon.stairsUp.y };

  state.log.push("You enter the dungeon.");
}

function leaveDungeon(): void {
  if (!state.entranceReturnPos) return;

  state.mode = "overworld";
  state.player.mapRef = { kind: "overworld" };
  state.player.pos = { x: state.entranceReturnPos.x, y: state.entranceReturnPos.y };
  state.entranceReturnPos = undefined;

  state.log.push("You return to the overworld.");
}

function syncRendererUi(): void {
  const isAscii: boolean = state.rendererMode === "ascii";
  asciiEl.style.display = isAscii ? "block" : "none";
  canvasWrap.style.display = isAscii ? "none" : "block";
}

function render(): void {
  modePill.textContent = `Mode: ${state.mode}`;
  renderPill.textContent = `Renderer: ${state.rendererMode} • FOV: ${state.useFov ? "on" : "off"}`;

  const dungeon: Dungeon | undefined = getCurrentDungeon(state);

  if (state.mode === "dungeon" && dungeon && state.useFov) {
    decayVisibilityToSeen(dungeon);
    computeDungeonFov(dungeon, state.player.pos, 10);
  }

  const monsterCountHere: number = state.entities.filter((e: Entity) =>
    e.kind === "monster" &&
    e.hp > 0 &&
    ((state.mode === "overworld" && e.mapRef.kind === "overworld") ||
     (state.mode === "dungeon" && e.mapRef.kind === "dungeon" && dungeon && e.mapRef.dungeonId === dungeon.id))
  ).length;

  statsEl.innerHTML = `
    <div><b>${state.player.name}</b> HP: ${state.player.hp}/${state.player.maxHp}</div>
    <div>Pos: ${state.player.pos.x}, ${state.player.pos.y}</div>
    <div>Monsters nearby: ${monsterCountHere}</div>
    <div>World seed: ${state.worldSeed}</div>
  `;

  logEl.innerHTML = state.log.all().map((m) => `<div>• ${escapeHtml(m.text)}</div>`).join("");

  if (state.rendererMode === "ascii") {
    asciiEl.textContent = renderAscii({
      mode: state.mode,
      overworld: state.overworld,
      dungeon,
      player: state.player,
      entities: state.entities,
      useFov: state.useFov
    }, VIEW_W, VIEW_H);
  } else {
    canvasRenderer.render({
      mode: state.mode,
      overworld: state.overworld,
      dungeon,
      player: state.player,
      entities: state.entities,
      useFov: state.useFov
    }, Math.floor(canvas.width / 16) - 1, Math.floor(canvas.height / 16) - 1);
  }
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function keyToAction(e: KeyboardEvent): Action | undefined {
  if (e.key === "r" || e.key === "R") return { kind: "toggleRenderer" };
  if (e.key === "f" || e.key === "F") return { kind: "toggleFov" };
  if (e.key === "?" ) return { kind: "help" };

  if (e.key === "Enter") return { kind: "use" };
  if (e.key === " ") return { kind: "wait" };

  if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") return { kind: "move", dx: 0, dy: -1 };
  if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") return { kind: "move", dx: 0, dy: 1 };
  if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") return { kind: "move", dx: -1, dy: 0 };
  if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") return { kind: "move", dx: 1, dy: 0 };

  return undefined;
}

window.addEventListener("keydown", (e: KeyboardEvent) => {
  const a: Action | undefined = keyToAction(e);
  if (!a) return;
  e.preventDefault();
  handleAction(a);
});

btnAscii.addEventListener("click", () => {
  state.rendererMode = "ascii";
  syncRendererUi();
  render();
});

btnCanvas.addEventListener("click", () => {
  state.rendererMode = "canvas";
  syncRendererUi();
  render();
});

btnNewSeed.addEventListener("click", () => {
  state = newGame(Date.now() & 0xffffffff);
  syncRendererUi();
  render();
});

syncRendererUi();
render();
