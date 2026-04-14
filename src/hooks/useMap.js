import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { generateGrid } from "../gameLogic";

export function useMap() {
  const [tiles, setTiles] = useState(null);
  const [uidColorMap, setUidColorMap] = useState({});
  const [loading, setLoading] = useState(true);
  const colorCacheRef = useRef({});

  useEffect(() => {
    const chunkRef = doc(db, "map_chunks", "chunk_0_0");

    const unsubscribe = onSnapshot(chunkRef, async (snap) => {
      if (snap.exists()) {
        setTiles(snap.data().tiles);
      } else {
        // Seed the chunk with all-empty tiles
        const emptyTiles = {};
        generateGrid().forEach(({ q, r }) => {
          emptyTiles[`${q},${r}`] = "empty";
        });
        await setDoc(chunkRef, { tiles: emptyTiles });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Fetch colorIndex for any new UIDs that appear in tiles
  useEffect(() => {
    if (!tiles) return;

    const uids = [
      ...new Set(Object.values(tiles).filter((v) => v !== "empty")),
    ];
    const missing = uids.filter((uid) => !(uid in colorCacheRef.current));
    if (missing.length === 0) return;

    Promise.all(
      missing.map((uid) => getDoc(doc(db, "users", uid)))
    ).then((snaps) => {
      const newEntries = {};
      snaps.forEach((snap) => {
        if (snap.exists()) {
          newEntries[snap.id] = snap.data().colorIndex;
        }
      });
      colorCacheRef.current = { ...colorCacheRef.current, ...newEntries };
      setUidColorMap({ ...colorCacheRef.current });
    });
  }, [tiles]);

  return { tiles, setTiles, uidColorMap, loading };
}
