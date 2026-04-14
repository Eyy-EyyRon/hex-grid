import { useMemo } from "react";
import { useAuth } from "./hooks/useAuth";
import { useMap } from "./hooks/useMap";
import HexGrid from "./components/HexGrid";
import Leaderboard from "./components/Leaderboard";
import { PLAYER_COLORS, canClaimTile } from "./gameLogic";
import { db } from "./firebase";
import { doc, writeBatch } from "firebase/firestore";
import "./App.css";

function App() {
  const {
    user, userData, setUserData, loading: authLoading,
    loginGoogle, logout,
  } = useAuth();
  const { tiles, setTiles, playerInfo, loading: mapLoading } = useMap();

  const loading = authLoading || mapLoading;

  if (loading) {
    return (
      <div className="screen screen--center">
        <div className="spinner" />
        <p className="loading-text">Loading game...</p>
      </div>
    );
  }

  if (!user) {
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
              <li><strong>Claim your first tile</strong> — click any empty hex to place your starting territory.</li>
              <li><strong>Expand outward</strong> — each new tile must be adjacent to one you already own.</li>
              <li><strong>Spend Action Points</strong> — every tile costs 1 AP. You start with 5.</li>
              <li><strong>Wait and recover</strong> — once out of AP, come back later to regenerate.</li>
              <li><strong>Dominate the map</strong> — the player controlling the most hexes wins!</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const ap = userData?.ap ?? 0;
  const color = PLAYER_COLORS[userData?.colorIndex ?? 0];

  return (
    <GameView
      user={user}
      userData={userData}
      setUserData={setUserData}
      tiles={tiles}
      setTiles={setTiles}
      playerInfo={playerInfo}
      ap={ap}
      color={color}
      logout={logout}
    />
  );
}

function GameView({
  user, userData, setUserData, tiles, setTiles,
  playerInfo, ap, color, logout,
}) {
  const statusMessage = useMemo(() => {
    if (!tiles) return "";
    const ownsAny = Object.values(tiles).some((v) => v === user.uid);
    if (!ownsAny) return "Click any hex to claim your starting territory!";
    if (ap === 0) return "Out of AP! Come back later to regenerate.";
    return "Click an adjacent hex to expand your territory.";
  }, [tiles, user.uid, ap]);

  const handleClaimTile = async (q, r) => {
    if (!tiles || !userData) return;
    if (!canClaimTile(q, r, tiles, user.uid, ap)) return;

    const key = `${q},${r}`;

    setTiles((prev) => ({ ...prev, [key]: user.uid }));
    setUserData((prev) => ({ ...prev, ap: prev.ap - 1 }));

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "users", user.uid), { ap: ap - 1 });
      batch.update(doc(db, "map_chunks", "chunk_0_0"), {
        [`tiles.${key}`]: user.uid,
      });
      await batch.commit();
    } catch (err) {
      console.error("Claim failed, rolling back:", err);
      setTiles((prev) => ({ ...prev, [key]: "empty" }));
      setUserData((prev) => ({ ...prev, ap: prev.ap + 1 }));
    }
  };

  return (
    <div className="game-layout">
      <header className="header">
        <div className="header-left">
          <span className="header-logo">⬡</span>
          <h1 className="header-title">Hex Territory</h1>
        </div>

        <div className="header-center">
          <div className="ap-display">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className={`ap-pip${i < ap ? " ap-pip--filled" : ""}`}
              />
            ))}
            <span className="ap-label">{ap} AP</span>
          </div>
        </div>

        <div className="header-right">
          {user.photoURL && (
            <img
              className="avatar"
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
            />
          )}
          <span className="header-name">
            {user.displayName || "Player"}
          </span>
          <span className="color-dot" style={{ backgroundColor: color }} />
          <button className="sign-out-btn" onClick={logout}>
            Sign Out
          </button>
        </div>
      </header>

      <p className={`status-msg${ap === 0 ? " status-msg--warn" : ""}`}>
        {statusMessage}
      </p>

      <main className="main-content">
        <div className="grid-panel">
          <HexGrid
            tiles={tiles}
            playerInfo={playerInfo}
            onHexClick={handleClaimTile}
            currentUid={user.uid}
          />
        </div>

        <aside className="sidebar">
          <Leaderboard
            tiles={tiles}
            playerInfo={playerInfo}
            currentUid={user.uid}
          />
        </aside>
      </main>
    </div>
  );
}

export default App;
