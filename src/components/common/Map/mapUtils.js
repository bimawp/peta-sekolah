// src/components/common/Map/mapUtils.js
import L from "leaflet";
import marker2x from "leaflet/dist/images/marker-icon-2x.png";
import marker1x from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
L.Icon.Default.mergeOptions({ iconRetinaUrl: marker2x, iconUrl: marker1x, shadowUrl: markerShadow });

export const n = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
export const norm = (s) => (s ?? "").toString().trim().replace(/\s+/g, " ").toUpperCase();
export const normAgg = (s) => (s ?? "").toString().toUpperCase().replace(/[^A-Z0-9]/g, "");

export const kecKey = (name) => {
  if (!name) return "";
  let x = name.toString().toUpperCase();
  x = x.replace(/\bKEC(?:AMATAN)?\.?\b/g, "");
  x = x.replace(/[^A-Z]/g, "");
  return x;
};

export const toNumber = (v) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.trim().replace(",", ".");
    const num = Number(cleaned);
    return Number.isFinite(num) ? num : NaN;
  }
  return NaN;
};

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

/* ====== KONDISI ====== */
export const normalizeCondition = (v) => {
  const str = (v ?? "").toString();
  if (/^\(SEMU[AI]/i.test(str)) return "";
  if (typeof v === "number") {
    const code = Number(v);
    if (code === 1) return "Baik";
    if (code === 2) return "Rusak Sedang";
    if (code === 3) return "Rusak Berat";
    if (code === 4) return "Kurang RKB";
    return "";
  }
  const s = str.toUpperCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return "";
  if (s.includes("KURANG") && s.includes("RKB")) return "Kurang RKB";
  if (s.includes("RUSAK") && (s.includes("RINGAN") || s.includes("SEDANG"))) return "Rusak Sedang";
  if (s.includes("RUSAK") && s.includes("BERAT")) return "Rusak Berat";
  if (s.includes("BAIK")) return "Baik";
  if (["KRKB","KURANGRKB","KURANG RKB"].includes(s)) return "Kurang RKB";
  if (["RR","R R"].includes(s)) return "Rusak Sedang";
  if (s === "RB") return "Rusak Berat";
  return "";
};

export const getCondition = (s) => {
  const candidates = [
    s?.computed_condition, // ← dari hook (sumber utama)
    s?.kondisi, s?.kondisi_bangunan, s?.kondisiBangunan, s?.kondisiSekolah, s?.kondisi_sekolah,
    s?.kondisi_fisik, s?.kondisi_ruang, s?.kategori_kondisi, s?.condition, s?.status_kondisi,
    s?.statusBangunan, s?.keadaan,
  ];
  const kRkb = s?.kurang_rkb ?? s?.kurangRkb ?? s?.is_kurang_rkb ?? s?.need_rkb;
  if (kRkb === true || `${kRkb}`.toLowerCase() === "true" || kRkb === 1) return "Kurang RKB";
  const num = candidates.find((x) => typeof x === "number"); if (num != null) return normalizeCondition(num);
  const str = candidates.find((x) => (x ?? "").toString().trim() !== ""); const normed = normalizeCondition(str ?? "");
  if (normed) return normed;
  // fallback infer dari semua field:
  for (const [k, v] of Object.entries(s || {})) {
    if (v == null) continue;
    if (typeof v === "boolean" && k.toLowerCase().includes("rkb") && v) return "Kurang RKB";
    const out = normalizeCondition(Array.isArray(v) ? v.join(" ") : String(v));
    if (out) return out;
  }
  return "";
};

export const makeKecamatanNumberIcon = (count, sizeClass, styles) =>
  L.divIcon({ className: "", html: `<div class="${styles.kecNum} ${styles[sizeClass] || ""}">${count}</div>`, iconSize: [0,0], popupAnchor:[0,-12] });

export const applyFilters = (schools, filters) => {
  let { jenjang = "", kecamatan = "", desa = "", kondisi = "" } = filters || {};
  const j = (jenjang || "").toString().trim();
  const k = kecKey(kecamatan || "");
  const d = norm(desa || "");
  const kc = normalizeCondition(kondisi || "");
  return schools.filter((s) => {
    const sj = shortLevel(s?.jenjang);
    const skec = kecKey(s?.kecamatan);
    const sdesa = norm(s?.desa || s?.village || "");
    const skond = getCondition(s);
    if (j && !j.startsWith("(Semua") && sj !== j) return false;
    if (k && skec !== k) return false;
    if (d && sdesa !== d) return false;
    if (kc && skond !== kc) return false;
    const ll = getLatLng(s);
    if (!ll) return false;
    return true;
  });
};

export const buildKecamatanSummaryFromSchools = (schools) => {
  const byKec = groupBy(schools, (s) => kecKey(s.kecamatan));
  return Object.entries(byKec).map(([kecKeyId, arr]) => {
    const perLevel = groupBy(arr, (s) => shortLevel(s.jenjang));
    const counts = Object.fromEntries(Object.entries(perLevel).map(([k, a]) => [k, a.length]));
    return { kecKey: kecKeyId, displayName: arr[0]?.kecamatan || kecKeyId, total: arr.length, counts, items: arr };
  });
};
export const buildKecamatanSummary = buildKecamatanSummaryFromSchools;

export const centroidOfPolygon = (feature) => {
  try {
    const coords = feature?.geometry?.coordinates; if (!coords) return null;
    const getOuterRing = (geom) => (Array.isArray(geom[0][0][0]) ? geom[0][0] : geom[0]);
    const ring = getOuterRing(coords);
    let x=0,y=0,A=0;
    for (let i=0;i<ring.length;i++){ const [x0,y0]=ring[i], [x1,y1]=ring[(i+1)%ring.length]; const a=x0*y1-x1*y0; A+=a; x+=(x0+x1)*a; y+=(y0+y1)*a; }
    A*=0.5; if (!A) return null; const cx=x/(6*A), cy=y/(6*A); return normalizeLatLng([cy,cx]);
  } catch { return null; }
};

export const summarizeCondition = (arr) => {
  const out = { Baik: 0, "Rusak Sedang": 0, "Rusak Berat": 0, "Kurang RKB": 0 };
  for (const s of arr) { const lab = getCondition(s); if (out[lab] != null) out[lab] += 1; }
  return out;
};

export const formatCountsLabel = (counts) =>
  ["PAUD","SD","SMP","PKBM"].map((k) => `${k} ${n(counts[k],0)}`).join(" | ");
