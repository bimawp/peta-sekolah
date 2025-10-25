// src/hooks/useCachedJson.js
import { useEffect, useState, useRef } from "react";

/**
 * Stale-While-Revalidate fetcher untuk JSON statis di /public
 * - First paint cepat: baca dari Cache Storage (jika ada)
 * - Lalu revalidate dari network, update state + cache
 */
export function useCachedJson(url, { parse = (x) => x, cacheName = "ps-cache-v1" } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    (async () => {
      setLoading(true);

      // 1) coba dari Cache Storage
      try {
        const hasCaches = "caches" in window;
        if (hasCaches) {
          const cache = await caches.open(cacheName);
          const cached = await cache.match(url, { ignoreVary: true, ignoreSearch: true });
          if (cached) {
            const json = await cached.json();
            if (mounted.current) {
              setData(parse(json));
              setLoading(false);
              setStale(true); // menandai UI pakai data stale dulu
            }
          }
        }
      } catch { /* ignore */ }

      // 2) revalidate via network
      try {
        const res = await fetch(url, { cache: "no-cache" });
        if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
        const json = await res.json();
        if (mounted.current) {
          setData(parse(json));
          setLoading(false);
          setStale(false);
        }
        // 3) tulis balik ke cache
        if ("caches" in window) {
          const cache = await caches.open(cacheName);
          await cache.put(
            url,
            new Response(JSON.stringify(json), { headers: { "Content-Type": "application/json" } })
          );
        }
      } catch (e) {
        // kalau belum ada cache & network gagal
        if (mounted.current && data == null) setLoading(false);
        // optional: console.warn(e);
      }
    })();

    return () => { mounted.current = false; };
  }, [url, parse, cacheName]); // ikutkan parse/cacheName agar deterministik

  return { data, loading, stale };
}
