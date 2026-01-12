// src/components/common/Map/mapUtils.js - VERSI DEFINITIF (label di ikon kecamatan + center akurat)

import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/* ======================================================================
   1. KONFIGURASI ICON DEFAULT LEAFLET
   ====================================================================== */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ======================================================================
   2. KONFIGURASI BATAS WILAYAH (GARUT)
   ====================================================================== */
export const GARUT_BOUNDS = {
  MIN_LAT: -7.85,
  MAX_LAT: -6.5,
  MIN_LNG: 107.15,
  MAX_LNG: 108.3,
};

export const GARUT_LEAFLET_BOUNDS = L.latLngBounds(
  L.latLng(GARUT_BOUNDS.MIN_LAT, GARUT_BOUNDS.MIN_LNG),
  L.latLng(GARUT_BOUNDS.MAX_LAT, GARUT_BOUNDS.MAX_LNG)
);

/* ======================================================================
   3. ICON GENERATORS
   ====================================================================== */
export const createClusterIcon = (count) => {
  const html = `<div class="cluster-icon">${count}</div>`;
  return L.divIcon({
    html,
    className: "cluster-icon",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

/**
 * Ikon Angka Kecamatan:
 * - Angka di lingkaran (existing CSS: styles.kecamatanCircle)
 * - Label kecamatan tepat di atas lingkaran (dekat)
 * - Lingkaran benar-benar CENTER di titik marker (pakai transform)
 *
 * Backward compatible:
 * - Pemanggilan lama: makeKecamatanNumberIcon(count, sizeClass, styles)
 * - Pemanggilan baru: makeKecamatanNumberIcon(count, label, styles, sizeClassOptional)
 */
export const makeKecamatanNumberIcon = (count, labelOrSize, styles, maybeSizeClass) => {
  const raw2 = (labelOrSize ?? "").toString();
  const raw4 = (maybeSizeClass ?? "").toString();

  // Deteksi kompatibilitas:
  // - Jika arg ke-4 ada => arg ke-2 dianggap label, arg ke-4 sizeClass
  // - Jika arg ke-4 kosong:
  //    - labelOrSize pendek (<=6, tanpa spasi) => anggap sizeClass (cara lama)
  //    - selain itu => anggap label (cara baru)
  const isShortToken =
    raw2.length > 0 &&
    raw2.length <= 6 &&
    !raw2.includes(" ") &&
    /^[a-z0-9_-]+$/i.test(raw2);

  const label = raw4 ? raw2 : isShortToken ? "" : raw2;
  const sizeClass = raw4 ? raw4 : isShortToken ? raw2 : "";

  const circleClass = styles?.kecamatanCircle || "kecamatan-circle";
  const labelClass = styles?.kecLabel || ""; // pakai style label yang sudah ada

  // Wrapper:
  // - transform translate(-50%, -50%) membuat lingkaran tepat di tengah titik marker
  // - label diposisikan absolute di atas lingkaran, tidak menambah tinggi layout (tidak geser anchor)
  const html = `
    <div style="position:relative; transform: translate(-50%, -50%); display:inline-block;">
      <div class="${circleClass} ${sizeClass || ""}">${count}</div>
      ${
        label
          ? `<div class="${labelClass}" style="
                position:absolute;
                left:50%;
                bottom:100%;
                transform: translateX(-50%);
                margin-bottom:4px;
                white-space:nowrap;
                pointer-events:none;
              ">
              <div>${label}</div>
            </div>`
          : ""
      }
    </div>
  `;

  return L.divIcon({
    className: "",
    html,
    iconSize: [0, 0], // ukuran dari konten
    iconAnchor: [0, 0], // anchor dikompensasi oleh transform
    popupAnchor: [0, -18],
  });
};

/* ======================================================================
   4. HELPER STRING & KEY
   ====================================================================== */
export const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

const toNumber = (x) => Number((x ?? "").toString().replace(",", "."));

export const norm = (s) =>
  (s ?? "").toString().trim().replace(/\s+/g, " ").toUpperCase();

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

export const shortLevel = (lvl) => {
  if (!lvl) return "Lainnya";
  const s = lvl.toString().toUpperCase().replace(/\s+/g, "");
  if (s.includes("PAUD") || s.includes("TK") || s.includes("KB")) return "PAUD";
  if (s === "SD" || s.includes("SEKOLAHDASAR")) return "SD";
  if (s === "SMP" || s.includes("SEKOLAHMENENGAHPERTAMA")) return "SMP";
  if (s.includes("PKBM")) return "PKBM";
  return "Lainnya";
};

/* ======================================================================
   5. HELPER GEOLOKASI (KOORDINAT)
   ====================================================================== */
const __isLat = (x) => Number.isFinite(x) && x >= -90 && x <= 90;
const __isLng = (x) => Number.isFinite(x) && x >= -180 && x <= 180;
const __notZero = (lat, lng) =>
  !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001);

export const __inGarut = (lat, lng) =>
  __isLat(lat) &&
  __isLng(lng) &&
  __notZero(lat, lng) &&
  lat >= GARUT_BOUNDS.MIN_LAT &&
  lat <= GARUT_BOUNDS.MAX_LAT &&
  lng >= GARUT_BOUNDS.MIN_LNG &&
  lng <= GARUT_BOUNDS.MAX_LNG;

export const normalizeLatLng = (pair) => {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const a = Number(pair[0]);
  const b = Number(pair[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  if (__isLat(a) && __isLng(b)) return [a, b];

  // GeoJSON sering [lng, lat]
  if (a >= 95 && a <= 141 && b >= -11 && b <= 6) return [b, a];

  return null;
};

export const getLatLng = (s) => {
  if (s?.lat != null && s?.lng != null) {
    const lat = toNumber(s.lat);
    const lng = toNumber(s.lng);
    if (__isLat(lat) && __isLng(lng)) return [lat, lng];
  }
  if (s?.latitude != null && s?.longitude != null) {
    const lat = toNumber(s.latitude);
    const lng = toNumber(s.longitude);
    if (__isLat(lat) && __isLng(lng)) return [lat, lng];
  }
  if (Array.isArray(s?.coordinates) && s.coordinates.length >= 2) {
    return normalizeLatLng(s.coordinates);
  }
  return null;
};

export const getLatLngSafe = (row) => {
  const ll = getLatLng(row);
  if (!Array.isArray(ll) || ll.length !== 2) return null;

  const lat = Number(ll[0]);
  const lng = Number(ll[1]);

  // Fix jika tertukar
  if (lat >= 95 && lat <= 141 && lng >= -11 && lng <= 6) {
    return __inGarut(lng, lat) ? [lng, lat] : null;
  }

  return __inGarut(lat, lng) ? [lat, lng] : null;
};

/* ======================================================================
   6. HELPER FILTER & DATA
   ====================================================================== */
export const groupBy = (arr, keyFn) =>
  (arr || []).reduce((acc, it) => {
    const k = keyFn(it);
    (acc[k] ??= []).push(it);
    return acc;
  }, {});

export const uniqueBy = (arr = [], keyFn) => {
  const m = new Map();
  for (const it of arr) {
    const k = keyFn(it);
    if (!m.has(k)) m.set(k, it);
  }
  return Array.from(m.values());
};

export const applyFilters = (schools, filters) => {
  let { jenjang = "", kecamatan = "", desa = "" } = filters || {};

  const jRaw = (jenjang || "").toString().trim();
  const j = /^semua/i.test(jRaw) ? "" : jRaw;

  const k = kecKey(normalizeAnyAll(kecamatan || ""));
  const d = norm(normalizeAnyAll(desa || ""));

  return (schools || []).filter((s) => {
    const sj = shortLevel(s?.jenjang);
    const skec = kecKey(s?.kecamatan);
    const sdesa = norm(s?.desa || s?.village || "");

    if (j && sj !== j) return false;
    if (k && skec !== k) return false;
    if (d && sdesa !== d) return false;
    return true;
  });
};
