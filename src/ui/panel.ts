import type { Entity, GearRarity, Item, Shop } from '../core/types';

export type PanelMode = 'none' | 'inventory' | 'shop' | 'quest';

export type PanelContext = {
  mode: PanelMode;
  player: Entity;
  items: Item[];
  activeShop?: Shop;
  canShop: boolean;
  quests: import('../core/types').Quest[];
  activeTownId?: string;
  shopCategory: 'all' | 'potion' | 'weapon' | 'armor';
};

export function renderPanelHtml(ctx: PanelContext): string {
  if (ctx.mode === 'inventory') return renderInventory(ctx.player, ctx.items);
  if (ctx.mode === 'shop') return renderShop(ctx.player, ctx.items, ctx.activeShop, ctx.canShop, ctx.shopCategory);
  if (ctx.mode === 'quest') return renderQuestLog(ctx.quests, ctx.activeTownId);
  return `<div class="small muted">Panels: <b>I</b> inventory • <b>B</b> shop (in town) • <b>Q</b> quests (in town)</div>`;
}

const RARITY_LABEL: Record<GearRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary'
};

function renderRarityBadge(item: Item): string {
  const rarity: GearRarity = item.rarity ?? 'common';
  const label: string = RARITY_LABEL[rarity];
  return `<span class="rarityBadge rarity-${rarity}">${escapeHtml(label)}</span>`;
}

function formatItemExtra(it: Item): string {
  if (it.kind === 'potion') return `(+${it.healAmount ?? 0} HP)`;

  const parts: string[] = [];
  if (it.kind === 'weapon') {
    parts.push(`+${it.attackBonus ?? 0} Atk`);
    if ((it.critChance ?? 0) > 0) parts.push(`+${it.critChance}% Crit`);
    if ((it.lifesteal ?? 0) > 0) parts.push(`+${it.lifesteal}% Leech`);
  }
  if (it.kind === 'armor') {
    parts.push(`+${it.defenseBonus ?? 0} Def`);
    if ((it.dodgeChance ?? 0) > 0) parts.push(`+${it.dodgeChance}% Dodge`);
    if ((it.thorns ?? 0) > 0) parts.push(`+${it.thorns} Thorns`);
  }

  return parts.length > 0 ? `(${parts.join(', ')})` : '';
}

function renderInventory(player: Entity, items: Item[]): string {
  const invItems: Item[] = player.inventory.map((id: string) => items.find((x) => x.id === id)).filter((x: Item | undefined): x is Item => !!x);

  const weaponId: string | undefined = player.equipment.weaponItemId;
  const armorId: string | undefined = player.equipment.armorItemId;

  const weapon: Item | undefined = weaponId ? items.find((x) => x.id === weaponId) : undefined;
  const armor: Item | undefined = armorId ? items.find((x) => x.id === armorId) : undefined;

  const lines: string[] = [];
  lines.push(`<div class="panelTitle"><b>Inventory</b><span class="tag">I to close</span></div>`);
  lines.push(`<div class="small">Gold: <b>${player.gold}</b> • Level: <b>${player.level}</b> • XP: <b>${player.xp}</b></div>`);
  lines.push(`<div class="small">Weapon: ${weapon ? `<b>${escapeHtml(weapon.name)}</b>` : `<span class="muted">none</span>`}</div>`);
  lines.push(`<div class="small">Armor: ${armor ? `<b>${escapeHtml(armor.name)}</b>` : `<span class="muted">none</span>`}</div>`);
  lines.push(`<div class="sep"></div>`);

  if (invItems.length === 0) {
    lines.push(`<div class="small muted">Empty.</div>`);
    return lines.join('');
  }

  lines.push(`<div class="grid">`);
  for (const it of invItems.slice(0, 60)) {
    const extra: string = formatItemExtra(it);
    const actions: string[] = [];

    if (it.kind === 'potion') actions.push(`<button class="btnTiny" data-act="use" data-item="${it.id}">Use</button>`);
    if (it.kind === 'weapon') {
      const currentWeaponId: string | undefined = player.equipment.weaponItemId;
      const currentWeapon = currentWeaponId ? items.find((x) => x.id === currentWeaponId) : undefined;
      const curAtk: number = currentWeapon?.attackBonus ?? 0;
      const newAtk: number = it.attackBonus ?? 0;
      const delta: number = newAtk - curAtk;
      actions.push(
        `<button class="btnTiny" data-act="equipWeapon" data-item="${it.id}">Equip ${delta === 0 ? '' : delta > 0 ? '(+' + delta + ')' : '(' + delta + ')'}</button>`
      );
    }
    if (it.kind === 'armor') {
      const currentArmorId: string | undefined = player.equipment.armorItemId;
      const currentArmor = currentArmorId ? items.find((x) => x.id === currentArmorId) : undefined;
      const curDef: number = currentArmor?.defenseBonus ?? 0;
      const newDef: number = it.defenseBonus ?? 0;
      const delta: number = newDef - curDef;
      actions.push(
        `<button class="btnTiny" data-act="equipArmor" data-item="${it.id}">Equip ${delta === 0 ? '' : delta > 0 ? '(+' + delta + ')' : '(' + delta + ')'}</button>`
      );
    }

    actions.push(`<button class="btnTiny" data-act="drop" data-item="${it.id}">Drop</button>`);

    const rarityBadge: string = renderRarityBadge(it);
    lines.push(`<div class="small">• ${rarityBadge}${escapeHtml(it.name)} <span class="muted">${escapeHtml(extra)}</span></div>`);
    lines.push(`<div class="row" style="justify-content:flex-end;">${actions.join('')}</div>`);
  }
  lines.push(`</div>`);

  return lines.join('');
}

