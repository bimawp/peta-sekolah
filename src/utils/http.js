// src/utils/http.js
// Helper fetch JSON dgn Cache Storage + timeout + SWR (stale-while-revalidate)
// Drop-in: export { httpJSON, purgeSessionPrefix }

const DEFAULT_TTL = 60 * 60 * 24 * 14; // 14 hari (detik)
const CACHE_NAME = "ps-json-v2"; // bump versi kalau format meta berubah
const SS_PREFIX = "ps:http:";    // sessionStorage meta prefix

// --- util internal ---
const now = () => Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const safeJSON = async (res) => {
  try { return await res.clone().json(); } catch { return null; }
};
const toMs = (sec) => (Number.isFinite(sec) ? sec * 1000 : 0);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Untuk mencegah revalidate bersamaan untuk URL yang sama
const revalidateLocks = new Map(); // url -> Promise in-flight

function ssKey(url) {
  // meta per-entry di sessionStorage (ts, etag, lastModified)
  return `${SS_PREFIX}${url}`;
}

/**
 * Simpan meta SWR (timestamp + validator) ke sessionStorage
 */
function writeMeta(url, meta) {
  try {
    sessionStorage.setItem(ssKey(url), JSON.stringify(meta));
  } catch {}
}

function readMeta(url) {
  try {
    const raw = sessionStorage.getItem(ssKey(url));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Ambil response JSON dari Cache Storage jika:
 * - Ada objek tersimpan
 * - TTL belum kedaluwarsa (berdasarkan ts meta)
 */
async function readCacheIfFresh(url, ttlSec) {
  if (!("caches" in window)) return null;
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match(url, { ignoreSearch: true, ignoreVary: true });
  if (!res) return null;

  const meta = readMeta(url);
  if (!meta?.ts) return null;
  const ageMs = now() - meta.ts;
  if (ageMs > toMs(ttlSec)) return null;

  const json = await safeJSON(res);
  return json;
}

async function writeCache(url, res) {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, res.clone());
  } catch {}
}

/**
 * Fetch network dengan dukungan ETag/Last-Modified.
 * - Jika meta tersedia, kirim If-None-Match / If-Modified-Since
 * - Mengembalikan { status, json, notModified, etag, lastModified }
 */
async function fetchWithValidators(url, { signal, timeoutMs }) {
  const meta = readMeta(url) || {};
  const headers = new Headers();
  if (meta.etag) headers.set("If-None-Match", meta.etag);
  if (meta.lastModified) headers.set("If-Modified-Since", meta.lastModified);

  let controller = null;
  let timer = null;
  if (!signal && timeoutMs > 0) {
    controller = new AbortController();
    timer = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);
  }
  const finalSignal = signal || controller?.signal;

  try {
    const started = now();
    const res = await fetch(url, { headers, signal: finalSignal, cache: "no-store" });
    const dur = now() - started;
    // console.debug("[httpJSON] network", { url, status: res.status, dur });

    const etag = res.headers.get("ETag") || null;
    const lastModified = res.headers.get("Last-Modified") || null;

    if (res.status === 304) {
      return { status: 304, json: null, notModified: true, etag, lastModified };
    }

    if (!res.ok) {
      // tetap coba baca body untuk error log
      let msg = `${res.status} ${res.statusText}`;
      const body = await safeJSON(res);
      if (body && typeof body === "object") {
        msg += ` | ${JSON.stringify(body).slice(0, 400)}`;
      }
      throw new Error(msg);
    }

    const json = await res.clone().json();
    // tulis ke cache dan meta
    await writeCache(url, res);
    writeMeta(url, { ts: now(), etag, lastModified });
    return { status: res.status, json, notModified: false, etag, lastModified };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * httpJSON(url, { ttl, revalidate, signal, timeout })
 * Mekanisme:
 * 1) Coba cache fresh (TTL) → return cepat.
 * 2) Kalau ada cache kadaluarsa → tetap return stale, sambil revalidate di background.
 * 3) Kalau tak ada cache → fetch network. Error → fallback stale (jika ada).
 */
export async function httpJSON(
  url,
  { ttl = DEFAULT_TTL, revalidate = true, signal, timeout = 12000 } = {}
) {
  // 1) coba cache (fresh)
  const fresh = await readCacheIfFresh(url, ttl);
  if (fresh !== null) {
    return { data: fresh, stale: false, revalidated: false };
  }

  // 2) cek apakah ada cache (meski kadaluarsa) untuk fallback stale-on-error
  let cachedJson = null;
  if ("caches" in window) {
    try {
      const cache = await caches.open(CACHE_NAME);
      const res = await cache.match(url, { ignoreSearch: true, ignoreVary: true });
      cachedJson = res ? await safeJSON(res) : null;
    } catch {}
  }

  // 3) lakukan network fetch (dgn validator)
  try {
    const { json, notModified } = await fetchWithValidators(url, {
      signal,
      timeoutMs: clamp(Number(timeout) || 0, 0, 30000),
    });

    if (notModified) {
      const current = cachedJson ?? (await readCacheIfFresh(url, Infinity));
      return { data: current ?? null, stale: false, revalidated: true };
    }
    return { data: json, stale: false, revalidated: true };
  } catch (err) {
    if (cachedJson !== null) {
      return { data: cachedJson, stale: true, revalidated: false, error: err };
    }
    return { data: null, stale: true, revalidated: false, error: err };
  } finally {
    // 4) background revalidate
    if (revalidate) {
      if (!revalidateLocks.has(url)) {
        const p = (async () => {
          try {
            const { notModified } = await fetchWithValidators(url, {
              signal: undefined,
              timeoutMs: 20000,
            });
            if (!notModified) {
              // meta & cache sudah ditulis di fetchWithValidators
            }
          } catch {
            // diam
          } finally {
            await sleep(50);
            revalidateLocks.delete(url);
          }
        })();
        revalidateLocks.set(url, p);
      }
    }
  }
}

/**
 * Hapus meta sessionStorage lama dengan prefix tertentu (housekeeping)
 */
export function purgeSessionPrefix(prefix = SS_PREFIX, maxAgeMs = 7 * 24 * 3600 * 1000) {
  const nowTs = now();
  const keys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (k && k.startsWith(prefix)) keys.push(k);
  }
  for (const key of keys) {
    try {
      const { ts } = JSON.parse(sessionStorage.getItem(key) || "{}");
      if (!ts || nowTs - ts > maxAgeMs) sessionStorage.removeItem(key);
    } catch {
      sessionStorage.removeItem(key);
    }
  }
}
