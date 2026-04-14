export const GRID_SIZE = 9;
export const MAX_AP = 5;
export const AP_REGEN_MS = 5 * 60 * 1000; // 5 minutes per AP
export const CENTER_HEX = "0,0";

export const PLAYER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#e84393",
];

// Axial neighbor offsets for hex grids
const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 1 },
];

export function generateGrid() {
  const cells = [];
  const half = Math.floor(GRID_SIZE / 2);

  for (let q = -half; q <= half; q++) {
    for (let r = -half; r <= half; r++) {
      const s = -q - r;
      if (Math.abs(s) <= half) {
        cells.push({ q, r });
      }
    }
  }
  return cells;
}

export function getNeighborKeys(q, r) {
  return AXIAL_DIRECTIONS.map((d) => `${q + d.q},${r + d.r}`);
}

export function canClaimTile(q, r, tiles, uid, ap) {
  const key = `${q},${r}`;

  if (!tiles[key] || tiles[key] !== "empty") return false;
  if (ap <= 0) return false;

  // If the player owns zero tiles, allow claiming any empty tile
  const ownsAny = Object.values(tiles).some((v) => v === uid);
  if (!ownsAny) return true;

  // Otherwise, must be adjacent to at least one tile they own
  return getNeighborKeys(q, r).some((nk) => tiles[nk] === uid);
}

export function parseTile(value) {
  if (!value || value === "empty") return { owner: null, fortified: false };
  if (value === "gold") return { owner: null, fortified: false, gold: true };
  if (value.endsWith("_mine")) return { owner: value.slice(0, -5), fortified: false, mined: true };
  if (value.endsWith("_fortified")) {
    return { owner: value.slice(0, -10), fortified: true };
  }
  return { owner: value, fortified: false };
}

export function getTileAction(q, r, tiles, uid, ap) {
  const key = `${q},${r}`;
  const raw = tiles[key];
  if (raw === undefined) return null;

  const parsed = parseTile(raw);
  const { owner, fortified } = parsed;

  // Gold tile: 1 AP, adjacent (or first tile)
  if (parsed.gold) {
    if (ap < 1) return null;
    const ownsAny = Object.values(tiles).some((v) => parseTile(v).owner === uid);
    if (ownsAny) {
      if (!getNeighborKeys(q, r).some((nk) => parseTile(tiles[nk] || "").owner === uid)) return null;
    }
    return { type: "claim_gold", cost: 1, newValue: uid };
  }

  // Empty tile: 1 AP, must be adjacent (or first tile)
  if (!owner) {
    if (ap < 1) return null;
    const ownsAny = Object.values(tiles).some((v) => parseTile(v).owner === uid);
    if (ownsAny) {
      if (!getNeighborKeys(q, r).some((nk) => parseTile(tiles[nk] || "").owner === uid)) return null;
    }
    return { type: "claim", cost: 1, newValue: uid };
  }

  // Own tile, not fortified: fortify for 3 AP
  if (owner === uid && !fortified) {
    if (ap < 3) return null;
    return { type: "fortify", cost: 3, newValue: `${uid}_fortified` };
  }

  // Own tile, already fortified: no action
  if (owner === uid) return null;

  // Enemy tile: must be adjacent to own tile
  if (!getNeighborKeys(q, r).some((nk) => parseTile(tiles[nk] || "").owner === uid)) return null;

  // Enemy, not fortified: 3 AP
  if (!fortified) {
    if (ap < 3) return null;
    return { type: "attack", cost: 3, newValue: uid };
  }

  // Enemy, fortified: 5 AP
  if (ap < 5) return null;
  return { type: "attack_fortified", cost: 5, newValue: uid };
}
