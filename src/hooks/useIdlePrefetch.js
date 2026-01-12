// src/hooks/useIdlePrefetch.js
// Prefetch saat browser idle + cache promise agar tak dobel

const prefetchCache = new Map();

function runIdle(fn) {
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(fn, { timeout: 2000 });
  }
  return setTimeout(fn, 0);
}

export function prefetchJSON(url) {
  if (!url) return;
  if (prefetchCache.has(url)) return prefetchCache.get(url);
  const p = fetch(url, { cache: "force-cache" }).catch(() => {});
  prefetchCache.set(url, p);
  return p;
}

export function prefetchChunk(importer) {
  try {
    if (typeof importer === "function") importer();
  } catch {/* ignore */}
}

export function useIdlePrefetch() {
  // Kembalikan helper agar bisa dipanggil dari Layout
  return (tasks = []) => {
    runIdle(() => {
      for (const t of tasks) {
        if (!t) continue;
        if (t.type === "json") prefetchJSON(t.url);
        if (t.type === "chunk") prefetchChunk(t.importer);
      }
    });
  };
}
