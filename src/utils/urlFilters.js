// src/utils/urlFilters.js
const D = {
  jenjang: "Semua Jenjang",
  kecamatan: "Semua Kecamatan",
  desa: "Semua Desa",
  kondisi: "Semua Kondisi",
};
export const DEFAULT_PAGE_FILTERS = { ...D };

// Ambil dari ?j=SD&k=KADUNGORA&d=CIMAREME (kunci pendek agar rapi)
export function getPageFiltersFromURL(locationSearch = window.location.search) {
  const q = new URLSearchParams(locationSearch);
  const j = q.get("j") || "";
  const k = q.get("k") || "";
  const d = q.get("d") || "";
  // (opsional) kondisi halaman ini belum punya UI, tapi kita dukung kalau nanti ditambah
  const kon = q.get("kon") || "";

  return {
    jenjang: j || D.jenjang,
    kecamatan: k || D.kecamatan,
    desa: d || D.desa,
    kondisi: kon || D.kondisi,
  };
}

// Tulis balik ke URL tanpa reload
export function setPageFiltersToURL(filters = {}, mode = "replace") {
  const { jenjang, kecamatan, desa, kondisi } = { ...DEFAULT_PAGE_FILTERS, ...filters };

  const url = new URL(window.location.href);
  const q = url.searchParams;

  // set kalau bukan default, hapus kalau default
  const setOrDel = (key, val, def) => {
    if (val && val !== def) q.set(key, val);
    else q.delete(key);
  };

  setOrDel("j", jenjang, D.jenjang);
  setOrDel("k", kecamatan, D.kecamatan);
  setOrDel("d", desa, D.desa);
  // kondisi belum dipakai di halaman ini, tetap kita tulis kalau ada:
  if (kondisi && kondisi !== D.kondisi) q.set("kon", kondisi); else q.delete("kon");

  const next = `${url.pathname}${q.toString() ? `?${q}` : ""}${url.hash || ""}`;
  if (mode === "push") window.history.pushState({}, "", next);
  else window.history.replaceState({}, "", next);
}
