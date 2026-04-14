import { useAuth } from "./hooks/useAuth";
import { useMap } from "./hooks/useMap";
import HexGrid from "./components/HexGrid";
import { PLAYER_COLORS, canClaimTile } from "./gameLogic";
import { db } from "./firebase";
import { doc, writeBatch, updateDoc, serverTimestamp } from "firebase/firestore";
import "./App.css";

function App() {
  const {
    user, userData, setUserData, loading: authLoading,
    loginAnonymous, loginGoogle,
  } = useAuth();
  const { tiles, setTiles, uidColorMap, loading: mapLoading } = useMap();

  const loading = authLoading || mapLoading;

  if (loading) {
    return (
      <div className="screen screen--center">
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="screen screen--center">
        <h1 className="title">Hex Territory</h1>
        <p className="subtitle">Capture the grid. Claim your territory.</p>

        <div className="login-buttons">
          <button className="play-btn" onClick={loginGoogle}>
            Sign in with Google
          </button>
          <button className="play-btn play-btn--ghost" onClick={loginAnonymous}>
            Play as Guest
          </button>
        </div>

        <div className="how-to-play">
          <h2>How to Play</h2>
          <ol>
            <li><strong>Claim your first tile</strong> — click any empty hex on the grid to place your starting territory.</li>
            <li><strong>Expand outward</strong> — each new tile must be adjacent to one you already own.</li>
            <li><strong>Spend Action Points (AP)</strong> — every tile costs 1 AP. You start with 5.</li>
            <li><strong>Wait and recover</strong> — once you run out, come back later. Your AP regenerates over time.</li>
            <li><strong>Dominate the map</strong> — the player who controls the most hexes wins!</li>
          </ol>
        </div>
      </div>
    );
  }

  const ap = userData?.ap ?? 0;
  const color = PLAYER_COLORS[userData?.colorIndex ?? 0];

  const handleClaimTile = async (q, r) => {
    if (!tiles || !userData) return;
    if (!canClaimTile(q, r, tiles, user.uid, ap)) {
      console.log(`Cannot claim (${q},${r}): invalid move or 0 AP`);
      return;
    }

    const key = `${q},${r}`;

    // Optimistic UI update
    setTiles((prev) => ({ ...prev, [key]: user.uid }));
    setUserData((prev) => ({ ...prev, ap: prev.ap - 1 }));

    try {
      const batch = writeBatch(db);
      batch.update(doc(db, "users", user.uid), {
        ap: ap - 1,
      });
      batch.update(doc(db, "map_chunks", "chunk_0_0"), {
        [`tiles.${key}`]: user.uid,
      });
      await batch.commit();
    } catch (err) {
      console.error("Claim failed, rolling back:", err);
      // Rollback optimistic update
      setTiles((prev) => ({ ...prev, [key]: "empty" }));
      setUserData((prev) => ({ ...prev, ap: prev.ap + 1 }));
    }
  };

  const handlePassTime = async () => {
    setUserData((prev) => ({ ...prev, ap: 5 }));
    try {
      await updateDoc(doc(db, "users", user.uid), {
        ap: 5,
        lastLoginTime: serverTimestamp(),
      });
    } catch (err) {
      console.error("Pass time failed:", err);
      setUserData((prev) => ({ ...prev, ap: userData.ap }));
    }
  };

  return (
    <div className="screen">
      <h1 className="title">Hex Territory</h1>

      <div className="game-bar">
        <div className="user-info">
          <span className="color-swatch" style={{ backgroundColor: color }} />
          <span>
            <strong>{user.displayName || `Guest ${user.uid.slice(0, 6)}`}</strong>
          </span>
        </div>

        <div className="ap-display">
          {[...Array(5)].map((_, i) => (
            <span
              key={i}
              className={`ap-pip${i < ap ? " ap-pip--filled" : ""}`}
            />
          ))}
          <span className="ap-label">{ap} AP</span>
        </div>

        <button className="pass-time-btn" onClick={handlePassTime}>
          Pass Time (Dev)
        </button>
      </div>

      <HexGrid
        tiles={tiles}
        uidColorMap={uidColorMap}
        onHexClick={handleClaimTile}
        currentUid={user.uid}
      />
    </div>
  );
}

export default App;
