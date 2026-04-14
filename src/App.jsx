import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "./hooks/useAuth";
import {
  useMatch, claimTile, eliminatePlayer,
  finishMatch as finishMatchFn, playAgain,
} from "./hooks/useMatch";
import { useApRegen } from "./hooks/useApRegen";
import HexGrid from "./components/HexGrid";
import Leaderboard from "./components/Leaderboard";
import Home from "./components/Home";
import Lobby from "./components/Lobby";
import { PLAYER_COLORS, MAX_AP, parseTile, getTileAction, getNeighborKeys } from "./gameLogic";
import "./App.css";

/* ─── Root ─── */

function App() {
  const {
    user, userData, setUserData, loading: authLoading,
    loginGoogle, logout,
  } = useAuth();
  const [screen, setScreen] = useState("home");
  const [matchId, setMatchId] = useState(null);
  const { match, loading: matchLoading } = useMatch(matchId);

  const navigate = (scr, id) => {
    setScreen(scr);
    setMatchId(id || null);
  };

  if (authLoading) return <LoadingScreen text="Loading..." />;
  if (!user) return <LoginScreen loginGoogle={loginGoogle} />;

  const color = PLAYER_COLORS[userData?.colorIndex ?? 0];

  if (screen === "home") {
    return <Home user={user} color={color} onNavigate={navigate} logout={logout} />;
  }

  if (matchLoading) return <LoadingScreen text="Connecting to match..." />;

  if (!match) {
    return <Home user={user} color={color} onNavigate={navigate} logout={logout} />;
  }

  if (screen === "lobby") {
    return <Lobby match={match} user={user} onNavigate={navigate} />;
  }

  return (
    <GameView
      user={user}
      userData={userData}
      setUserData={setUserData}
      match={match}
      onNavigate={navigate}
    />
  );
}

/* ─── Loading ─── */

function LoadingScreen({ text }) {
  return (
    <div className="screen screen--center">
      <div className="spinner" />
      <p className="loading-text">{text}</p>
    </div>
  );
}

/* ─── Login ─── */

