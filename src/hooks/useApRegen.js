import { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { MAX_AP, AP_REGEN_MS } from "../gameLogic";

export function useApRegen(user, userData, setUserData) {
  const [countdown, setCountdown] = useState(null);
  const apRef = useRef(0);
  const lastRegenRef = useRef(null);
  const userRef = useRef(null);

  // Keep refs in sync with latest values
  useEffect(() => {
    apRef.current = userData?.ap ?? 0;
    userRef.current = user;
  }, [user, userData?.ap]);

  // Initialize lastRegenTime from userData on mount
  useEffect(() => {
    // If `lastLoginTime` is missing, AP regen can't start. Fall back to "now"
    // (best-effort sync back to Firestore) so other clients don't get stuck.
    if (!userData?.lastLoginTime) {
      if ((userData?.ap ?? 0) >= MAX_AP) return;
      if (lastRegenRef.current) return;

      const now = new Date();
      lastRegenRef.current = now;
      const uid = user?.uid;
      if (uid) {
        updateDoc(doc(db, "users", uid), { lastLoginTime: now }).catch((err) => {
          console.error("AP regen fallback write failed:", err);
        });
      }
      return;
    }

    const lt = userData.lastLoginTime;
    const parsed = lt.toDate ? lt.toDate() : new Date(lt);
    const parsedMs = parsed?.getTime?.();

    // Guard against malformed/serialized cache data.
    if (!parsedMs || Number.isNaN(parsedMs)) return;

    // Keep the regen timer aligned with the latest `lastLoginTime` from auth.
    lastRegenRef.current = parsed;
  }, [userData?.lastLoginTime, userData?.ap, user?.uid]);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!userRef.current || !lastRegenRef.current) return;

      if (apRef.current >= MAX_AP) {
        setCountdown(null);
        return;
      }

      const now = Date.now();
      const elapsed = now - lastRegenRef.current.getTime();

      if (elapsed >= AP_REGEN_MS) {
        const newAp = Math.min(apRef.current + 1, MAX_AP);
        lastRegenRef.current = new Date(
          lastRegenRef.current.getTime() + AP_REGEN_MS
        );
        apRef.current = newAp;

        setUserData((prev) => ({ ...prev, ap: newAp }));

        try {
          await updateDoc(doc(db, "users", userRef.current.uid), {
            ap: newAp,
            lastLoginTime: lastRegenRef.current,
          });
        } catch (err) {
          console.error("AP regen write failed:", err);
        }

        if (newAp >= MAX_AP) {
          setCountdown(null);
        }
      } else {
        setCountdown(Math.ceil((AP_REGEN_MS - elapsed) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [setUserData]);

  return countdown;
}
