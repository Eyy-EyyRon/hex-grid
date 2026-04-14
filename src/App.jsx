import { useAuth } from "./hooks/useAuth";
import HexGrid from "./components/HexGrid";
import "./App.css";

const PLAYER_COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f1c40f",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#e84393",
];

function App() {
  const { user, userData, loading, login } = useAuth();

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
        <button className="play-btn" onClick={login}>
          Play Now
        </button>
      </div>
    );
  }

  const color = PLAYER_COLORS[userData?.colorIndex ?? 0];

  return (
    <div className="screen">
      <h1 className="title">Hex Territory</h1>
      <div className="user-info">
        <span
          className="color-swatch"
          style={{ backgroundColor: color }}
        />
        <span>
          Player: <strong>{user.uid.slice(0, 8)}...</strong>
        </span>
        <span className="ap-badge">AP: {userData?.ap ?? 0}</span>
      </div>
      <HexGrid />
    </div>
  );
}

export default App;
