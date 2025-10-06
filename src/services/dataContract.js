// src/services/dataContract.js
// Validator & normalizer untuk payload kontrak `GET /api/schools:bundle`.
// Tujuan: front-end aman meskipun sumber data bervariasi; semua dipaksa ke format konsisten.

export const DATA_CONTRACT_VERSION = "v1.0";

// Util numeric ringan
const toNum = (v, d = 0) => {
  const n = Number(String(v ?? "").toString().replace(",", ".").trim());
  return Number.isFinite(n) ? n : d;
};

// Normalisasi [lat, lng] + deteksi (lng,lat) terbalik; batas Indonesia utk sanity check
export function normalizeLatLng(pair) {
  if (!Array.isArray(pair) || pair.length < 2) return null;
  let a = Number(pair[0]), b = Number(pair[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const inLat = (x) => x >= -12 && x <= 6;
  const inLng = (x) => x >= 95 && x <= 141;
  // deteksi kebalik
  if (inLng(a) && inLat(b)) return [b, a];
  if (inLat(a) && inLng(b)) return [a, b];
  // fallback: jika |a|>90 tapi |b|≤90 → tukar
  if (Math.abs(a) > 90 && Math.abs(b) <= 90) return [b, a];
  return [a, b];
}

const JENJANG = ["PAUD", "SD", "SMP", "PKBM"];
const shortLevel = (lvl) => {
  if (!lvl) return "Lainnya";
  const s = lvl.toString().toUpperCase();
  if (s.includes("PAUD")) return "PAUD";
  if (s === "SD" || s.includes("SEKOLAH DASAR")) return "SD";
  if (s === "SMP" || s.includes("SEKOLAH MENENGAH PERTAMA")) return "SMP";
  if (s.includes("PKBM")) return "PKBM";
  return "Lainnya";
};

// Validasi FeatureCollection minimal
function isFeatureCollection(fc) {
  return !!fc && typeof fc === "object" && fc.type === "FeatureCollection" && Array.isArray(fc.features);
}

// Normalisasi satu sekolah ke kontrak final
function normalizeSchool(raw) {
  const jenjangRaw = raw?.jenjang ?? raw?.level ?? raw?.kategori ?? "";
  const jenjang = shortLevel(jenjangRaw);
  const name = raw?.namaSekolah ?? raw?.nama ?? raw?.name ?? "Tidak diketahui";
  const npsn = (raw?.npsn ?? "").toString();
  const tipe = raw?.tipeSekolah ?? raw?.status ?? raw?.type ?? "-";
  const desa = raw?.desa ?? raw?.village ?? "-";
  const kecamatan = raw?.kecamatan ?? "-";
  const student_count = toNum(raw?.student_count);

  // class_condition bisa beragam nama field → normalisasikan jadi 3 angka + lacking_rkb
  const cc = raw?.kondisiKelas ?? raw?.class_condition ?? {};
  const kondisiKelas = {
    baik: toNum(cc?.classrooms_good ?? cc?.good),
    rusakSedang: toNum(cc?.classrooms_moderate_damage ?? cc?.moderate_damage),
    rusakBerat: toNum(cc?.classrooms_heavy_damage ?? cc?.heavy_damage),
  };
  const kurangRKB = toNum(cc?.lacking_rkb ?? raw?.kurangRKB);

  // koordinat: prefer `coordinates`, fallback lat/long
  let coords = null;
  if (Array.isArray(raw?.coordinates)) coords = normalizeLatLng(raw.coordinates);
  else if (raw?.latitude != null && raw?.longitude != null) coords = normalizeLatLng([raw.latitude, raw.longitude]);

  // kegiatan (opsional)
  const rehabRuangKelas = toNum(raw?.rehabRuangKelas);
  const pembangunanRKB = toNum(raw?.pembangunanRKB);

  return {
    jenjang,
    npsn,
    namaSekolah: name,
    tipeSekolah: tipe,
    desa,
    kecamatan,
    student_count,
    coordinates: coords, // boleh null → akan difilter di layer peta
    kondisiKelas,
    kurangRKB,
    rehabRuangKelas,
    pembangunanRKB,
    originalData: raw,
  };
}

/**
 * Validasi + normalisasi payload schools:bundle.
 * Mengembalikan { ok, data: {schools, geoData}, errors: string[] }
 */
export function validateBundlePayload(payload) {
  const errors = [];

  if (!payload || typeof payload !== "object") {
    return { ok: false, data: { schools: [], geoData: { kecamatan: null, desa: null } }, errors: ["Payload bukan object"] };
  }

  // schools
  const rawSchools = Array.isArray(payload.schools) ? payload.schools : [];
  const schools = rawSchools.map((it, idx) => {
    try {
      return normalizeSchool(it);
    } catch (e) {
      errors.push(`schools[${idx}]: ${e?.message || e}`);
      return null;
    }
  }).filter(Boolean);

  // geoData
  const gd = payload.geoData || {};
  const geoData = {
    kecamatan: isFeatureCollection(gd.kecamatan) ? gd.kecamatan : null,
    desa: isFeatureCollection(gd.desa) ? gd.desa : null,
  };

  // cek wajib: jenjang valid
  schools.forEach((s, i) => {
    if (!JENJANG.includes(s.jenjang)) {
      errors.push(`schools[${i}].jenjang tidak dikenal: "${s.jenjang}"`);
    }
    if (s.coordinates && (!Number.isFinite(+s.coordinates[0]) || !Number.isFinite(+s.coordinates[1]))) {
      errors.push(`schools[${i}].coordinates tidak valid`);
      s.coordinates = null;
    }
    // pastikan kondisi numerik
    ["baik", "rusakSedang", "rusakBerat"].forEach((k) => {
      s.kondisiKelas[k] = toNum(s.kondisiKelas[k]);
    });
    s.kurangRKB = toNum(s.kurangRKB);
    s.rehabRuangKelas = toNum(s.rehabRuangKelas);
    s.pembangunanRKB = toNum(s.pembangunanRKB);
  });

  const ok = true; // kita tetap return ok, tapi log errors agar mudah dibenahi sumbernya
  return { ok, data: { schools, geoData }, errors };
}
