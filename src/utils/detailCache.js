// src/utils/detailCache.js
const KEY = (npsn) => `school_detail_cache:${String(npsn || '').trim()}`;

export function cacheDetailRow(row) {
  try {
    if (!row?.npsn) return;
    sessionStorage.setItem(KEY(row.npsn), JSON.stringify(row));
  } catch (_) {}
}

export function readCachedDetail(npsn) {
  try {
    if (!npsn) return null;
    const raw = sessionStorage.getItem(KEY(npsn));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

export function clearCachedDetail(npsn) {
  try {
    if (!npsn) return;
    sessionStorage.removeItem(KEY(npsn));
  } catch (_) {}
}
