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

export const shortLevel = (lvl, row) => {
  // 1. Cek 'lvl' langsung (jika dikirim string "SMP")
  // 2. Cek 'meta.jenjang' (biasanya dari inputan baru)
  // 3. Cek 'jenjang_text' (dari view database)
  // 4. Cek 'school_type_id' (dari tabel schools raw)
  const raw = 
    lvl || 
    row?.meta?.jenjang || 
    row?.jenjang_text || 
    row?.school_type_id || 
    "";

  // Ubah ke string, uppercase, dan hapus spasi agar pencocokan mudah
  const s = raw.toString().toUpperCase().replace(/\s+/g, "");

  // --- LOGIKA PENCOCOKAN (ID & TEXT) ---

  // 1. PAUD (ID: 1)
  // Mencakup: Kode "1", Kata "PAUD", "TK", "KB", "Taman Kanak"
  if (s === "1" || s.includes("PAUD") || s.includes("TK") || s.includes("KB") || s.includes("TAMAN")) {
    return "PAUD";
  }

  // 2. PKBM (ID: 2)
  // Mencakup: Kode "2", Kata "PKBM", "PUSAT KEGIATAN"
  if (s === "2" || s.includes("PKBM")) {
    return "PKBM";
  }

  // 3. SD (ID: 3)
  // Mencakup: Kode "3", Kata "SD", "SEKOLAH DASAR"
  // Hati-hati: "SD" bisa jadi bagian dari "SDLB", tapi biasanya tetap masuk kategori SD/Lainnya
  if (s === "3" || s === "SD" || s.includes("SEKOLAHDASAR") || s.includes("SDNEGERI") || s.includes("SDSWASTA")) {
    return "SD";
  }

  // 4. SMP (ID: 4)
  // Mencakup: Kode "4", Kata "SMP", "SEKOLAH MENENGAH PERTAMA"
  if (s === "4" || s === "SMP" || s.includes("SEKOLAHMENENGAHPERTAMA") || s.includes("SMPN") || s.includes("SMPS")) {
    return "SMP";
  }

  // Default jika tidak dikenali
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

  // 1. Ambil nilai filter mentah
  let jRaw = (jenjang || "").toString().trim();

  // 2. Jika filter "Semua", kosongkan agar tidak memfilter
  if (/^semua/i.test(jRaw)) jRaw = "";

  // 3. --- NORMALISASI FILTER (BAGIAN PENTING) ---
  // Kita ubah input filter (baik itu ID angka "2" atau teks "pkbm") 
  // menjadi format standar ("PKBM") agar cocok dengan data sekolah.
  let j = jRaw.toUpperCase();

  if (j === "1" || j.includes("PAUD") || j.includes("TK") || j.includes("KB")) {
    j = "PAUD";
  } else if (j === "2" || j.includes("PKBM")) {
    j = "PKBM"; // <-- Ini kuncinya! Mengubah "2" jadi "PKBM"
  } else if (j === "3" || j === "SD" || j.includes("DASAR")) {
    j = "SD";
  } else if (j === "4" || j === "SMP" || j.includes("MENENGAH")) {
    j = "SMP";
  }
  // ----------------------------------------------

  const k = kecKey(normalizeAnyAll(kecamatan || ""));
  const d = norm(normalizeAnyAll(desa || ""));

  return (schools || []).filter((s) => {
    // Panggil fungsi pintar kita (parameter 's' wajib ada!)
    const sj = shortLevel(s?.jenjang, s);
    
    const skec = kecKey(s?.kecamatan);
    const sdesa = norm(s?.desa || s?.village || "");

    // 4. Perbandingan yang Aman
    // Sekarang kita membandingkan "PKBM" (Sekolah) dengan "PKBM" (Filter)
    if (j && sj !== j) return false;
    
    if (k && skec !== k) return false;
    if (d && sdesa !== d) return false;
    return true;
  });
};
