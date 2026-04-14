import { useMemo } from "react";
import "./HexGrid.css";

const GRID_SIZE = 9;
const HEX_SIZE = 28;

// Flat-top hex geometry
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

// Pointy-top hex corner offsets
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

// Convert axial (q, r) to pixel (pointy-top layout)
function axialToPixel(q, r) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = HEX_SIZE * ((3 / 2) * r);
  return { x, y };
}

function generateGrid() {
  const cells = [];
  const halfGrid = Math.floor(GRID_SIZE / 2);

  for (let q = -halfGrid; q <= halfGrid; q++) {
    for (let r = -halfGrid; r <= halfGrid; r++) {
      const s = -q - r;
      if (Math.abs(s) <= halfGrid) {
        cells.push({ q, r });
      }
    }
  }
  return cells;
}

export default function HexGrid() {
  const cells = useMemo(() => generateGrid(), []);

  // Compute bounding box for the SVG viewBox
  const padding = HEX_SIZE + 4;
  const allPixels = cells.map(({ q, r }) => axialToPixel(q, r));
  const minX = Math.min(...allPixels.map((p) => p.x)) - padding;
  const maxX = Math.max(...allPixels.map((p) => p.x)) + padding;
  const minY = Math.min(...allPixels.map((p) => p.y)) - padding;
  const maxY = Math.max(...allPixels.map((p) => p.y)) + padding;
  const vbWidth = maxX - minX;
  const vbHeight = maxY - minY;

  const handleClick = (q, r) => {
    console.log(`Hex clicked: q=${q}, r=${r}`);
  };

  return (
    <div className="hex-grid-wrapper">
      <svg
        className="hex-grid-svg"
        viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {cells.map(({ q, r }) => {
          const { x, y } = axialToPixel(q, r);
          return (
            <polygon
              key={`${q},${r}`}
              points={hexCorners(x, y, HEX_SIZE - 2)}
              className="hex-cell"
              onClick={() => handleClick(q, r)}
            />
          );
        })}
      </svg>
    </div>
  );
}
