// (SAMA seperti yang terakhir aku kirim — tidak diubah)
import L from "leaflet";
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

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

export const GARUT_BOUNDS = { MIN_LAT: -7.70, MAX_LAT: -6.95, MIN_LNG: 107.25, MAX_LNG: 108.20 };
export const GARUT_LEAFLET_BOUNDS = L.latLngBounds(
  L.latLng(GARUT_BOUNDS.MIN_LAT, GARUT_BOUNDS.MIN_LNG),
  L.latLng(GARUT_BOUNDS.MAX_LAT, GARUT_BOUNDS.MAX_LNG)
);

const __isLat = (x) => Number.isFinite(x) && x >= -90 && x <= 90;
const __isLng = (x) => Number.isFinite(x) && x >= -180 && x <= 180;
const __notZero = (lat, lng) => !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001);
const __inIndonesia = (lat, lng) => __isLat(lat) && __isLng(lng) && __notZero(lat, lng) && lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141;
export const __inGarut = (lat, lng) => __isLat(lat) && __isLng(lng) && __notZero(lat, lng) &&
  lat >= GARUT_BOUNDS.MIN_LAT && lat <= GARUT_BOUNDS.MAX_LAT &&
  lng >= GARUT_BOUNDS.MIN_LNG && lng <= GARUT_BOUNDS.MAX_LNG;

export const normalizeLatLng = (pair) => {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const a = Number(pair[0]); const b = Number(pair[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  if (__isLat(a) && __isLng(b)) return [a, b];
  if (a >= 95 && a <= 141 && b >= -11 && b <= 6) return [b, a];
  return null;
};

export const getLatLng = (s) => {
  if (s?.lat != null && s?.lng != null) {
    const lat = toNumber(s.lat), lng = toNumber(s.lng);
    if (__isLat(lat) && __isLng(lng)) return [lat, lng];
  }
  if (s?.latitude != null && s?.longitude != null) {
    const lat = toNumber(s.latitude), lng = toNumber(s.longitude);
    if (__isLat(lat) && __isLng(lng)) return [lat, lng];
  }
  if (Array.isArray(s?.coordinates) && s.coordinates.length >= 2) return normalizeLatLng(s.coordinates);
  return null;
};

export const getLatLngSafe = (row) => {
  const ll = getLatLng(row);
  if (!Array.isArray(ll) || ll.length !== 2) return null;
  const lat = Number(ll[0]), lng = Number(ll[1]);
  if (!__inIndonesia(lat, lng)) return null;
  return __inGarut(lat, lng) ? [lat, lng] : null;
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
  L.divIcon({ className: "", html: `<div class="${styles.kecamatanCircle} ${sizeClass || ""}">${count}</div>`, iconSize: [0, 0], popupAnchor: [0, -12] });

export const applyFilters = (schools, filters) => {
  let { jenjang = "", kecamatan = "", desa = "" } = filters || {};
  const j = (jenjang || "").toString().trim();
  const k = kecKey(normalizeAnyAll(kecamatan || ""));
  const d = norm(normalizeAnyAll(desa || ""));
  return (schools || []).filter((s) => {
    const sj = shortLevel(s?.jenjang);
    const skec = kecKey(s?.kecamatan);
    const sdesa = norm(s?.desa || s?.village || "");
    if (j && !j.startsWith("(Semua") && sj !== j) return false;
    if (k && skec !== k) return false;
    if (d && sdesa !== d) return false;
    return true;
  });
};
export const uniqueBy = (arr = [], keyFn) => { const m = new Map(); for (const it of arr) { const k = keyFn(it); if (!m.has(k)) m.set(k, it); } return Array.from(m.values()); };
