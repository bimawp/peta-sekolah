// src/utils/urlFilters.js
const D = {
  jenjang: "Semua Jenjang",
  kecamatan: "Semua Kecamatan",
  desa: "Semua Desa",
  kondisi: "Semua Kondisi",
};
export const DEFAULT_PAGE_FILTERS = { ...D };

export function normalizeAnyAllLabel(v = "", kind = "jenjang") {
  const raw = (v ?? "").toString().trim();
  if (!raw) return D[kind] || raw;
  const up = raw.toUpperCase();
  if (up.startsWith("(SEMUA")) return D[kind] || raw.replace(/^\(|\)$/g, "");
  if (up.startsWith("SEMUA")) return D[kind];
  return raw;
}

export function getPageFiltersFromURL(locationSearch = typeof window !== "undefined" ? window.location.search : "") {
  try {
    const q = new URLSearchParams(locationSearch || "");
    const j = q.get("j") || "";
    const k = q.get("k") || "";
    const d = q.get("d") || "";
    const c = q.get("kon") || "";
    return {
      jenjang: normalizeAnyAllLabel(j || D.jenjang, "jenjang"),
      kecamatan: normalizeAnyAllLabel(k || D.kecamatan, "kecamatan"),
      desa: normalizeAnyAllLabel(d || D.desa, "desa"),
      kondisi: normalizeAnyAllLabel(c || D.kondisi, "kondisi"),
    };
  } catch {
    return { ...D };
  }
}

export function setPageFiltersToURL({ jenjang, kecamatan, desa, kondisi }, mode = "replace") {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const q = new URLSearchParams(url.search);

  const setOrDel = (key, val, def) => {
    const v = (val ?? "").toString().trim();
    if (v && v !== def) q.set(key, v);
    else q.delete(key);
  };

  setOrDel("j", jenjang, D.jenjang);
  setOrDel("k", kecamatan, D.kecamatan);
  setOrDel("d", desa, D.desa);
  setOrDel("kon", kondisi, D.kondisi);

  const next = `${url.pathname}${q.toString() ? `?${q}` : ""}${url.hash || ""}`;
  if (mode === "push") window.history.pushState({}, "", next);
  else window.history.replaceState({}, "", next);
}

const urlFilters = {
  DEFAULT_PAGE_FILTERS,
  normalizeAnyAllLabel,
  getPageFiltersFromURL,
  setPageFiltersToURL,
};
export default urlFilters;
