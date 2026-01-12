// Prefetch chunk (import()) & JSON saat idle/low-priority.
// Aman di Vite dan bisa dipakai dari Layout / Sidebar.
import { useCallback } from "react";

const rIC =
  typeof window !== "undefined" && ("requestIdleCallback" in window)
    ? window.requestIdleCallback
    : (cb) => setTimeout(() => cb({ timeRemaining: () => 50 }), 350);

const inFlight = new Set();

export function useIdlePrefetch() {
  const prefetch = useCallback((items) => {
    if (!Array.isArray(items) || items.length === 0) return;

    rIC(() => {
      items.forEach((it, idx) => {
        // throttle dikit biar gak numpuk sekaligus
        setTimeout(async () => {
          try {
            if (it.type === "chunk" && typeof it.importer === "function") {
              const key = `chunk:${it.importer.toString()}`;
              if (inFlight.has(key)) return;
              inFlight.add(key);
              await it.importer().catch(() => {});
              setTimeout(() => inFlight.delete(key), 3000);
              return;
            }

            if (it.type === "json" && typeof it.url === "string") {
              const key = `json:${it.url}`;
              if (inFlight.has(key)) return;
              inFlight.add(key);
              // low priority fetch
              await fetch(it.url, { cache: "force-cache" }).catch(() => {});
              setTimeout(() => inFlight.delete(key), 3000);
              return;
            }
          } catch {}
        }, idx * 60);
      });
    });
  }, []);

  return prefetch;
}
