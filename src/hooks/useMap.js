import { useState, useEffect, useRef } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { generateGrid } from "../gameLogic";

export function useMap() {
  const [tiles, setTiles] = useState(null);
  const [playerInfo, setPlayerInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef({});

  useEffect(() => {
    const chunkRef = doc(db, "map_chunks", "chunk_0_0");

    const unsubscribe = onSnapshot(chunkRef, async (snap) => {
      if (snap.exists()) {
        setTiles(snap.data().tiles);
      } else {
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

  useEffect(() => {
    if (!tiles) return;

    const uids = [
      ...new Set(Object.values(tiles).filter((v) => v !== "empty")),
    ];
    const missing = uids.filter((uid) => !(uid in cacheRef.current));
    if (missing.length === 0) return;

    Promise.all(
      missing.map((uid) => getDoc(doc(db, "users", uid)))
    ).then((snaps) => {
      const newEntries = {};
      snaps.forEach((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          newEntries[snap.id] = {
            colorIndex: d.colorIndex,
            displayName: d.displayName || "Unknown",
            photoURL: d.photoURL || "",
          };
        }
      });
      cacheRef.current = { ...cacheRef.current, ...newEntries };
      setPlayerInfo({ ...cacheRef.current });
    });
  }, [tiles]);

  return { tiles, setTiles, playerInfo, loading };
}
