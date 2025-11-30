// src/services/utils/mapUtils.js - VERSI DEFINITIF LENGKAP & DIPERBAIKI

import L from 'leaflet';
// Impor gambar marker default secara eksplisit agar dikenali Vite/Webpack
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

/* ==========================================================================
   1. KONFIGURASI ICON DEFAULT LEAFLET
   ========================================================================== */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ==========================================================================
   2. KONFIGURASI BATAS WILAYAH (GARUT)
   ========================================================================== */
// PERBAIKAN: MAX_LAT dinaikkan ke -6.70 (Utara) agar popup di perbatasan atas tidak terpotong.
export const GARUT_BOUNDS = { 
  MIN_LAT: -7.85,  // Batas Selatan (sedikit dilonggarkan)
  MAX_LAT: -6.70,  // Batas Utara (DIPERBAIKI dari -6.95)
  MIN_LNG: 107.15, // Batas Barat
  MAX_LNG: 108.30  // Batas Timur
};

export const GARUT_LEAFLET_BOUNDS = L.latLngBounds(
  L.latLng(GARUT_BOUNDS.MIN_LAT, GARUT_BOUNDS.MIN_LNG),
  L.latLng(GARUT_BOUNDS.MAX_LAT, GARUT_BOUNDS.MAX_LNG)
);

/* ==========================================================================
   3. ICON GENERATORS
   ========================================================================== */

// Ikon untuk Klaster (Lingkaran Biru dengan Angka)
export const createClusterIcon = (count) => {
  let size = 40, fontSize = 14;
  if (count >= 100) { size = 50; fontSize = 16; }
  else if (count < 10) { size = 30; fontSize = 12; }
  
  const html = `
    <div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background-color:rgba(67,56,202,0.9);
      color:white;
      font-size:${fontSize}px;
      font-weight:bold;
      display:flex;
      align-items:center;
      justify-content:center;
      border:3px solid white;
      box-shadow:0 4px 8px rgba(0,0,0,0.3);
      cursor:pointer;">
      ${count}
    </div>`;
    
  return L.divIcon({ 
    html, 
    className: '', // Kosongkan class agar tidak konflik style leaflet
    iconSize: [size, size], 
    iconAnchor: [size / 2, size / 2] 
  });
};

// Ikon Angka Kecamatan (Lingkaran Hijau)
export const makeKecamatanNumberIcon = (count, sizeClass, styles) =>
  L.divIcon({
    className: "",
    html: `<div class="${styles?.kecamatanCircle || 'kecamatan-circle'} ${sizeClass || ""}">${count}</div>`,
    iconSize: [0, 0],
    popupAnchor: [0, -12]
  });

/* ==========================================================================
   4. HELPER STRING & KEY
   ========================================================================== */

// Konversi aman ke angka
export const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const toNumber = (x) => Number((x ?? "").toString().replace(",", "."));

// Normalisasi string (huruf besar, trim spasi)
export const norm = (s) => (s ?? "").toString().trim().replace(/\s+/g, " ").toUpperCase();

// Normalisasi Label Filter (Mengatasi "(Semua ...)")
export const normalizeAnyAll = (v = "") => {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
  const up = s.toUpperCase();
  if (up.startsWith("(SEMUA") || up.startsWith("SEMUA")) return "";
  return s;
};

// Membuat key kecamatan yang bersih (Hapus "KECAMATAN" dsb)
export const kecKey = (name) => {
  if (!name) return "";
  let x = name.toString().toUpperCase();
  x = x.replace(/\bKEC(?:AMATAN)?\.?\b/g, "");
  x = x.replace(/[^A-Z]/g, "");
  return x;
};

