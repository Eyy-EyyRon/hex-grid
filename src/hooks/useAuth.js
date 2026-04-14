import { useState, useEffect } from "react";
import {
  signInWithPopup,
  signInWithRedirect,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { MAX_AP, AP_REGEN_MS } from "../gameLogic";

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

const googleProvider = new GoogleAuthProvider();

const CACHE_KEY = "hex_userData_";

function cacheUserData(uid, data) {
  try {
    const serializable = {
      ...data,
      lastLoginTime: data.lastLoginTime instanceof Date
        ? data.lastLoginTime.getTime()
        : data.lastLoginTime?.toDate
          ? data.lastLoginTime.toDate().getTime()
          : data.lastLoginTime,
    };
    localStorage.setItem(CACHE_KEY + uid, JSON.stringify(serializable));
  } catch (_) { /* ignore storage errors */ }
}

function loadCachedUserData(uid) {
  try {
    const raw = localStorage.getItem(CACHE_KEY + uid);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.lastLoginTime) {
      data.lastLoginTime = new Date(data.lastLoginTime);
    }
    return data;
  } catch (_) { return null; }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.isAnonymous) {
        signOut(auth);
        return;
      }
      if (firebaseUser) {
        setUser(firebaseUser);

        // Instantly show cached data so UI is not blocked
        const cached = loadCachedUserData(firebaseUser.uid);
        if (cached) setUserData(cached);
        setLoading(false);

        // Hydrate from Firestore in the background
        ensureUserDocument(
          firebaseUser.uid,
          firebaseUser.displayName,
          firebaseUser.photoURL
        ).then((freshData) => {
          setUserData(freshData);
          cacheUserData(firebaseUser.uid, freshData);
        });
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const loginGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      if (
        err.code === "auth/cancelled-popup-request" ||
        err.code === "auth/popup-blocked" ||
        err.code === "auth/popup-closed-by-user"
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr) {
          console.error("Google redirect sign-in failed:", redirectErr);
        }
      } else {
        console.error("Google sign-in failed:", err);
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return { user, userData, setUserData, loading, loginGoogle, logout };
}

async function ensureUserDocument(uid, displayName, photoURL) {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data();
    const updates = {};

    if (data.displayName !== displayName || data.photoURL !== photoURL) {
      updates.displayName = displayName || "Unknown";
      updates.photoURL = photoURL || "";
    }

    // Calculate offline AP regen
    let ap = data.ap;
    let lastLoginTime = data.lastLoginTime;

    if (ap < MAX_AP && lastLoginTime) {
      const lastTime = lastLoginTime.toDate
        ? lastLoginTime.toDate()
        : new Date(lastLoginTime);
      const elapsed = Date.now() - lastTime.getTime();
      const earned = Math.floor(elapsed / AP_REGEN_MS);

      if (earned > 0) {
        ap = Math.min(ap + earned, MAX_AP);
        lastLoginTime = new Date(lastTime.getTime() + earned * AP_REGEN_MS);
        updates.ap = ap;
        updates.lastLoginTime = lastLoginTime;
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(userRef, updates);
    }

    return {
      ...data,
      ap,
      lastLoginTime,
      displayName: displayName || data.displayName || "Unknown",
      photoURL: photoURL || data.photoURL || "",
    };
  }

  const newUser = {
    colorIndex: Math.floor(Math.random() * PLAYER_COLORS.length),
    ap: MAX_AP,
    lastLoginTime: serverTimestamp(),
    displayName: displayName || "Unknown",
    photoURL: photoURL || "",
  };

  await setDoc(userRef, newUser);
  return { ...newUser, lastLoginTime: new Date() };
}
