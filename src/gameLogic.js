export const GRID_SIZE = 9;

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
