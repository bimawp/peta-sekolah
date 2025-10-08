// src/components/common/Map/mapUtils.js
import L from "leaflet";
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// FIX ikon Leaflet tidak muncul di Vite
L.Icon.Default.mergeOptions({
  iconRetinaUrl: marker2x,
  iconUrl: marker1x,
  shadowUrl: markerShadow
});

export const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const norm = (s) => (s ?? "").toString().trim().replace(/\s+/g, " ").toUpperCase();

export const normalizeAnyAll = (v = "") => {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
  const up = s.toUpperCase();
  if (up.startsWith("(SEMUA") || up.startsWith("SEMUA")) return "";
  return s;
};

export const kecKey = (name) => {
  if (!name) return "";
  let x = name.toString().toUpperCase();
  x = x.replace(/\bKEC(?:AMATAN)?\.?\b/g, "");
  x = x.replace(/[^A-Z]/g, "");
  return x;
};

const toNumber = (x) => Number((x ?? "").toString().replace(",", "."));

export const normalizeLatLng = (pair) => {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  let a = toNumber(pair[0]), b = toNumber(pair[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const inLat = (x) => x >= -12 && x <= 6;
  const inLng = (x) => x >= 95 && x <= 141;
  if (inLng(a) && inLat(b)) return [b, a];
  if (inLat(a) && inLng(b)) return [a, b];
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
  if (inLng(b) && inLat(a)) return [a, b];
  if (inLng(a) && inLat(b)) return [b, a];
  return [a, b];
};

export const getLatLng = (s) => {
  const cand =
    s?.coordinates ??
    (s?.lat != null && s?.lng != null ? [s.lat, s.lng] : null) ??
    (s?.latitude != null && s?.longitude != null ? [s.latitude, s.longitude] : null);
  return normalizeLatLng(cand);
};

export const groupBy = (arr, keyFn) =>
  arr.reduce((acc, it) => { const k = keyFn(it); (acc[k] ??= []).push(it); return acc; }, {});

export const shortLevel = (lvl) => {
  if (!lvl) return "Lainnya";
  const s = lvl.toString().toUpperCase().replace(/\s+/g, "");
  if (s.includes("PAUD")) return "PAUD";
  if (s === "SD" || s.includes("SEKOLAHDASAR")) return "SD";
  if (s === "SMP" || s.includes("SEKOLAHMENENGAHPERTAMA")) return "SMP";
  if (s.includes("PKBM")) return "PKBM";
  return "Lainnya";
};

export const makeKecamatanNumberIcon = (count, sizeClass, styles) =>
  L.divIcon({
    className: "",
    html: `<div class="${styles.kecamatanCircle} ${sizeClass || ""}">${count}</div>`,
    iconSize: [0, 0],
    popupAnchor: [0, -12]
  });

export const applyFilters = (schools, filters) => {
  let { jenjang = "", kecamatan = "", desa = "", kondisi = "" } = filters || {};
  const j = (jenjang || "").toString().trim();
  const k = kecKey(normalizeAnyAll(kecamatan || ""));
  const d = norm(normalizeAnyAll(desa || ""));
  const kc = (kondisi || "").toString().trim(); // kondisi opsional

  return (schools || []).filter((s) => {
    const sj = shortLevel(s?.jenjang);
    const skec = kecKey(s?.kecamatan);
    const sdesa = norm(s?.desa || s?.village || "");
    if (j && !j.startsWith("(Semua") && sj !== j) return false;
    if (k && skec !== k) return false;
    if (d && sdesa !== d) return false;
    // latlng wajib utk pin map
    const ll = getLatLng(s);
    if (!ll) return false;
    return true;
  });
};

export const uniqueBy = (arr = [], keyFn) => {
  const m = new Map();
  for (const it of arr) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, it);
  }
  return Array.from(m.values());
};
