import { useMemo } from "react";
import { generateGrid, PLAYER_COLORS } from "../gameLogic";
import "./HexGrid.css";

const HEX_SIZE = 28;
const EMPTY_FILL = "#2d2d44";

function hexCorners(cx, cy, size) {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30;
    const angleRad = (Math.PI / 180) * angleDeg;
    points.push(
      `${cx + size * Math.cos(angleRad)},${cy + size * Math.sin(angleRad)}`
    );
  }
  return points.join(" ");
}

function axialToPixel(q, r) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

function getTileFill(key, tiles, uidColorMap) {
  if (!tiles) return EMPTY_FILL;
  const owner = tiles[key];
  if (!owner || owner === "empty") return EMPTY_FILL;
  const colorIndex = uidColorMap[owner];
  return colorIndex !== undefined ? PLAYER_COLORS[colorIndex] : "#555";
}

export default function HexGrid({ tiles, uidColorMap, onHexClick, currentUid }) {
  const cells = useMemo(() => generateGrid(), []);

  const padding = HEX_SIZE + 4;
  const allPixels = cells.map(({ q, r }) => axialToPixel(q, r));
  const minX = Math.min(...allPixels.map((p) => p.x)) - padding;
  const maxX = Math.max(...allPixels.map((p) => p.x)) + padding;
  const minY = Math.min(...allPixels.map((p) => p.y)) - padding;
  const maxY = Math.max(...allPixels.map((p) => p.y)) + padding;

  return (
    <div className="hex-grid-wrapper">
      <svg
        className="hex-grid-svg"
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {cells.map(({ q, r }) => {
          const key = `${q},${r}`;
          const { x, y } = axialToPixel(q, r);
          const fill = getTileFill(key, tiles, uidColorMap);
          const isOwn = tiles && tiles[key] === currentUid;
          return (
            <polygon
              key={key}
              points={hexCorners(x, y, HEX_SIZE - 2)}
              className={`hex-cell${isOwn ? " hex-cell--own" : ""}`}
              style={{ fill }}
              onClick={() => onHexClick(q, r)}
            />
          );
        })}
      </svg>
    </div>
  );
}