function renderShop(
  player: Entity,
  items: Item[],
  shop: Shop | undefined,
  canShop: boolean,
  category: 'all' | 'potion' | 'weapon' | 'armor'
): string {
  const lines: string[] = [];
  lines.push(`<div class="panelTitle"><b>Town Shop</b><span class="tag">B to close</span></div>`);

  if (!canShop) {
    lines.push(`<div class="small muted">You need to be standing on a town tile (T) to shop.</div>`);
    return lines.join('');
  }

  if (!shop) {
    lines.push(`<div class="small muted">No shop found for this town.</div>`);
    return lines.join('');
  }

  lines.push(`<div class="small">Gold: <b>${player.gold}</b></div>`);
  lines.push(
    `<div class="row" style="margin-top:6px;">` +
      `<button class="btnTiny" data-act="shopCat" data-cat="all">All</button>` +
      `<button class="btnTiny" data-act="shopCat" data-cat="potion">Potions</button>` +
      `<button class="btnTiny" data-act="shopCat" data-cat="weapon">Weapons</button>` +
      `<button class="btnTiny" data-act="shopCat" data-cat="armor">Armor</button>` +
      `</div>`
  );
  lines.push(`<div class="sep"></div>`);
  lines.push(`<div class="small muted">Buy</div>`);
  lines.push(`<div class="grid">`);

  for (const id of shop.stockItemIds.slice(0, 40)) {
    const it: Item | undefined = items.find((x) => x.id === id);
    if (!it) continue;
    if (category !== 'all' && it.kind !== category) continue;

    const price: number = it.value;
    const extra: string = formatItemExtra(it);

    const rarityBadge: string = renderRarityBadge(it);
    lines.push(
      `<div class="small">• ${rarityBadge}${escapeHtml(it.name)} <span class="muted">${escapeHtml(extra)}</span> <span class="muted">(${price}g)</span></div>`
    );
    lines.push(`<div class="row" style="justify-content:flex-end;"><button class="btnTiny" data-act="buy" data-item="${it.id}">Buy</button></div>`);
  }
  lines.push(`</div>`);

  lines.push(`<div class="sep"></div>`);
  lines.push(`<div class="small muted">Sell (from inventory)</div>`);

  const invItems: Item[] = player.inventory.map((iid: string) => items.find((x) => x.id === iid)).filter((x: Item | undefined): x is Item => !!x);

  if (invItems.length === 0) {
    lines.push(`<div class="small muted">Nothing to sell.</div>`);
    return lines.join('');
  }

  lines.push(`<div class="grid">`);
  for (const it of invItems.slice(0, 30)) {
    const price: number = Math.max(1, Math.floor(it.value * 0.5));
    const rarityBadge: string = renderRarityBadge(it);
    lines.push(`<div class="small">• ${rarityBadge}${escapeHtml(it.name)} <span class="muted">(${price}g)</span></div>`);
    lines.push(`<div class="row" style="justify-content:flex-end;"><button class="btnTiny" data-act="sell" data-item="${it.id}">Sell</button></div>`);
  }
  lines.push(`</div>`);

  return lines.join('');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