function LoginScreen({ loginGoogle }) {
  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-hex-icon">⬡</div>
        <h1 className="modal-title">Hex Territory</h1>
        <p className="modal-subtitle">Capture the grid. Claim your territory.</p>

        <button className="google-btn" onClick={loginGoogle}>
          <svg className="google-icon" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign in with Google
        </button>

        <div className="how-to-play">
          <h2>How to Play</h2>
          <ol>
            <li><strong>Claim your first tile</strong> — click any empty hex.</li>
            <li><strong>Expand outward</strong> — each new tile must touch yours.</li>
            <li><strong>Spend Action Points</strong> — 1 AP per tile, 5 max.</li>
            <li><strong>Eliminate rivals</strong> — take all their hexes!</li>
            <li><strong>Last one standing wins!</strong></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */

function formatCountdown(s) {
  if (s == null) return null;
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/* ─── Tile Hint ─── */

function getHintForTile(q, r, tiles, uid, ap) {
  const key = `${q},${r}`;
  const raw = tiles[key];
  if (raw === undefined) return null;

  const { owner, fortified } = parseTile(raw);
  const ownsAny = Object.values(tiles).some((v) => parseTile(v).owner === uid);

  if (!owner) {
    if (!ownsAny) {
      return ap >= 1
        ? { text: "Claim starting tile \u2014 1 AP", type: "action" }
        : { text: "Need 1 AP to claim", type: "warn" };
    }
    const adj = getNeighborKeys(q, r).some((nk) => parseTile(tiles[nk] || "").owner === uid);
    if (!adj) return { text: "Must be adjacent to your territory", type: "warn" };
    return ap >= 1
      ? { text: "Claim empty tile \u2014 1 AP", type: "action" }
      : { text: "Need 1 AP to claim", type: "warn" };
  }

  if (owner === uid) {
    if (fortified) return { text: "Your tile (fortified)", type: "info" };
    return ap >= 3
      ? { text: "Fortify your tile \u2014 3 AP", type: "action" }
      : { text: "Fortify \u2014 need 3 AP", type: "warn" };
  }

  const adj = getNeighborKeys(q, r).some((nk) => parseTile(tiles[nk] || "").owner === uid);
  if (!adj) return { text: "Must be adjacent to attack", type: "warn" };

  if (fortified) {
    return ap >= 5
      ? { text: "Attack fortified tile \u2014 5 AP", type: "action" }
      : { text: "Attack fortified \u2014 need 5 AP", type: "warn" };
  }

  return ap >= 3
    ? { text: "Attack enemy tile \u2014 3 AP", type: "action" }
    : { text: "Attack \u2014 need 3 AP", type: "warn" };
}

/* ─── Game View ─── */

function GameView({ user, userData, setUserData, match, onNavigate }) {
  const ap = userData?.ap ?? 0;
  const countdown = useApRegen(user, userData, setUserData);
  const countdownStr = formatCountdown(countdown);

  const players = match.players || {};
  const tiles = match.tiles || {};
  const myPlayer = players[user.uid];
  const color = PLAYER_COLORS[myPlayer?.colorIndex ?? 0];
  const isHost = user.uid === match.hostId;

  /* ── Spectator / elimination ── */
  const [hadTiles, setHadTiles] = useState(false);
  const myTileCount = useMemo(
    () => Object.values(tiles).filter((v) => parseTile(v).owner === user.uid).length,
    [tiles, user.uid],
  );

  useEffect(() => { if (myTileCount > 0) setHadTiles(true); }, [myTileCount]);
  useEffect(() => { if (match.status === "playing") setHadTiles(false); }, [match.status]);

  const isSpectator = myPlayer && !myPlayer.isAlive;

  /* ── Fog of war visibility ── */
  const visibleSet = useMemo(() => {
    if (isSpectator || match.status === "finished") return null;
    const hasOwn = Object.values(tiles).some((v) => parseTile(v).owner === user.uid);
    if (!hasOwn) return null;
    const visible = new Set();
    Object.entries(tiles).forEach(([key, val]) => {
      if (parseTile(val).owner === user.uid) {
        visible.add(key);
        const [q, r] = key.split(",").map(Number);
        getNeighborKeys(q, r).forEach((nk) => visible.add(nk));
      }
    });
    return visible;
  }, [tiles, user.uid, isSpectator, match.status]);

  useEffect(() => {
    if (match.status !== "playing" || !myPlayer?.isAlive) return;
    if (hadTiles && myTileCount === 0) {
      eliminatePlayer(match.id, user.uid);
    }
  }, [hadTiles, myTileCount, match.status, myPlayer?.isAlive]);

  /* ── Win condition ── */
  const matchPlayersRef = useRef(new Set());
  const finishCalledRef = useRef(false);

  useEffect(() => {
    matchPlayersRef.current = new Set();
    finishCalledRef.current = false;
  }, [match.status]);

  useEffect(() => {
    if (match.status !== "playing") return;
    const owners = new Set();
    Object.values(tiles).forEach((v) => {
      const { owner } = parseTile(v);
      if (owner) { owners.add(owner); matchPlayersRef.current.add(owner); }
    });
    if (
      owners.size === 1 &&
      matchPlayersRef.current.size >= 2 &&
      !finishCalledRef.current
    ) {
      finishCalledRef.current = true;
      finishMatchFn(match.id, [...owners][0]);
    }
  }, [tiles, match.status]);

  /* ── Status message ── */
  const statusMessage = useMemo(() => {
    if (isSpectator || match.status !== "playing") return "";
    const ownsAny = Object.values(tiles).some((v) => parseTile(v).owner === user.uid);
    if (!ownsAny) return "Click any hex to claim your starting territory!";
    if (ap === 0) return "Out of AP! Next AP regenerates soon.";
    if (ap < MAX_AP) return "Click an adjacent hex to expand.";
    return "Full AP! Expand your territory.";
  }, [tiles, user.uid, ap, isSpectator, match.status]);

  /* ── Hover hint ── */
  const [hoveredHex, setHoveredHex] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const hint = useMemo(() => {
    if (!hoveredHex || isSpectator || match.status !== "playing") return null;
    return getHintForTile(hoveredHex.q, hoveredHex.r, tiles, user.uid, ap);
  }, [hoveredHex, tiles, user.uid, ap, isSpectator, match.status]);

  /* ── Claim handler ── */
  const [apShake, setApShake] = useState(false);

  const handleClaimTile = async (q, r) => {
    if (isSpectator || match.status !== "playing") return;
    const action = getTileAction(q, r, tiles, user.uid, ap);
    if (!action) {
      setApShake(true);
      setTimeout(() => setApShake(false), 400);
      return;
    }
    const key = `${q},${r}`;
    setUserData((prev) => ({ ...prev, ap: prev.ap - action.cost }));
    try {
      await claimTile(match.id, key, user.uid, ap, action.newValue, action.cost);
    } catch (err) {
      console.error("Claim failed:", err);
      setUserData((prev) => ({ ...prev, ap: prev.ap + action.cost }));
    }
  };

  /* ── Winner info ── */
  const winnerInfo = match.winnerId ? players[match.winnerId] : null;
  const winnerColor = winnerInfo ? PLAYER_COLORS[winnerInfo.colorIndex ?? 0] : "#fff";
  const winnerName = winnerInfo?.displayName || "Unknown";
  const isWinner = match.winnerId === user.uid;

  /* ── Render ── */
  return (
    <div className="game-layout">
      {isSpectator && match.status === "playing" && (
        <div className="spectator-banner">YOU WERE ELIMINATED &mdash; SPECTATING</div>
      )}

      <header className="header">
        <div className="header-left">
          <span className="header-logo">⬡</span>
          <h1 className="header-title">Hex Territory</h1>
          <span className="header-code">{match.id}</span>
        </div>

        <div className="header-center">
          {!isSpectator ? (
            <div className={`ap-display${ap >= MAX_AP ? " ap-display--full" : ""}${apShake ? " ap-display--shake" : ""}`}>
              {[...Array(5)].map((_, i) => (
                <span key={i} className={`ap-pip${i < ap ? " ap-pip--filled" : ""}`} />
              ))}
              <span className="ap-label">{ap} AP</span>
              {countdownStr && <span className="ap-timer">+1 in {countdownStr}</span>}
            </div>
          ) : (
            <span className="spectator-label">Spectating</span>
          )}
        </div>

        <div className="header-right">
          {user.photoURL && (
            <img className="avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" />
          )}
          <span className="header-name">{user.displayName || "Player"}</span>
          <span className="color-dot" style={{ backgroundColor: color }} />
          <button className="sign-out-btn" onClick={() => onNavigate("home")}>Leave</button>
        </div>
      </header>

      {!isSpectator && (hint || statusMessage) && (
        <p className={`status-msg${
          hint
            ? hint.type === "action" ? " status-msg--action"
              : hint.type === "warn" ? " status-msg--warn"
              : " status-msg--info"
            : ap === 0 ? " status-msg--warn" : ""
        }`}>
          {hint ? hint.text : statusMessage}
        </p>
      )}

      <main className="main-content">
        <div className="grid-panel">
          <HexGrid tiles={tiles} playerInfo={players} onHexClick={handleClaimTile} currentUid={user.uid} visibleSet={visibleSet} onHexHover={setHoveredHex} />
        </div>
        <aside className="sidebar">
          <Leaderboard tiles={tiles} playerInfo={players} currentUid={user.uid} />

          <div className="guide">
            <button className="guide-toggle" onClick={() => setGuideOpen((p) => !p)}>
              <span>Game Guide</span>
              <span>{guideOpen ? "\u25BE" : "\u25B8"}</span>
            </button>
            {guideOpen && (
              <div className="guide-content">
                <div className="guide-row">
                  <span className="guide-swatch" style={{ background: '#2d2d44' }} />
                  <span>Empty tile</span>
                  <span className="guide-cost">1 AP</span>
                </div>
                <div className="guide-row">
                  <span className="guide-swatch" style={{ background: color }} />
                  <span>Your tile — tap to fortify</span>
                  <span className="guide-cost">3 AP</span>
                </div>
                <div className="guide-row">
                  <span className="guide-swatch guide-swatch--fort" style={{ background: color }} />
                  <span>Fortified (extra defense)</span>
                  <span className="guide-cost">—</span>
                </div>
                <div className="guide-row">
                  <span className="guide-swatch" style={{ background: '#e74c3c' }} />
                  <span>Enemy tile — attack</span>
                  <span className="guide-cost">3 AP</span>
                </div>
                <div className="guide-row">
                  <span className="guide-swatch guide-swatch--fort" style={{ background: '#e74c3c' }} />
                  <span>Enemy fortified — break</span>
                  <span className="guide-cost">5 AP</span>
                </div>
                <div className="guide-row">
                  <span className="guide-swatch" style={{ background: '#15151f' }} />
                  <span>Fog of war (hidden)</span>
                  <span className="guide-cost">—</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {match.status === "finished" && (
        <div className="gameover-overlay">
          <div className="gameover-card">
            <h1 className="gameover-title">GAME OVER</h1>
            <div className="gameover-winner">
              <span className="gameover-swatch" style={{ backgroundColor: winnerColor }} />
              <span className="gameover-name">{isWinner ? "YOU WON!" : `${winnerName} wins!`}</span>
            </div>
            {isHost && (
              <button className="primary-btn" onClick={() => playAgain(match.id, players)}>
                Play Again
              </button>
            )}
            <button className="sign-out-btn" onClick={() => onNavigate("home")}>Leave</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
