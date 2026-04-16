import { useMemo, useRef, useEffect, useCallback } from "react";
import { generateGrid, PLAYER_COLORS, parseTile } from "../gameLogic";
import "./HexGrid.css";

const HEX_SIZE = 28;
const FORT_SIZE = 14;
const EMPTY_FILL = "#2d2d44";
const FOG_FILL = "#15151f";

function hexCorners(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    pts.push(`${cx + size * Math.cos(a)},${cy + size * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function axialToPixel(q, r) {
  return {
    x: HEX_SIZE * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: HEX_SIZE * ((3 / 2) * r),
  };
}

function getTileFill(key, tiles, playerInfo) {
  if (!tiles) return EMPTY_FILL;
  const { owner } = parseTile(tiles[key]);
  if (!owner) return EMPTY_FILL;
  const info = playerInfo[owner];
  return info ? PLAYER_COLORS[info.colorIndex] : "#555";
}

export default function HexGrid({
  tiles,
  playerInfo,
  onHexClick,
  currentUid,
  visibleSet,
  onHexHover,
  gameMode,
  hoveredKey,
}) {
  const cells = useMemo(() => generateGrid(), []);
  const svgRef = useRef(null);
  const gestureRef = useRef({ panning: false, sx: 0, sy: 0, moved: false });

  const defaultVB = useMemo(() => {
    const pad = HEX_SIZE + 4;
    const px = cells.map(({ q, r }) => axialToPixel(q, r));
    const xs = px.map((p) => p.x);
    const ys = px.map((p) => p.y);
    return {
      x: Math.min(...xs) - pad,
      y: Math.min(...ys) - pad,
      w: Math.max(...xs) - Math.min(...xs) + pad * 2,
      h: Math.max(...ys) - Math.min(...ys) + pad * 2,
    };
  }, [cells]);

  const vbRef = useRef({ ...defaultVB });

  const applyVB = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const { x, y, w, h } = vbRef.current;
    svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
  }, []);

  /* ── Pointer pan ── */
  const onPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    gestureRef.current = { panning: true, sx: e.clientX, sy: e.clientY, moved: false };
  }, []);

  const onPointerMove = useCallback((e) => {
    const g = gestureRef.current;
    if (!g.panning) return;
    const dx = e.clientX - g.sx;
    const dy = e.clientY - g.sy;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) g.moved = true;
    if (!g.moved) return;
    const svg = svgRef.current;
    if (!svg) return;
    const scale = vbRef.current.w / svg.clientWidth;
    vbRef.current.x -= dx * scale;
    vbRef.current.y -= dy * scale;
    g.sx = e.clientX;
    g.sy = e.clientY;
    applyVB();
  }, [applyVB]);

  const onPointerUp = useCallback(() => {
    gestureRef.current.panning = false;
  }, []);

  /* ── Wheel zoom ── */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e) => {
      e.preventDefault();
      const f = e.deltaY > 0 ? 1.08 : 1 / 1.08;
      const rect = svg.getBoundingClientRect();
      const mx = (e.clientX - rect.left) / rect.width;
      const my = (e.clientY - rect.top) / rect.height;
      const vb = vbRef.current;
      const nw = vb.w * f;
      const nh = vb.h * f;
      vb.x -= (nw - vb.w) * mx;
      vb.y -= (nh - vb.h) * my;
      vb.w = nw;
      vb.h = nh;
      applyVB();
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, [applyVB]);

  /* ── Pinch zoom ── */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let lastDist = 0;
    const onTM = (e) => {
      if (e.touches.length !== 2) return;
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      if (lastDist > 0) {
        const f = lastDist / d;
        const rect = svg.getBoundingClientRect();
        const cx = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) / rect.width;
        const cy = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top) / rect.height;
        const vb = vbRef.current;
        const nw = vb.w * f;
        const nh = vb.h * f;
        vb.x -= (nw - vb.w) * cx;
        vb.y -= (nh - vb.h) * cy;
        vb.w = nw;
        vb.h = nh;
        applyVB();
      }
      lastDist = d;
    };
    const onTE = () => { lastDist = 0; };
    svg.addEventListener("touchmove", onTM, { passive: false });
    svg.addEventListener("touchend", onTE);
    return () => { svg.removeEventListener("touchmove", onTM); svg.removeEventListener("touchend", onTE); };
  }, [applyVB]);

  /* ── Click (skip if panned) ── */
  const handleClick = useCallback((q, r) => {
    if (gestureRef.current.moved) return;
    onHexClick(q, r);
  }, [onHexClick]);

  return (
    <div className="hex-grid-wrapper">
      <svg
        ref={svgRef}
        className="hex-grid-svg"
        viewBox={`${defaultVB.x} ${defaultVB.y} ${defaultVB.w} ${defaultVB.h}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ touchAction: "none" }}
      >
        {cells.map(({ q, r }) => {
          const key = `${q},${r}`;
          const { x, y } = axialToPixel(q, r);
          const isVisible = !visibleSet || visibleSet.has(key);
          const isHovered = hoveredKey === key;

          if (!isVisible) {
            return (
              <polygon
                key={key}
                points={hexCorners(x, y, HEX_SIZE - 2)}
                className="hex-cell hex-cell--fog"
                style={{ fill: FOG_FILL }}
              />
            );
          }

          const rawVal = tiles ? tiles[key] : null;
          const fill = getTileFill(key, tiles, playerInfo);
          const { owner, fortified } = parseTile(rawVal);
          const isOwn = owner === currentUid;
          const isGold = rawVal === "gold";

          return (
            <g key={key} onClick={() => handleClick(q, r)}
               onPointerEnter={() => onHexHover?.({ q, r })}
               onPointerLeave={() => onHexHover?.(null)}>
              <polygon
                points={hexCorners(x, y, HEX_SIZE - 2)}
                className={`hex-cell${isOwn ? " hex-cell--own" : ""}${isGold ? " hex-cell--gold" : ""}${isHovered ? " hex-cell--hovered" : ""}`}
                style={{ fill: isGold ? "#f1c40f" : fill }}
              />
              {fortified && (
                <polygon
                  points={hexCorners(x, y, FORT_SIZE)}
                  className="hex-fort"
                  style={{ stroke: isOwn ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)" }}
                />
              )}
              {gameMode === "koth" && q === 0 && r === 0 && (
                <polygon
                  points={hexCorners(x, y, HEX_SIZE)}
                  className="hex-koth-ring"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