// Penyederhanaan Jenjang (TK/KB -> PAUD, dst)
export const shortLevel = (lvl) => {
  if (!lvl) return "Lainnya";
  const s = lvl.toString().toUpperCase().replace(/\s+/g, "");
  if (s.includes("PAUD") || s.includes("TK") || s.includes("KB")) return "PAUD";
  if (s === "SD" || s.includes("SEKOLAHDASAR")) return "SD";
  if (s === "SMP" || s.includes("SEKOLAHMENENGAHPERTAMA")) return "SMP";
  if (s.includes("PKBM")) return "PKBM";
  return "Lainnya";
};

/* ==========================================================================
   5. HELPER GEOLOKASI (KOORDINAT)
   ========================================================================== */

// Validasi dasar koordinat
const __isLat = (x) => Number.isFinite(x) && x >= -90 && x <= 90;
const __isLng = (x) => Number.isFinite(x) && x >= -180 && x <= 180;
const __notZero = (lat, lng) => !(Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001);

// Cek apakah koordinat masuk akal untuk Indonesia
const __inIndonesia = (lat, lng) => 
  __isLat(lat) && __isLng(lng) && __notZero(lat, lng) && 
  lat >= -11 && lat <= 6 && lng >= 95 && lng <= 141;

// Cek apakah koordinat masuk dalam batas Garut (dengan toleransi)
export const __inGarut = (lat, lng) => 
  __isLat(lat) && __isLng(lng) && __notZero(lat, lng) &&
  lat >= GARUT_BOUNDS.MIN_LAT && lat <= GARUT_BOUNDS.MAX_LAT &&
  lng >= GARUT_BOUNDS.MIN_LNG && lng <= GARUT_BOUNDS.MAX_LNG;

// Normalisasi array [a, b] menjadi [lat, lng] yang benar
export const normalizeLatLng = (pair) => {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  const a = Number(pair[0]); const b = Number(pair[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  
  // Jika sudah format Lat, Lng standar
  if (__isLat(a) && __isLng(b)) return [a, b];
  
  // Jika terbalik (Lng, Lat) -> umum di GeoJSON
  if (a >= 95 && a <= 141 && b >= -11 && b <= 6) return [b, a];
  
  return null;
};

// Mengambil LatLng dari objek sekolah dengan berbagai kemungkinan nama field
export const getLatLng = (s) => {
  if (s?.lat != null && s?.lng != null) {
    const lat = toNumber(s.lat), lng = toNumber(s.lng);
    if (__isLat(lat) && __isLng(lng)) return [lat, lng];
  }
  if (s?.latitude != null && s?.longitude != null) {
    const lat = toNumber(s.latitude), lng = toNumber(s.longitude);
    if (__isLat(lat) && __isLng(lng)) return [lat, lng];
  }
  if (Array.isArray(s?.coordinates) && s.coordinates.length >= 2) {
    return normalizeLatLng(s.coordinates);
  }
  return null;
};

// Wrapper aman: Ambil LatLng, validasi Indonesia, lalu validasi Garut
export const getLatLngSafe = (row) => {
  const ll = getLatLng(row);
  if (!Array.isArray(ll) || ll.length !== 2) return null;
  
  const lat = Number(ll[0]), lng = Number(ll[1]);
  
  // Fix otomatis jika tertukar
  if (lat >= 95 && lat <= 141 && lng >= -11 && lng <= 6) {
     return __inGarut(lng, lat) ? [lng, lat] : null;
  }

  return __inGarut(lat, lng) ? [lat, lng] : null;
};

/* ==========================================================================
   6. HELPER FILTER & DATA
   ========================================================================== */

// Group array by key
export const groupBy = (arr, keyFn) =>
  arr.reduce((acc, it) => { const k = keyFn(it); (acc[k] ??= []).push(it); return acc; }, {});

// Hapus duplikat berdasarkan key
export const uniqueBy = (arr = [], keyFn) => {
  const m = new Map();
  for (const it of arr) { const k = keyFn(it); if (!m.has(k)) m.set(k, it); }
  return Array.from(m.values());
};

// Terapkan filter (Jenjang, Kecamatan, Desa) ke array sekolah
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