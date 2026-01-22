// src/components/schools/SchoolDetail/Smp/SchoolDetailSmp.jsx
import React, { useEffect, useState } from "react";
import styles from "./SchoolDetailSmp.module.css";

const getData = (data, path, defaultValue = 0) => {
  const value = path.reduce((obj, key) => (obj && obj[key] != null ? obj[key] : undefined), data);
  if (value === 0 || value === 0.0) return 0;
  return value ?? defaultValue;
};

// ===================== UTIL TAMBAHAN =====================
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const pickStr = (...vals) => {
  for (const v of vals) {
    if (v === 0 || v === "0") return "0";
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
};

const pickFirstFinite = (...vals) => {
  for (const v of vals) {
    if (v === 0 || v === "0") return 0;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
};

// Prefer angka non-zero (agar 0 default tidak “mengalahkan” data tabel relasi)
const pickNumPreferNonZero = (...vals) => {
  let sawZero = false;
  for (const v of vals) {
    if (v == null || v === "") continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    if (n === 0) {
      sawZero = true;
      continue;
    }
    return n;
  }
  return sawZero ? 0 : 0;
};

const deepMerge = (base, patch) => {
  if (!isObj(base)) base = {};
  if (!isObj(patch)) return base;
  const out = { ...base };
  for (const k of Object.keys(patch)) {
    const bv = out[k];
    const pv = patch[k];
    if (isObj(bv) && isObj(pv)) out[k] = deepMerge(bv, pv);
    else out[k] = pv;
  }
  return out;
};

function mergeMeta(meta, details) {
  const m = isObj(meta) ? meta : {};
  const d = isObj(details) ? details : {};
  const dMeta = isObj(d?.meta) ? d.meta : {};
  const dMetaAlt = !Object.keys(dMeta).length && isObj(d) ? d : {};
  return deepMerge(m, Object.keys(dMeta).length ? dMeta : dMetaAlt);
}

// Unwrap payload RPC yang sering dibungkus: { data: {...} } atau { school: {...} }
function unwrapPayload(x) {
  let cur = x;
  for (let i = 0; i < 4; i++) {
    if (!isObj(cur)) break;
    if (isObj(cur.data)) cur = cur.data;
    else if (isObj(cur.school)) cur = cur.school;
    else if (isObj(cur.detail)) cur = cur.detail;
    else if (isObj(cur.payload)) cur = cur.payload;
    else break;
  }
  return cur;
}

const mapYesNo = (v) => {
  if (v === "YA") return "Ya";
  if (v === "TIDAK") return "Tidak";
  return v || "-";
};
const mapSudahBelum = (v) => {
  if (v === "SUDAH") return "Sudah";
  if (v === "BELUM") return "Belum";
  return v || "-";
};
const mapPeralatan = (v) => {
  if (v === "TIDAK_MEMILIKI") return "Tidak Memiliki";
  if (v === "HARUS_DIGANTI") return "Harus Diganti";
  if (v === "BAIK") return "Baik";
  if (v === "PERLU_REHABILITASI") return "Perlu Rehabilitasi";
  return v || "-";
};

const formatLabelKey = (k) => {
  const s = String(k ?? "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "-";
};

const formatMaybeNumber = (v, fallback = "-") => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const formatLanjutKey = (k) => {
  const kk = String(k || "").toLowerCase().trim();
  if (kk === "sma") return "SMA";
  if (kk === "smk") return "SMK";
  if (kk === "ma") return "MA";
  if (kk === "pontren" || kk === "pesantren") return "Pontren";
  if (kk === "pkbm") return "PKBM";
  return formatLabelKey(k);
};

/* =========================================================
   ✅ PARSER KELAS/GRADE (FIX UNTUK kelas7_L, kelaskelas7_P, dll.)
   ========================================================= */
const extractGradeNumber = (text) => {
  const s = String(text ?? "").trim();
  const m = s.match(/(\d{1,2})/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) ? n : null;
};

const extractGenderSuffix = (text) => {
  const s = String(text ?? "").trim();
  // dukung ..._L / ..._P (case-insensitive)
  const m = s.match(/(?:_|-)([LP])$/i);
  if (m) return String(m[1]).toUpperCase();
  return null;
};

const looksLikeKelasKey = (text) => {
  const s = String(text ?? "").toLowerCase();
  // menerima "kelas", "kelaskelas", serta variasi "kelas_7", dsb.
  return s.includes("kelas");
};

/* =========================================================
   NORMALIZER (✅ ditambah Rusak Ringan)
   meta biasanya punya: good, light_damage, moderate_damage, heavy_damage, total (atau total_all)
   ========================================================= */
const normalizeRoom = (src) => {
  const o = src && typeof src === "object" ? src : {};
  const good = Number(o.good ?? o.classrooms_good ?? o.baik ?? 0);

  const light = Number(
    o.light_damage ??
      o.classrooms_light_damage ??
      o.rusak_ringan ??
      o.rusakRingan ??
      o.ringan ??
      0
  );

  const moderate = Number(
    o.moderate_damage ??
      o.classrooms_moderate_damage ??
      o.rusak_sedang ??
      o.rusakSedang ??
      o.sedang ??
      0
  );

  const heavy = Number(
    o.heavy_damage ??
      o.classrooms_heavy_damage ??
      o.rusak_berat ??
      o.rusakBerat ??
      o.berat ??
      0
  );

  const totalDamage = Number(
    o.total_damage ??
      o.total_rusak ??
      o.rusak_total ??
      o.rusakTotal ??
      0
  );

  const totalAll = Number(o.total_all ?? o.total ?? o.total_room ?? 0);

  // total_mlh = ring + sedang + berat (rusak)
  const totalMlh = Number(o.total_mlh ?? light + moderate + heavy);

  return {
    good,
    light_damage: light,
    moderate_damage: moderate,
    heavy_damage: heavy,
    total_damage: totalDamage,
    total_all: totalAll,
    total_mlh: totalMlh,
  };
};

const normalizeToiletGender = (src) => {
  const o = src && typeof src === "object" ? src : {};
  const good = Number(o.good ?? o.baik ?? 0);
  const light = Number(o.light_damage ?? o.rusak_ringan ?? o.rusakRingan ?? o.ringan ?? 0);
  const moderate = Number(o.moderate_damage ?? o.rusak_sedang ?? o.rusakSedang ?? o.sedang ?? 0);
  const heavy = Number(o.heavy_damage ?? o.rusak_berat ?? o.rusakBerat ?? o.berat ?? 0);

  const totalAll = Number(o.total_all ?? o.total ?? 0);
  const totalDamage = Number(o.total_damage ?? o.rusak_total ?? o.rusakTotal ?? 0);
  const totalMlh = Number(o.total_mlh ?? light + moderate + heavy);

  return {
    good,
    light_damage: light,
    moderate_damage: moderate,
    heavy_damage: heavy,
    total_damage: totalDamage,
    total_all: totalAll,
    total_mlh: totalMlh,
  };
};

const normalizeToilet = (src) => {
  const o = src && typeof src === "object" ? src : {};
  const maleSrc = o.male ?? o.laki_laki ?? o.lakiLaki ?? o.lk;
  const femaleSrc = o.female ?? o.perempuan ?? o.pr;
  return {
    male: normalizeToiletGender(maleSrc),
    female: normalizeToiletGender(femaleSrc),
  };
};

/* =========================================================
   ✅ FIX: collectKelasGenderRows
   - dukung key datar: "kelas7_L": 10, "kelaskelas7_P": 12
   - dukung object: "kelas7": { l: 10, p: 12 } / { total: 22 }
   ========================================================= */
const collectKelasGenderRows = (obj) => {
  if (!isObj(obj)) return [];

  const bucket = {}; // grade -> {male,female,total}
  const ensure = (g) => {
    if (!bucket[g]) bucket[g] = { male: 0, female: 0, total: 0, seen: false };
    return bucket[g];
  };

  const addIfFinite = (g, field, v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    const b = ensure(g);
    b[field] += n;
    b.seen = true;
  };

  for (const k of Object.keys(obj)) {
    const v = obj[k];

    const grade = extractGradeNumber(k);
    if (!grade) continue;

    // agar tidak “nyasar” ke key lain yang kebetulan ada angka, tetap pastikan bernuansa "kelas"
    if (!looksLikeKelasKey(k)) continue;

    const gender = extractGenderSuffix(k); // L / P / null

    // Kasus object: kelas7: {l:..., p:...} atau {total:...}
    if (isObj(v) && !gender) {
      const m = pickFirstFinite(v?.l, v?.L, v?.male, v?.laki_laki, v?.lk);
      const p = pickFirstFinite(v?.p, v?.P, v?.female, v?.perempuan, v?.pr);
      const t = pickFirstFinite(v?.total, v?.jumlah, v?.count, v?.value);

      if (Number.isFinite(Number(m))) addIfFinite(grade, "male", m);
      if (Number.isFinite(Number(p))) addIfFinite(grade, "female", p);
      if (Number.isFinite(Number(t))) addIfFinite(grade, "total", t);
      continue;
    }

    // Kasus datar: kelas7_L: 10, kelaskelas7_P: 10
    const n = Number(v);
    if (!Number.isFinite(n)) continue;

    if (gender === "L") addIfFinite(grade, "male", n);
    else if (gender === "P") addIfFinite(grade, "female", n);
    else addIfFinite(grade, "total", n);
  }

  const grades = Object.keys(bucket)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  return grades.map((g) => {
    const b = bucket[g] || { male: 0, female: 0, total: 0 };
    const male = toNum(b.male, 0);
    const female = toNum(b.female, 0);
    const byLP = male + female;
    const total = byLP > 0 ? byLP : toNum(b.total, 0);

    return {
      key: `kelas${g}`,
      label: `Kelas ${g}`,
      male,
      female,
      total,
    };
  });
};

const sumFromKelasRows = (rows) => {
  let l = 0;
  let p = 0;
  for (const r of rows) {
    l += toNum(r.male, 0);
    p += toNum(r.female, 0);
  }
  return { l, p, total: l + p };
};

const pickTotalsFromSiswaObj = (obj) => {
  if (!isObj(obj)) return { l: 0, p: 0, total: 0 };

  const kelasRows = collectKelasGenderRows(obj);
  if (kelasRows.length) return sumFromKelasRows(kelasRows);

  const tL = pickFirstFinite(obj?.total?.l, obj?.l, obj?.male, obj?.laki_laki, obj?.lk);
  const tP = pickFirstFinite(obj?.total?.p, obj?.p, obj?.female, obj?.perempuan, obj?.pr);
  if ((tL || 0) + (tP || 0) > 0) {
    const L = toNum(tL, 0);
    const P = toNum(tP, 0);
    return { l: L, p: P, total: L + P };
  }

  let l = 0;
  let p = 0;
  const walk = (x) => {
    if (!isObj(x)) return;
    for (const kk of Object.keys(x)) {
      const vv = x[kk];
      if (kk === "l") l += toNum(vv, 0);
      else if (kk === "p") p += toNum(vv, 0);
      else if (isObj(vv)) walk(vv);
    }
  };
  walk(obj);
  return { l, p, total: l + p };
};

/* =========================================================
   ✅ WADAH WAJIB (SMP): selalu tampil Kelas 7-9 meski 0
   ========================================================= */
const ensureSmpKelasRows79 = (rows) => {
  const desired = [7, 8, 9];
  const map = {};
  for (const r of Array.isArray(rows) ? rows : []) {
    const n = parseInt(String(r?.key ?? r?.label ?? "").replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(n)) map[n] = r;
  }
  return desired.map((n) => {
    const existing = map[n];
    if (existing) {
      return {
        key: existing.key || `kelas${n}`,
        label: `Kelas ${n}`,
        male: toNum(existing.male, 0),
        female: toNum(existing.female, 0),
        total: toNum(existing.total, 0),
      };
    }
    return { key: `kelas${n}`, label: `Kelas ${n}`, male: 0, female: 0, total: 0 };
  });
};

const ensureSmpRombelRows79 = (rows) => {
  const desired = [7, 8, 9];
  const map = {};
  for (const r of Array.isArray(rows) ? rows : []) {
    const n = parseInt(String(r?.key ?? r?.label ?? "").replace(/[^0-9]/g, ""), 10);
    if (Number.isFinite(n)) map[n] = r;
  }
  return desired.map((n) => {
    const existing = map[n];
    return {
      key: `kelas${n}`,
      label: `Kelas ${n}`,
      value: toNum(existing?.value, 0),
    };
  });
};

const ensureLanjutTargets = (obj, targets) => {
  const o = isObj(obj) ? obj : {};
  return targets.map((k) => ({
    key: k,
    label: formatLanjutKey(k),
    value: toNum(o[k], 0),
  }));
};

/* =========================================================
   ✅ ROMBEL PARSER (META)
   - dukung: kelas7, kelas7_L, kelaskelas7_P, kelas_7_L, dst.
   - value bisa angka atau object (total/l/p)
   ========================================================= */
const buildRombelFromMeta = (rombelObj) => {
  if (!isObj(rombelObj)) return { rows: [], total: 0 };

  const map = {}; // grade -> sum
  const add = (grade, v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    map[grade] = (map[grade] || 0) + n;
  };

  for (const k of Object.keys(rombelObj)) {
    const v = rombelObj[k];

    const grade = extractGradeNumber(k);
    if (!grade) continue;
    if (!looksLikeKelasKey(k)) continue;

    // object: {total:..} atau {l:.., p:..}
    if (isObj(v)) {
      const t = pickFirstFinite(v?.total, v?.jumlah, v?.count, v?.value);
      if (Number.isFinite(Number(t))) {
        add(grade, t);
        continue;
      }
      const m = pickFirstFinite(v?.l, v?.L, v?.male, v?.laki_laki, v?.lk);
      const p = pickFirstFinite(v?.p, v?.P, v?.female, v?.perempuan, v?.pr);
      if (Number.isFinite(Number(m))) add(grade, m);
      if (Number.isFinite(Number(p))) add(grade, p);
      continue;
    }

    // number: kelaskelas7_L: 10
    add(grade, v);
  }

  const rows = Object.keys(map)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((n) => ({ key: `kelas${n}`, label: `Kelas ${n}`, value: toNum(map[n], 0) }));

  const total = rows.reduce((a, r) => a + toNum(r.value, 0), 0);
  return { rows, total };
};

const mergeRombelRowsByMax = (aRows = [], bRows = []) => {
  const map = {}; // grade -> max(value)
  const put = (rows) => {
    for (const r of Array.isArray(rows) ? rows : []) {
      const g = extractGradeNumber(r?.key ?? r?.label);
      if (!g) continue;
      map[g] = Math.max(toNum(map[g], 0), toNum(r?.value, 0));
    }
  };
  put(aRows);
  put(bRows);

  return Object.keys(map)
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b)
    .map((n) => ({ key: `kelas${n}`, label: `Kelas ${n}`, value: toNum(map[n], 0) }));
};

/* =========================================================
   Intervensi (meta/array)
   ========================================================= */
function extractIntervensiFromMeta(meta, base) {
  const m0 = isObj(meta) ? meta : {};
  const b = isObj(base) ? base : {};

  const parseMaybeJson = (v) => {
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }
    return v;
  };

  let rehab = pickFirstFinite(
    m0?.kegiatanFisik?.rehab_unit,
    m0?.kegiatanFisik?.rehabilitasi_unit,
    m0?.kegiatanFisik?.rehabRuangKelas,
    m0?.rehab_unit,
    m0?.rehabilitasi_unit,
    m0?.prasarana?.classrooms?.rehab_unit,
    b?.rehab_unit
  );

  let pembangunan = pickFirstFinite(
    m0?.kegiatanFisik?.pembangunan_unit,
    m0?.kegiatanFisik?.bangun_unit,
    m0?.kegiatanFisik?.pembangunanRKB,
    m0?.pembangunan_unit,
    m0?.bangun_unit,
    m0?.prasarana?.classrooms?.pembangunan_unit,
    b?.pembangunan_unit
  );

  const candidates = [
    m0?.kegiatanFisik,
    m0?.kegiatan,
    b?.kegiatan,
    m0?.projects,
    m0?.intervensi,
    m0?.intervensiRuangKelas,
  ].map(parseMaybeJson);

  const list = candidates.find((v) => Array.isArray(v)) || null;

  const getUnit = (it) => toNum(it?.lokal ?? it?.unit ?? it?.jumlah ?? it?.count ?? it?.volume ?? 0, 0);

  const getType = (it) =>
    String(
      it?.kegiatan_type ??
        it?.type ??
        it?.jenis ??
        it?.kegiatan ??
        it?.activity_name ??
        it?.name ??
        ""
    )
      .toLowerCase()
      .trim();

  if (Array.isArray(list)) {
    let rSum = 0;
    let pSum = 0;
    for (const it of list) {
      const t = getType(it);
      if (!t) continue;

      if (t === "rehab" || t.includes("rehab") || t.includes("rehabilit")) {
        rSum += getUnit(it);
        continue;
      }
      if (t === "pembangunan" || t.includes("pembangunan") || t.includes("bangun") || t.includes("rkb")) {
        pSum += getUnit(it);
        continue;
      }
    }
    rehab = Math.max(toNum(rehab, 0), rSum);
    pembangunan = Math.max(toNum(pembangunan, 0), pSum);
  }

  return {
    rehab_unit: toNum(rehab, 0),
    pembangunan_unit: toNum(pembangunan, 0),
  };
}

function extractIntervensiToiletFromMeta(meta) {
  const m0 = isObj(meta) ? meta : {};
  const kf = isObj(m0?.kegiatanFisik) ? m0.kegiatanFisik : {};
  const rehabToilet = pickFirstFinite(
    kf?.rehabToilet,
    kf?.rehab_toilet,
    kf?.rehabilitasiToilet,
    kf?.rehabilitasi_toilet,
    m0?.rehabToilet,
    m0?.rehab_toilet
  );
  const pembangunanToilet = pickFirstFinite(
    kf?.pembangunanToilet,
    kf?.pembangunan_toilet,
    kf?.bangunToilet,
    kf?.bangun_toilet,
    m0?.pembangunanToilet,
    m0?.pembangunan_toilet
  );
  return {
    rehab_toilet_unit: toNum(rehabToilet, 0),
    pembangunan_toilet_unit: toNum(pembangunanToilet, 0),
  };
}

/* =========================================================
   ✅ FALLBACK KE TABEL RELASI
   ========================================================= */

const normalizeAssetRow = (r) => {
  const good = toNum(r?.good ?? r?.baik ?? 0, 0);
  const moderate_damage = toNum(r?.moderate_damage ?? r?.moderate ?? r?.rusak_sedang ?? r?.sedang ?? 0, 0);
  const heavy_damage = toNum(r?.heavy_damage ?? r?.heavy ?? r?.rusak_berat ?? r?.berat ?? 0, 0);

  const totalExplicit = Number.isFinite(Number(r?.total))
    ? Number(r.total)
    : Number.isFinite(Number(r?.total_all))
    ? Number(r.total_all)
    : null;

  const total_all = totalExplicit != null ? totalExplicit : good + moderate_damage + heavy_damage;

  return { total: total_all, good, moderate_damage, heavy_damage };
};

const aggregateAssetsByCategory = (assetsArr = []) => {
  const out = {};
  for (const r of assetsArr) {
    const cat = String(r?.category ?? "").toLowerCase().trim();
    if (!cat) continue;
    const n = normalizeAssetRow(r);
    if (!out[cat]) out[cat] = { total: 0, good: 0, moderate_damage: 0, heavy_damage: 0 };
    out[cat].total += toNum(n.total, 0);
    out[cat].good += toNum(n.good, 0);
    out[cat].moderate_damage += toNum(n.moderate_damage, 0);
    out[cat].heavy_damage += toNum(n.heavy_damage, 0);
  }
  return out;
};

const aggregateRoomsByType = (roomsArr = []) => {
  const out = {};
  for (const r of roomsArr) {
    const t = String(r?.room_type ?? "").toLowerCase().trim();
    if (!t) continue;
    if (!out[t]) out[t] = { total_all: 0, available_count: 0 };
    out[t].total_all += 1;
    if (r?.available === true) out[t].available_count += 1;
  }
  return out;
};

const aggregateStaff = (arr = []) => {
  let guru = 0;
  let tendik = 0;
  const byRole = {};

  for (const r of arr) {
    const role = String(r?.role ?? "").toLowerCase().trim();
    const c = toNum(r?.count ?? 0, 0);
    if (!role) continue;
    byRole[role] = (byRole[role] || 0) + c;

    if (role.includes("guru") || role.includes("teacher")) guru += c;
    else if (
      role.includes("tendik") ||
      role.includes("staff") ||
      role.includes("pegawai") ||
      role.includes("tu") ||
      role.includes("tata usaha")
    ) {
      tendik += c;
    }
  }

  return { guru, tendik, byRole };
};

/* =========================================================
   ✅ FIX: buildRombelFromClasses (grade: kelas7_L, kelas7_P, kelaskelas7_L, dll.)
   - count fleksibel: count/jumlah/total/value
   ========================================================= */
const buildRombelFromClasses = (classesArr = []) => {
  const map = {};
  for (const r of classesArr) {
    const gRaw = pickStr(r?.grade, r?.kelas, r?.level, r?.tingkat);
    const grade = extractGradeNumber(gRaw);
    if (!grade) continue;

    const cnt = pickFirstFinite(r?.count, r?.jumlah, r?.total, r?.value, r?.qty);
    if (!Number.isFinite(Number(cnt))) continue;

    map[grade] = (map[grade] || 0) + toNum(cnt, 0);
  }

  const rows = Object.keys(map)
    .map((k) => Number(k))
    .sort((a, b) => a - b)
    .map((n) => ({ key: `kelas${n}`, label: `Kelas ${n}`, value: map[n] }));

  const total = rows.reduce((a, r) => a + toNum(r.value, 0), 0);
  return { rows, total };
};

const extractIntervensiFromProjects = (projects = []) => {
  let rehabKelas = 0;
  let pembangunanKelas = 0;
  let rehabToilet = 0;
  let pembangunanToilet = 0;

  const getName = (p) =>
    String(p?.activity_name ?? p?.kegiatan ?? p?.kegiatan_type ?? p?.type ?? p?.jenis ?? "")
      .toLowerCase()
      .trim();

  const getUnit = (p) => toNum(p?.volume ?? p?.lokal ?? p?.unit ?? p?.jumlah ?? p?.count ?? 0, 0);

  for (const p of projects) {
    const name = getName(p);
    if (!name) continue;
    const v = getUnit(p);

    const isRehab = name.includes("rehab") || name.includes("rehabilit");
    const isBangun = name.includes("pembangunan") || name.includes("bangun");

    const isToilet = name.includes("toilet") || name.includes("jamban") || name.includes("sanit");
    const isKelas = name.includes("kelas") || name.includes("rkb") || name.includes("ruang kelas");

    if (isRehab && isKelas) rehabKelas += v;
    else if (isBangun && isKelas) pembangunanKelas += v;
    else if (isRehab && isToilet) rehabToilet += v;
    else if (isBangun && isToilet) pembangunanToilet += v;
  }

  return { rehabKelas, pembangunanKelas, rehabToilet, pembangunanToilet };
};

// helper: jika total_all meta = 0, pakai total_all dari roomsByType
const applyRoomsFallbackTotalAll = (normObj, roomsByType, typeKey) => {
  const base = isObj(normObj) ? normObj : normalizeRoom({});
  const metaTotal = toNum(base?.total_all, 0);
  const tableTotal = toNum(roomsByType?.[typeKey]?.total_all, 0);
  if (metaTotal === 0 && tableTotal > 0) {
    return { ...base, total_all: tableTotal };
  }
  return base;
};

/* =========================================================
   ✅ FIX SISWA LANJUT: dukung meta langsung (siswaLanjutDalamKab, siswaLanjutLuarKab, dll.)
   ========================================================= */
const tryParseJson = (v) => {
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return v;
    try {
      return JSON.parse(s);
    } catch {
      return v;
    }
  }
  return v;
};

const normalizeLanjutObj = (src, targets) => {
  const tset = Array.isArray(targets) ? targets.map((x) => String(x).toLowerCase()) : [];
  const out = {};
  for (const t of tset) out[t] = 0;

  const x = tryParseJson(src);

  // array bentuk [{key,value}] juga didukung
  if (Array.isArray(x)) {
    for (const it of x) {
      const kk = String(it?.key ?? it?.label ?? it?.name ?? "").toLowerCase().trim();
      if (!kk) continue;
      if (!tset.includes(kk)) continue;
      out[kk] = Math.max(toNum(out[kk], 0), toNum(it?.value ?? it?.count ?? it?.jumlah ?? 0, 0));
    }
    return out;
  }

  if (!isObj(x)) return out;

  for (const k of Object.keys(x)) {
    const kk = String(k).toLowerCase().trim();
    if (!tset.includes(kk)) continue;
    out[kk] = Math.max(toNum(out[kk], 0), toNum(x[k], 0));
  }
  return out;
};

const readFlatLanjutTargets = (meta, prefixes, targets) => {
  const m = isObj(meta) ? meta : {};
  const prefs = Array.isArray(prefixes) ? prefixes : [prefixes].filter(Boolean);
  const tset = Array.isArray(targets) ? targets.map((x) => String(x).toLowerCase()) : [];

  const out = {};
  for (const t of tset) out[t] = 0;

  const upperFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  for (const t of tset) {
    const tUpper = t.toUpperCase();
    const tCap = upperFirst(t);

    let best = 0;
    let seen = false;

    for (const p of prefs) {
      const variants = [
        `${p}_${t}`,
        `${p}_${tUpper}`,
        `${p}${t}`,
        `${p}${tUpper}`,
        `${p}${tCap}`,
        `${p}_${tCap}`,
        `${upperFirst(p)}_${t}`,
        `${upperFirst(p)}_${tUpper}`,
        `${upperFirst(p)}${t}`,
        `${upperFirst(p)}${tUpper}`,
        `${upperFirst(p)}${tCap}`,
      ];

      for (const key of variants) {
        if (!(key in m)) continue;
        const n = Number(m[key]);
        if (!Number.isFinite(n)) continue;
        best = Math.max(best, n);
        seen = true;
      }
    }

    out[t] = seen ? best : 0;
  }

  return out;
};

const mergeLanjutByMax = (targets, ...objs) => {
  const tset = Array.isArray(targets) ? targets.map((x) => String(x).toLowerCase()) : [];
  const out = {};
  for (const t of tset) out[t] = 0;

  for (const o0 of objs) {
    const o = isObj(o0) ? o0 : {};
    for (const t of tset) {
      const v = o[t];
      const n = Number(v);
      if (!Number.isFinite(n)) continue;
      out[t] = Math.max(toNum(out[t], 0), n);
    }
  }
  return out;
};

const SchoolDetailSmp = ({ schoolData }) => {
  const BASE0 = unwrapPayload(schoolData);
  const BASE = isObj(BASE0) ? BASE0 : {};

  const mergedMeta0 = mergeMeta(BASE?.meta ?? BASE?._raw?.meta, BASE?.details ?? BASE?._raw?.details);
  const META = BASE?.kegiatan != null ? deepMerge(mergedMeta0, { kegiatan: BASE.kegiatan }) : mergedMeta0;

  const PR = META?.prasarana || {};
  const KL = META?.kelembagaan || {};

  // ===================== RELASI: AUTO-FETCH DARI SUPABASE (ANTI KOSONG) =====================
  const schoolIdFromPayload =
    BASE?.school_id ?? BASE?.id ?? BASE?._raw?.school_id ?? BASE?._raw?.id ?? null;

  const npsnFromPayload = pickStr(
    BASE?.npsn,
    BASE?.NPSN,
    BASE?._raw?.npsn,
    BASE?._raw?.NPSN,
    META?.npsn,
    META?.NPSN
  );

  const [relRooms, setRelRooms] = useState(null);
  const [relAssets, setRelAssets] = useState(null);
  const [relClasses, setRelClasses] = useState(null);
  const [relProjects, setRelProjects] = useState(null);

  const roomsFromPayload = Array.isArray(BASE?.rooms)
    ? BASE.rooms
    : Array.isArray(BASE?._raw?.school_rooms)
    ? BASE._raw.school_rooms
    : Array.isArray(BASE?.school_rooms)
    ? BASE.school_rooms
    : [];

  const assetsFromPayload = Array.isArray(BASE?.assets)
    ? BASE.assets
    : Array.isArray(BASE?._raw?.school_assets)
    ? BASE._raw.school_assets
    : Array.isArray(BASE?.school_assets)
    ? BASE.school_assets
    : [];

  const classesFromPayload = Array.isArray(BASE?.classes)
    ? BASE.classes
    : Array.isArray(BASE?._raw?.school_classes)
    ? BASE._raw.school_classes
    : Array.isArray(BASE?.school_classes)
    ? BASE.school_classes
    : [];

  const projectsFromPayload = Array.isArray(BASE?.projects)
    ? BASE.projects
    : Array.isArray(BASE?._raw?.school_projects)
    ? BASE._raw.school_projects
    : Array.isArray(BASE?.school_projects)
    ? BASE.school_projects
    : [];

  // Final arrays untuk UI (payload -> relasi fetch)
  const ROOMS = roomsFromPayload.length > 0 ? roomsFromPayload : Array.isArray(relRooms) ? relRooms : [];
  const ASSETS = assetsFromPayload.length > 0 ? assetsFromPayload : Array.isArray(relAssets) ? relAssets : [];
  const CLASSES = classesFromPayload.length > 0 ? classesFromPayload : Array.isArray(relClasses) ? relClasses : [];
  const PROJECTS =
    projectsFromPayload.length > 0 ? projectsFromPayload : Array.isArray(relProjects) ? relProjects : [];

  useEffect(() => {
    let cancelled = false;

    const shouldFetchRooms = roomsFromPayload.length === 0 && !Array.isArray(relRooms);
    const shouldFetchAssets = assetsFromPayload.length === 0 && !Array.isArray(relAssets);
    const shouldFetchClasses = classesFromPayload.length === 0 && !Array.isArray(relClasses);
    const shouldFetchProjects = projectsFromPayload.length === 0 && !Array.isArray(relProjects);

    if (!schoolData) return;
    if (!shouldFetchRooms && !shouldFetchAssets && !shouldFetchClasses && !shouldFetchProjects) return;

    const run = async () => {
      try {
        // Dapatkan school_id (uuid) bila perlu (rooms/assets/classes butuh school_id)
        let sid = schoolIdFromPayload;

        const needSid = (shouldFetchRooms || shouldFetchAssets || shouldFetchClasses) && !sid;
        if (needSid && npsnFromPayload) {
          const { data: rows, error } = await supabase
            .from("schools")
            .select("*")
            .eq("npsn", npsnFromPayload)
            .limit(1);
          if (error) throw error;
          const row0 = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
          sid = row0?.id ?? row0?.school_id ?? null;
        }

        if (shouldFetchRooms && sid) {
          const { data, error } = await supabase
            .from("school_rooms")
            .select("*")
            .eq("school_id", sid)
            .order("created_at", { ascending: true });
          if (!cancelled) setRelRooms(error ? [] : Array.isArray(data) ? data : []);
        }

        if (shouldFetchAssets && sid) {
          const { data, error } = await supabase
            .from("school_assets")
            .select("*")
            .eq("school_id", sid)
            .order("created_at", { ascending: true });
          if (!cancelled) setRelAssets(error ? [] : Array.isArray(data) ? data : []);
        }

        if (shouldFetchClasses && sid) {
          const { data, error } = await supabase
            .from("school_classes")
            .select("*")
            .eq("school_id", sid)
            .order("created_at", { ascending: true });
          if (!cancelled) setRelClasses(error ? [] : Array.isArray(data) ? data : []);
        }

        if (shouldFetchProjects && (sid || npsnFromPayload)) {
          let q = supabase.from("school_projects").select("*");

          if (sid && npsnFromPayload) q = q.or(`school_id.eq.${sid},npsn.eq.${npsnFromPayload}`);
          else if (sid) q = q.eq("school_id", sid);
          else q = q.eq("npsn", npsnFromPayload);

          const { data, error } = await q.order("fiscal_year", { ascending: false }).order("created_at", {
            ascending: false,
          });

          if (!cancelled) setRelProjects(error ? [] : Array.isArray(data) ? data : []);
        }
      } catch (e) {
        if (!cancelled) {
          // eslint-disable-next-line no-console
          console.warn("[SchoolDetailSmp] fetch relasi supabase gagal:", e);

          if (!Array.isArray(relRooms)) setRelRooms([]);
          if (!Array.isArray(relAssets)) setRelAssets([]);
          if (!Array.isArray(relClasses)) setRelClasses([]);
          if (!Array.isArray(relProjects)) setRelProjects([]);
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    schoolData,
    schoolIdFromPayload,
    npsnFromPayload,
    roomsFromPayload.length,
    assetsFromPayload.length,
    classesFromPayload.length,
    projectsFromPayload.length,
    relRooms,
    relAssets,
    relClasses,
    relProjects,
  ]);

  const roomsByType = aggregateRoomsByType(ROOMS);
  const assetsByCat = aggregateAssetsByCategory(ASSETS);
  const staffAgg = aggregateStaff(Array.isArray(BASE?.staff_summary) ? BASE.staff_summary : []);
  const rombelFromTable = buildRombelFromClasses(CLASSES);
  const projAgg = extractIntervensiFromProjects(PROJECTS);

  const handleLocationClick = () => {
    const coords =
      BASE?.coordinates ??
      (() => {
        const lat = Number(BASE?.lat ?? BASE?._raw?.lat ?? BASE?.latitude);
        const lng = Number(BASE?.lng ?? BASE?._raw?.lng ?? BASE?.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat];
        return null;
      })();

    const validPair =
      Array.isArray(coords) && coords.length === 2 && coords.every((n) => Number.isFinite(Number(n)));

    if (validPair) {
      let lng = Number(coords[0]);
      let lat = Number(coords[1]);

      if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
        [lat, lng] = [lng, lat];
      }

      if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }
    alert("Koordinat lokasi untuk sekolah ini tidak tersedia atau tidak valid.");
  };

  if (!schoolData) {
    return (
      <div className={styles.container}>
        <p>Data sekolah tidak ditemukan.</p>
      </div>
    );
  }

  /* ===================== I. IDENTITAS ===================== */
  const jenjang = pickStr(BASE?.jenjang, BASE?.level, BASE?.school_types?.code, META?.jenjang) || "SMP";

  const statusSekolah = pickStr(BASE?.status, BASE?.status_sekolah, META?.status) || "-";

  const desaLabel =
    pickStr(
      BASE?.desa,
      BASE?.village,
      BASE?._raw?.locations?.village,
      BASE?.village_name,
      META?.desa,
      META?.village_name
    ) || "-";

  const kecLabel =
    pickStr(
      BASE?.kecamatan,
      BASE?.kecamatan_name,
      BASE?._raw?.locations?.subdistrict,
      BASE?._raw?.locations?.district,
      META?.kecamatan,
      META?.kecamatan_name
    ) || "-";

  const alamatLabel = pickStr(BASE?.address, BASE?.alamat, BASE?._raw?.address, META?.alamat) || "-";

  const npsnLabel = pickStr(BASE?.npsn, BASE?.NPSN, BASE?._raw?.npsn, META?.npsn) || "-";

  const schoolNameLabel =
    pickStr(
      BASE?.name,
      BASE?.namaSekolah,
      BASE?.nama_sekolah,
      BASE?.school_name,
      BASE?._raw?.name,
      META?.namaSekolah
    ) || "Nama Sekolah Tidak Tersedia";

  const latLabel = pickStr(BASE?.lat, BASE?.latitude, META?.latitude, BASE?._raw?.lat);
  const lngLabel = pickStr(BASE?.lng, BASE?.longitude, META?.longitude, BASE?._raw?.lng);

  /* ===================== II. DATA SISWA ===================== */
  const siswaMetaTotals = pickTotalsFromSiswaObj(META?.siswa);
  const siswaLBase = toNum(BASE?.st_male, 0);
  const siswaPBase = toNum(BASE?.st_female, 0);
  const totalFromLP = siswaLBase + siswaPBase;

  const siswaL = totalFromLP > 0 ? siswaLBase : toNum(siswaMetaTotals.l, 0);
  const siswaP = totalFromLP > 0 ? siswaPBase : toNum(siswaMetaTotals.p, 0);

  const totalSiswa =
    siswaL + siswaP > 0
      ? siswaL + siswaP
      : toNum(BASE?.student_count, toNum(siswaMetaTotals.total, 0));

  const abkMetaTotals = pickTotalsFromSiswaObj(META?.siswaAbk);
  const abkL = toNum(abkMetaTotals.l, 0);
  const abkP = toNum(abkMetaTotals.p, 0);

  const siswaKelasRowsRaw = collectKelasGenderRows(META?.siswa);
  const abkKelasRowsRaw = collectKelasGenderRows(META?.siswaAbk);

  // ✅ wajib ada wadah kelas 7-9 meski meta kosong
  const siswaKelasRows = ensureSmpKelasRows79(siswaKelasRowsRaw);
  const abkKelasRows = ensureSmpKelasRows79(abkKelasRowsRaw);

  /* ===================== III. RUANG KELAS & RKB ===================== */
  const classrooms =
    (isObj(PR?.classrooms) && PR.classrooms) ||
    (isObj(PR?.kelas) && PR.kelas) ||
    (isObj(PR?.ruangKelas) && PR.ruangKelas) ||
    {};

  const totalRoom = toNum(
    pickFirstFinite(classrooms?.total_room, classrooms?.total, classrooms?.jumlah, BASE?.class_condition?.total_room),
    0
  );

  const rusakRingan = toNum(
    pickFirstFinite(
      classrooms?.rusakRingan,
      classrooms?.rusak_ringan,
      classrooms?.light_damage,
      classrooms?.classrooms_light_damage,
      BASE?.class_condition?.classrooms_light_damage
    ),
    0
  );

  const rusakSedang = toNum(
    pickFirstFinite(
      classrooms?.moderate_damage,
      classrooms?.classrooms_moderate_damage,
      classrooms?.moderate,
      classrooms?.rusak_sedang,
      classrooms?.rusakSedang,
      BASE?.class_condition?.classrooms_moderate_damage,
      BASE?.class_condition?.moderate_damage
    ),
    0
  );

  const rusakBerat = toNum(
    pickFirstFinite(
      classrooms?.heavy_damage,
      classrooms?.classrooms_heavy_damage,
      classrooms?.heavy,
      classrooms?.rusak_berat,
      classrooms?.rusakBerat,
      BASE?.class_condition?.classrooms_heavy_damage,
      BASE?.class_condition?.heavy_damage
    ),
    0
  );

  const rusakTotal = toNum(
    pickFirstFinite(classrooms?.rusakTotal, classrooms?.rusak_total, classrooms?.total_damage),
    0
  );

  const kelasBaik = toNum(
    pickFirstFinite(
      classrooms?.classrooms_good,
      classrooms?.good,
      classrooms?.baik,
      BASE?.class_condition?.classrooms_good,
      BASE?.class_condition?.good
    ),
    0
  );

  const kurangRkb = toNum(
    pickFirstFinite(
      classrooms?.kurangRkb,
      classrooms?.lacking_rkb,
      classrooms?.kurang_rkb,
      classrooms?.kurangRKB,
      BASE?.class_condition?.lacking_rkb
    ),
    0
  );

  const kelebihanRkb = toNum(
    pickFirstFinite(classrooms?.kelebihan, classrooms?.kelebihanRkb, classrooms?.excess_rkb),
    0
  );

  const rkbTambahan = toNum(
    pickFirstFinite(classrooms?.rkbTambahan, classrooms?.rkb_tambahan, classrooms?.need_additional_rkb),
    0
  );

  // ✅ Ketersediaan lahan untuk pembangunan (wadah wajib)
  const lahanRaw = pickStr(
    classrooms?.ketersediaan_lahan,
    classrooms?.ketersediaanLahan,
    classrooms?.lahan,
    PR?.ketersediaan_lahan,
    PR?.ketersediaanLahan
  );
  const lahanUpper = String(lahanRaw || "").trim().toUpperCase();

  const ketersediaanLahan =
    lahanUpper === "ADA" || lahanUpper === "YA" || lahanUpper === "YES" || lahanUpper === "TRUE"
      ? "Ada"
      : lahanUpper === "TIDAK" || lahanUpper === "TIDAK_ADA" || lahanUpper === "NO" || lahanUpper === "FALSE"
      ? "Tidak Ada"
      : lahanRaw
      ? formatLabelKey(lahanRaw)
      : "Tidak Ada";

  const intervensi = extractIntervensiFromMeta(META, BASE);
  const intervensiToilet = extractIntervensiToiletFromMeta(META);

  const rehabKegiatan = pickNumPreferNonZero(projAgg.rehabKelas, intervensi.rehab_unit);
  const pembangunanKegiatan = pickNumPreferNonZero(projAgg.pembangunanKelas, intervensi.pembangunan_unit);

  const rehabToiletKegiatan = pickNumPreferNonZero(projAgg.rehabToilet, intervensiToilet.rehab_toilet_unit);
  const pembangunanToiletKegiatan = pickNumPreferNonZero(
    projAgg.pembangunanToilet,
    intervensiToilet.pembangunan_toilet_unit
  );

  const allValues = [rusakBerat, rusakSedang, kurangRkb, rehabKegiatan, pembangunanKegiatan];
  const maxRoomValue = Math.max(...allValues, 1);

  const calculateHeight = (value) => {
    const numValue = Number(value) || 0;
    if (numValue === 0) return "calc(0% + 20px)";
    return `calc(${(numValue / maxRoomValue) * 100}% + 20px)`;
  };

  /* ===================== IV. STATUS TANAH & GEDUNG ===================== */
  // ✅ Kepemilikan dihapus sesuai permintaan (No IV)
  const luasTanah = pickFirstFinite(getData(PR, ["ukuran", "tanah"], 0), getData(META, ["luas_tanah"], 0), 0);
  const luasBangunan = toNum(getData(PR, ["ukuran", "bangunan"], 0), 0);
  const luasHalaman = toNum(getData(PR, ["ukuran", "halaman"], 0), 0);
  const jumlahGedung = toNum(getData(PR, ["gedung", "jumlah"], 0), 0);

  /* ===================== V. LAB & PERPUSTAKAAN ===================== */
  const roomsRoot = isObj(PR?.rooms) ? PR.rooms : {};
  const labsRoot = isObj(PR?.labs) ? PR.labs : {};

  let perpustakaan = normalizeRoom(roomsRoot?.library ?? roomsRoot?.perpustakaan ?? PR?.library ?? PR?.perpustakaan);
  perpustakaan = applyRoomsFallbackTotalAll(perpustakaan, roomsByType, "perpustakaan");

  let labKomputer = normalizeRoom(labsRoot?.laboratory_comp ?? PR?.laboratory_comp ?? PR?.lab_komputer);
  let labBahasa = normalizeRoom(
    labsRoot?.laboratory_langua ??
      labsRoot?.laboratory_language ??
      PR?.laboratory_langua ??
      PR?.laboratory_language ??
      PR?.lab_bahasa
  );
  let labIpa = normalizeRoom(labsRoot?.laboratory_ipa ?? PR?.laboratory_ipa ?? PR?.lab_ipa);
  let labFisika = normalizeRoom(labsRoot?.laboratory_fisika ?? PR?.laboratory_fisika ?? PR?.lab_fisika);
  let labBiologi = normalizeRoom(labsRoot?.laboratory_biologi ?? PR?.laboratory_biologi ?? PR?.lab_biologi);

  const totalLabMeta =
    toNum(labKomputer.total_all, 0) +
    toNum(labBahasa.total_all, 0) +
    toNum(labIpa.total_all, 0) +
    toNum(labFisika.total_all, 0) +
    toNum(labBiologi.total_all, 0);

  const labUmumFromTable = toNum(roomsByType?.laboratorium?.total_all, 0);

  /* ===================== VI. RUANG PIMPINAN & TENDIK ===================== */
  let ruangGuru = normalizeRoom(roomsRoot?.teacher_room ?? PR?.teacher_room ?? PR?.ruang_guru);
  const ruangGuruTypeKey =
    toNum(roomsByType?.guru?.total_all, 0) > 0
      ? "guru"
      : toNum(roomsByType?.ruang_guru?.total_all, 0) > 0
      ? "ruang_guru"
      : toNum(roomsByType?.ruangguru?.total_all, 0) > 0
      ? "ruangguru"
      : "guru";
  ruangGuru = applyRoomsFallbackTotalAll(ruangGuru, roomsByType, ruangGuruTypeKey);

  const ruangTU = normalizeRoom(
    roomsRoot?.administration_room ?? PR?.administration_room ?? PR?.ruang_tu ?? PR?.tata_usaha
  );

  const ruangKepsek = normalizeRoom(roomsRoot?.headmaster_room ?? PR?.headmaster_room ?? PR?.ruang_kepala_sekolah);

  let ruangUKS = normalizeRoom(roomsRoot?.uks_room ?? PR?.uks_room ?? PR?.ruang_uks);
  ruangUKS = applyRoomsFallbackTotalAll(ruangUKS, roomsByType, "uks");

  /* ===================== VII/VIII. TOILET ===================== */
  const teachersToilet = normalizeToilet(PR?.teachers_toilet ?? PR?.toilet_guru ?? PR?.toiletGuru);
  const studentsToilet = normalizeToilet(PR?.students_toilet ?? PR?.toilet_siswa ?? PR?.toiletSiswa);

  let toiletGuruMale = normalizeRoom(teachersToilet.male);
  let toiletGuruFemale = normalizeRoom(teachersToilet.female);
  let toiletSiswaMale = normalizeRoom(studentsToilet.male);
  let toiletSiswaFemale = normalizeRoom(studentsToilet.female);

  toiletGuruMale = applyRoomsFallbackTotalAll(toiletGuruMale, roomsByType, "toilet_guru_laki");
  toiletGuruFemale = applyRoomsFallbackTotalAll(toiletGuruFemale, roomsByType, "toilet_guru_perempuan");
  toiletSiswaMale = applyRoomsFallbackTotalAll(toiletSiswaMale, roomsByType, "toilet_siswa_laki");
  toiletSiswaFemale = applyRoomsFallbackTotalAll(toiletSiswaFemale, roomsByType, "toilet_siswa_perempuan");

  const toiletGuruMaleFromTable = toNum(roomsByType?.toilet_guru_laki?.total_all, 0);
  const toiletGuruFemaleFromTable = toNum(roomsByType?.toilet_guru_perempuan?.total_all, 0);
  const toiletSiswaMaleFromTable = toNum(roomsByType?.toilet_siswa_laki?.total_all, 0);
  const toiletSiswaFemaleFromTable = toNum(roomsByType?.toilet_siswa_perempuan?.total_all, 0);

  const toiletTableTotalTyped =
    toiletGuruMaleFromTable + toiletGuruFemaleFromTable + toiletSiswaMaleFromTable + toiletSiswaFemaleFromTable;

  const toiletTableAvailableTyped =
    toNum(roomsByType?.toilet_guru_laki?.available_count, 0) +
    toNum(roomsByType?.toilet_guru_perempuan?.available_count, 0) +
    toNum(roomsByType?.toilet_siswa_laki?.available_count, 0) +
    toNum(roomsByType?.toilet_siswa_perempuan?.available_count, 0);

  const toiletGabunganFromTable = toNum(roomsByType?.toiletgurusiswa?.total_all, 0);
  const toiletGabunganAvailable = toNum(roomsByType?.toiletgurusiswa?.available_count, 0);

  const toiletTableTotalAny = toiletTableTotalTyped > 0 ? toiletTableTotalTyped : toiletGabunganFromTable;
  const toiletTableAvailableAny = toiletTableAvailableTyped > 0 ? toiletTableAvailableTyped : toiletGabunganAvailable;

  const toiletMetaSum =
    toNum(toiletGuruMale.total_all, 0) +
    toNum(toiletGuruFemale.total_all, 0) +
    toNum(toiletSiswaMale.total_all, 0) +
    toNum(toiletSiswaFemale.total_all, 0);

  /* ===================== IX. FURNITUR & KOMPUTER ===================== */
  const furnitureRoot = isObj(PR?.furniture) ? PR.furniture : isObj(PR?.mebeulair) ? PR.mebeulair : {};

  const mejaObj = isObj(furnitureRoot?.tables) ? furnitureRoot.tables : {};
  const kursiObj = isObj(furnitureRoot?.chairs) ? furnitureRoot.chairs : {};
  const papanObj = isObj(furnitureRoot?.whiteboard) ? furnitureRoot.whiteboard : {};

  const mejaFromTable = assetsByCat?.tables || null;
  const kursiFromTable = assetsByCat?.chairs || null;

  const meja = pickNumPreferNonZero(mejaFromTable?.total, pickFirstFinite(mejaObj?.total, mejaObj?.total_all, mejaObj?.good));
  const kursi = pickNumPreferNonZero(
    kursiFromTable?.total,
    pickFirstFinite(kursiObj?.total, kursiObj?.total_all, kursiObj?.good)
  );

  const papanTulis = toNum(pickFirstFinite(papanObj?.total, papanObj?.total_all, papanObj?.good, PR?.papan_tulis), 0);

  const komputer = toNum(pickFirstFinite(furnitureRoot?.computer, getData(PR, ["furniture", "computer"], 0)), 0);
  const chromebook = toNum(getData(PR, ["chromebook"], 0), 0);

  // Tetap dipakai di (IX) Furnitur -> Peralatan Rumah Tangga
  const kondisiAlatRumahTangga = mapPeralatan(
    getData(PR, ["peralatanRumahTangga"], getData(KL, ["peralatanRumahTangga"], "-"))
  );

  const mejaDetail = mejaFromTable && toNum(mejaFromTable.total, 0) > 0 ? mejaFromTable : mejaObj;
  const kursiDetail = kursiFromTable && toNum(kursiFromTable.total, 0) > 0 ? kursiFromTable : kursiObj;
  const papanDetail = papanObj;

  /* ===================== X. RUMAH DINAS ===================== */
  const officialSrc = roomsRoot?.official_residences ?? PR?.official_residences ?? {};
  const official = normalizeRoom(officialSrc);

  const rumahDinasTableTotal = toNum(roomsByType?.rumahdinas?.total_all, 0);

  const rumahDinas = {
    total: pickNumPreferNonZero(pickFirstFinite(official.total_all, officialSrc?.total), rumahDinasTableTotal),
    baik: toNum(official.good, 0),
    ringan: toNum(official.light_damage, 0),
    sedang: toNum(official.moderate_damage, 0),
    berat: toNum(official.heavy_damage, 0),
    rusakTotal: toNum(official.total_damage, 0),
    totalRusak: toNum(official.total_mlh, 0),
  };

  /* ===================== XI. DATA GURU & TENDIK ===================== */
  const jumlahGuru = pickNumPreferNonZero(getData(META, ["guru", "jumlahGuru"], null), staffAgg.guru);

  const guruPns = toNum(getData(META, ["guru", "pns"], 0), 0);
  const guruPppk = toNum(getData(META, ["guru", "pppk"], 0), 0);
  const guruPppkParuh = toNum(getData(META, ["guru", "pppkParuhWaktu"], 0), 0);
  const guruNonAsnDapodik = toNum(getData(META, ["guru", "nonAsnDapodik"], 0), 0);
  const guruNonAsnTidakDapodik = toNum(getData(META, ["guru", "nonAsnTidakDapodik"], 0), 0);

  const totalGuruRincian = guruPns + guruPppk + guruPppkParuh + guruNonAsnDapodik + guruNonAsnTidakDapodik;

  const kekuranganGuru = toNum(getData(META, ["guru", "kekuranganGuru"], 0), 0);

  const tendik = pickNumPreferNonZero(getData(META, ["tendik"], null), staffAgg.tendik);

  /* ===================== XII. KELEMBAGAAN ===================== */
  const bopTenagaPeningkatanVal = getData(KL, ["bop", "tenagaPeningkatan"], "");
  const bopTenagaPeningkatan =
    Number.isFinite(Number(bopTenagaPeningkatanVal)) && String(bopTenagaPeningkatanVal) !== ""
      ? String(Number(bopTenagaPeningkatanVal))
      : "-";

  // ✅ Kondisi Alat Rumah Tangga dihapus dari KELEMBAGAAN (No XII)
  const kelembagaan = {
    pembinaan: mapSudahBelum(getData(KL, ["pembinaan"], "-")),
    asesmen: mapSudahBelum(getData(KL, ["asesmen"], "-")),
    menyelenggarakanBelajar: mapYesNo(getData(KL, ["menyelenggarakanBelajar"], "-")),
    melaksanakanRekomendasi: mapYesNo(getData(KL, ["melaksanakanRekomendasi"], "-")),
    siapDievaluasi: mapYesNo(getData(KL, ["siapDievaluasi"], "-")),
    bopPengelola: mapYesNo(getData(KL, ["bop", "pengelola"], "-")),
    bopTenagaPeningkatan,
    izinPengendalian: mapYesNo(getData(KL, ["perizinan", "pengendalian"], "-")),
    izinKelayakan: mapYesNo(getData(KL, ["perizinan", "kelayakan"], "-")),
    silabus: mapYesNo(getData(KL, ["kurikulum", "silabus"], "-")),
    kompetensiDasar: mapYesNo(getData(KL, ["kurikulum", "kompetensiDasar"], "-")),
  };

  /* ===================== XIII. ROMBEL (✅ FIX META + MERGE) ===================== */
  const rombelObj = isObj(META?.rombel) ? META.rombel : {};

  // meta bisa: kelaskelas7_L, kelas7_P, dll.
  const rombelFromMeta = buildRombelFromMeta(rombelObj);

  // gabungkan table + meta (ambil max per grade agar tidak 0 bila salah satu sumber kosong)
  const mergedRombelRows = mergeRombelRowsByMax(rombelFromTable.rows, rombelFromMeta.rows);

  // pastikan wadah 7-9 selalu ada
  const rombelRows = ensureSmpRombelRows79(mergedRombelRows);

  const totalRombel =
    rombelRows.reduce((a, r) => a + toNum(r.value, 0), 0) ||
    Math.max(toNum(rombelFromTable.total, 0), toNum(rombelFromMeta.total, 0));

  /* ===================== XIV. SISWA LANJUT (SMP: tujuan wajib) ===================== */
  const lanjutTargets = ["sma", "smk", "ma", "pontren", "pkbm"];

  // 1) struktur lama: META.lanjut
  const lanjutObj = isObj(META?.lanjut) ? META.lanjut : {};

  const lanjutDalamFromLanjut =
    (isObj(lanjutObj?.dalamKab) && lanjutObj.dalamKab) ||
    (isObj(lanjutObj?.dalam_kab) && lanjutObj.dalam_kab) ||
    (isObj(lanjutObj?.dalam_kabupaten) && lanjutObj.dalam_kabupaten) ||
    {};

  const lanjutLuarFromLanjut =
    (isObj(lanjutObj?.luarKab) && lanjutObj.luarKab) ||
    (isObj(lanjutObj?.luar_kab) && lanjutObj.luar_kab) ||
    (isObj(lanjutObj?.luar_kabupaten) && lanjutObj.luar_kabupaten) ||
    {};

  // 2) struktur baru: langsung di bawah META
  const metaDalamDirectRaw = tryParseJson(
    META?.siswaLanjutDalamKab ??
      META?.siswa_lanjut_dalam_kab ??
      META?.siswaLanjutDalam_kab ??
      META?.siswaLanjutDalamKabupaten ??
      META?.siswa_lanjut_dalam_kabupaten ??
      META?.lanjutDalamKab ??
      META?.lanjut_dalam_kab ??
      null
  );

  const metaLuarDirectRaw = tryParseJson(
    META?.siswaLanjutLuarKab ??
      META?.siswa_lanjut_luar_kab ??
      META?.siswaLanjutLuar_kab ??
      META?.siswaLanjutLuarKabupaten ??
      META?.siswa_lanjut_luar_kabupaten ??
      META?.lanjutLuarKab ??
      META?.lanjut_luar_kab ??
      null
  );

  const metaDalamDirect = normalizeLanjutObj(metaDalamDirectRaw, lanjutTargets);
  const metaLuarDirect = normalizeLanjutObj(metaLuarDirectRaw, lanjutTargets);

  // 3) fallback flat key per target
  const flatDalam = readFlatLanjutTargets(
    META,
    ["siswaLanjutDalamKab", "siswa_lanjut_dalam_kab", "siswaLanjutDalam_kab", "lanjutDalamKab", "lanjut_dalam_kab"],
    lanjutTargets
  );

  const flatLuar = readFlatLanjutTargets(
    META,
    ["siswaLanjutLuarKab", "siswa_lanjut_luar_kab", "siswaLanjutLuar_kab", "lanjutLuarKab", "lanjut_luar_kab"],
    lanjutTargets
  );

  // merge semua sumber dengan max per target
  const lanjutDalamObj = mergeLanjutByMax(
    lanjutTargets,
    normalizeLanjutObj(lanjutDalamFromLanjut, lanjutTargets),
    metaDalamDirect,
    flatDalam
  );

  const lanjutLuarObj = mergeLanjutByMax(
    lanjutTargets,
    normalizeLanjutObj(lanjutLuarFromLanjut, lanjutTargets),
    metaLuarDirect,
    flatLuar
  );

  // Tidak Lanjut & Bekerja
  const lanjutTidak = toNum(
    pickFirstFinite(
      lanjutObj?.tidakLanjut,
      lanjutObj?.tidak_lanjut,
      META?.siswaTidakLanjut,
      META?.siswa_tidak_lanjut,
      META?.tidakLanjut,
      META?.tidak_lanjut,
      META?.siswaLanjutTidak,
      META?.siswa_lanjut_tidak
    ),
    0
  );

  const lanjutBekerja = toNum(pickFirstFinite(lanjutObj?.bekerja, META?.siswaBekerja, META?.siswa_bekerja, META?.bekerja), 0);

  const lanjutDalamRows = ensureLanjutTargets(lanjutDalamObj, lanjutTargets);
  const lanjutLuarRows = ensureLanjutTargets(lanjutLuarObj, lanjutTargets);

  /* ===================== XV. RENCANA KEGIATAN FISIK ===================== */
  const kf = isObj(META?.kegiatanFisik) ? META.kegiatanFisik : {};
  const kfRehabRuangKelas = toNum(
    pickFirstFinite(kf?.rehab_unit, kf?.rehabRuangKelas, kf?.rehab_ruang_kelas, rehabKegiatan),
    0
  );
  const kfPembangunanRKB = toNum(
    pickFirstFinite(kf?.pembangunan_unit, kf?.pembangunanRKB, kf?.pembangunan_rkb, pembangunanKegiatan),
    0
  );
  const kfRehabToilet = toNum(pickFirstFinite(kf?.rehabToilet, kf?.rehab_toilet, rehabToiletKegiatan), 0);
  const kfPembangunanToilet = toNum(
    pickFirstFinite(kf?.pembangunanToilet, kf?.pembangunan_toilet, pembangunanToiletKegiatan),
    0
  );

  return (
    <div className={styles.container}>
      {/* ===================== I. IDENTITAS SEKOLAH ===================== */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{schoolNameLabel}</h1>
        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jenjang</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{jenjang}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Status</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{statusSekolah}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{npsnLabel}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{alamatLabel}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{desaLabel}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{kecLabel}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Latitude</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{pickStr(latLabel) || "-"}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Longitude</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{pickStr(lngLabel) || "-"}</span>
          </div>

          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa (Total)</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{totalSiswa}</span>
          </div>
        </div>

        <button onClick={handleLocationClick} className={styles.locationButton}>
          📍 Lihat Lokasi di Google Maps
        </button>
      </div>

      {/* ===================== II. DATA SISWA ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>II. Data Siswa</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Siswa Laki-Laki: {siswaL}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Siswa Perempuan: {siswaP}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Siswa (Total): {totalSiswa}</span>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rincian Siswa Reguler per Kelas</h3>
            {siswaKelasRows.map((r) => (
              <div key={`siswa-${r.key}`} className={styles.dataRow}>
                <span>
                  {r.label} — L: {r.male} | P: {r.female} | Total: {r.total}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Siswa Berkebutuhan Khusus</h3>
            <div className={styles.dataRow}>
              <span>ABK Laki-Laki: {abkL}</span>
            </div>
            <div className={styles.dataRow}>
              <span>ABK Perempuan: {abkP}</span>
            </div>

            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Rincian ABK per Kelas</h3>
              {abkKelasRows.map((r) => (
                <div key={`abk-${r.key}`} className={styles.dataRow}>
                  <span>
                    {r.label} — L: {r.male} | P: {r.female} | Total: {r.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== III. KONDISI & INTERVENSI RUANG KELAS ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>III. Kondisi & Intervensi Ruang Kelas</h2>
        <div className={styles.card}>
          {/* MODE GRAFIK BATANG TIDAK DIHAPUS */}
          <div className={styles.chartContainer}>
            <div className={styles.chart}>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barRed}`} style={{ height: calculateHeight(rusakBerat) }}>
                  <span className={styles.barLabel}>{rusakBerat}</span>
                </div>
                <span className={styles.barText}>Rusak Berat</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barYellow}`} style={{ height: calculateHeight(rusakSedang) }}>
                  <span className={styles.barLabel}>{rusakSedang}</span>
                </div>
                <span className={styles.barText}>Rusak Sedang</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barBlue}`} style={{ height: calculateHeight(kurangRkb) }}>
                  <span className={styles.barLabel}>{kurangRkb}</span>
                </div>
                <span className={styles.barText}>Kurang RKB</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barPurple}`} style={{ height: calculateHeight(rehabKegiatan) }}>
                  <span className={styles.barLabel}>{rehabKegiatan}</span>
                </div>
                <span className={styles.barText}>Rehabilitasi</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.barOrange}`} style={{ height: calculateHeight(pembangunanKegiatan) }}>
                  <span className={styles.barLabel}>{pembangunanKegiatan}</span>
                </div>
                <span className={styles.barText}>Pembangunan RKB</span>
              </div>
            </div>
          </div>

          <div className={styles.dataRow}>
            <span>Jumlah Ruang Kelas (Total): {totalRoom}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Kelas Baik (Total): {kelasBaik}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Kelas Rusak Ringan: {rusakRingan}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Kelas Rusak Sedang: {rusakSedang}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Kelas Rusak Berat: {rusakBerat}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Total: {rusakTotal}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan RKB: {kurangRkb}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kelebihan Ruang Kelas: {kelebihanRkb}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kebutuhan Ruang Kelas Tambahan: {rkbTambahan}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ketersediaan Lahan: {ketersediaanLahan}</span>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rencana Kegiatan Fisik Toilet</h3>
            <div className={styles.dataRow}>
              <span>Rehabilitasi Toilet: {rehabToiletKegiatan}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Pembangunan Toilet: {pembangunanToiletKegiatan}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== IV. STATUS TANAH, GEDUNG & BANGUNAN ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>IV. Status Tanah, Gedung & Bangunan</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Tanah</h3>
            {/* ✅ Kepemilikan dihapus (No IV) */}
            <div className={styles.dataRow}>
              <span>
                Luas Tanah: {luasTanah} m{"\u00B2"}
              </span>
            </div>
            <div className={styles.dataRow}>
              <span>
                Luas Bangunan: {luasBangunan} m{"\u00B2"}
              </span>
            </div>
            <div className={styles.dataRow}>
              <span>
                Luas Halaman: {luasHalaman} m{"\u00B2"}
              </span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Gedung</h3>
            {/* ✅ Kepemilikan dihapus (No IV) */}
            <div className={styles.dataRow}>
              <span>Jumlah Gedung: {jumlahGedung}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== V. PERPUSTAKAAN & LABORATORIUM ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>V. Perpustakaan & Laboratorium</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Perpustakaan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {perpustakaan.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {perpustakaan.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {perpustakaan.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {perpustakaan.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {perpustakaan.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {perpustakaan.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {perpustakaan.total_all}</span>
            </div>
          </div>

          {totalLabMeta === 0 && labUmumFromTable > 0 ? (
            <div className={styles.subsection}>
              <h3 className={styles.subsectionTitle}>Laboratorium (Dari Tabel)</h3>
              <div className={styles.dataRow}>
                <span>Jumlah Laboratorium (Total): {labUmumFromTable}</span>
              </div>
            </div>
          ) : null}

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Komputer</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labKomputer.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {labKomputer.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labKomputer.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labKomputer.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labKomputer.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {labKomputer.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labKomputer.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Bahasa</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labBahasa.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {labBahasa.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labBahasa.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labBahasa.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labBahasa.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {labBahasa.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labBahasa.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. IPA</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labIpa.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {labIpa.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labIpa.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labIpa.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labIpa.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {labIpa.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labIpa.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Fisika</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labFisika.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {labFisika.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labFisika.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labFisika.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labFisika.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {labFisika.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labFisika.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lab. Biologi</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {labBiologi.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {labBiologi.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {labBiologi.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {labBiologi.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {labBiologi.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {labBiologi.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {labBiologi.total_all}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VI. RUANG PIMPINAN & TENDIK ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VI. Ruang Pimpinan & Tenaga Kependidikan</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Kepala Sekolah</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangKepsek.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {ruangKepsek.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangKepsek.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangKepsek.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangKepsek.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {ruangKepsek.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangKepsek.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Guru</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangGuru.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {ruangGuru.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangGuru.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangGuru.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangGuru.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {ruangGuru.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangGuru.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang Tata Usaha</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangTU.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {ruangTU.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangTU.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangTU.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangTU.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {ruangTU.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangTU.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Ruang UKS</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {ruangUKS.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {ruangUKS.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {ruangUKS.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {ruangUKS.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Ruang Rusak: {ruangUKS.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {ruangUKS.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Ruang (Total): {ruangUKS.total_all}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VII. TOILET GURU ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VII. Toilet Guru</h2>
        <div className={styles.card}>
          {toiletMetaSum === 0 && toiletTableTotalAny > 0 ? (
            <div className={styles.dataRow}>
              <span>
                Toilet (Dari Tabel): {toiletTableTotalAny}{" "}
                {toiletTableAvailableAny > 0 ? `(Tersedia: ${toiletTableAvailableAny})` : ""}
              </span>
            </div>
          ) : null}

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletGuruMale.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {toiletGuruMale.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletGuruMale.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletGuruMale.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletGuruMale.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {toiletGuruMale.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletGuruMale.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletGuruFemale.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {toiletGuruFemale.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletGuruFemale.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletGuruFemale.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletGuruFemale.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {toiletGuruFemale.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletGuruFemale.total_all}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== VIII. TOILET SISWA ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>VIII. Toilet Siswa</h2>
        <div className={styles.card}>
          {toiletMetaSum === 0 && toiletTableTotalAny > 0 ? (
            <div className={styles.dataRow}>
              <span>
                Toilet (Dari Tabel): {toiletTableTotalAny}{" "}
                {toiletTableAvailableAny > 0 ? `(Tersedia: ${toiletTableAvailableAny})` : ""}
              </span>
            </div>
          ) : null}

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletSiswaMale.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {toiletSiswaMale.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletSiswaMale.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletSiswaMale.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletSiswaMale.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {toiletSiswaMale.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletSiswaMale.total_all}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Kondisi Baik: {toiletSiswaFemale.good}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Ringan: {toiletSiswaFemale.light_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Sedang: {toiletSiswaFemale.moderate_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Berat: {toiletSiswaFemale.heavy_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Rusak: {toiletSiswaFemale.total_mlh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Rusak Total: {toiletSiswaFemale.total_damage}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Total: {toiletSiswaFemale.total_all}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== IX. FURNITUR & KOMPUTER ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>IX. Furnitur & Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Meja: {meja}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Kursi: {kursi}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Papan Tulis: {papanTulis}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Komputer: {komputer}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Chromebook: {chromebook}</span>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Peralatan Rumah Tangga</h3>
            <div className={styles.dataRow}>
              <span>Kondisi: {kondisiAlatRumahTangga}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rincian Kondisi Furnitur</h3>

            {/* ✅ Rusak Sedang dihapus (No IX) */}
            <div className={styles.dataRow}>
              <span>
                Meja — Total: {formatMaybeNumber(mejaDetail?.total ?? mejaDetail?.total_all ?? 0, 0)} | Baik:{" "}
                {formatMaybeNumber(mejaDetail?.good ?? 0, 0)} | Rusak Berat:{" "}
                {formatMaybeNumber(mejaDetail?.heavy_damage ?? 0, 0)}
              </span>
            </div>
            <div className={styles.dataRow}>
              <span>
                Kursi — Total: {formatMaybeNumber(kursiDetail?.total ?? kursiDetail?.total_all ?? 0, 0)} | Baik:{" "}
                {formatMaybeNumber(kursiDetail?.good ?? 0, 0)} | Rusak Berat:{" "}
                {formatMaybeNumber(kursiDetail?.heavy_damage ?? 0, 0)}
              </span>
            </div>
            <div className={styles.dataRow}>
              <span>
                Papan Tulis — Total: {formatMaybeNumber(papanDetail?.total ?? papanDetail?.total_all ?? 0, 0)} | Baik:{" "}
                {formatMaybeNumber(papanDetail?.good ?? 0, 0)} | Rusak Berat:{" "}
                {formatMaybeNumber(papanDetail?.heavy_damage ?? 0, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== X. RUMAH DINAS ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>X. Rumah Dinas</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Rumah Dinas: {rumahDinas.total}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Baik: {rumahDinas.baik}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Ringan: {rumahDinas.ringan}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Sedang: {rumahDinas.sedang}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Berat: {rumahDinas.berat}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Rusak: {rumahDinas.totalRusak}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rusak Total: {rumahDinas.rusakTotal}</span>
          </div>
        </div>
      </div>

      {/* ===================== XI. DATA GURU & TENDIK ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>XI. Data Guru & Tendik</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Guru: {jumlahGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Guru: {kekuranganGuru}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Tenaga Kependidikan (Tendik): {tendik}</span>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Rincian Guru</h3>
            <div className={styles.dataRow}>
              <span>Guru PNS: {guruPns}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Guru PPPK: {guruPppk}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Guru PPPK (paruh waktu): {guruPppkParuh}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Guru Non-ASN (terdata di Dapodik): {guruNonAsnDapodik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Guru Non-ASN (tidak terdata di Dapodik): {guruNonAsnTidakDapodik}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Guru dari Rincian: {totalGuruRincian}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== XII. KELEMBAGAAN ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>XII. Kelembagaan</h2>
        <div className={styles.card}>
          {/* ✅ Kondisi Alat Rumah Tangga dihapus dari sini (No XII) */}
          <div className={styles.dataRow}>
            <span>Pembinaan: {kelembagaan.pembinaan}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Asesmen: {kelembagaan.asesmen}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Menyelenggarakan Belajar: {kelembagaan.menyelenggarakanBelajar}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Melaksanakan Rekomendasi: {kelembagaan.melaksanakanRekomendasi}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Siap Dievaluasi: {kelembagaan.siapDievaluasi}</span>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>BOP</h3>
            <div className={styles.dataRow}>
              <span>Pengelola: {kelembagaan.bopPengelola}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Tenaga Peningkatan: {kelembagaan.bopTenagaPeningkatan}</span>
            </div>
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perizinan & Kurikulum</h3>
            <div className={styles.dataRow}>
              <span>Izin Pengendalian: {kelembagaan.izinPengendalian}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Izin Kelayakan: {kelembagaan.izinKelayakan}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Silabus: {kelembagaan.silabus}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kompetensi Dasar: {kelembagaan.kompetensiDasar}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== XIII. ROMBEL ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>XIII. Rombel</h2>
        <div className={styles.card}>
          {rombelRows.map((r) => (
            <div key={`rombel-${r.key}`} className={styles.dataRow}>
              <span>
                {r.label}: {r.value}
              </span>
            </div>
          ))}
          <div className={styles.dataRow}>
            <span>Total Rombel: {totalRombel}</span>
          </div>
        </div>
      </div>

      {/* ===================== XIV. SISWA LANJUT ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>XIV. Siswa Lanjut</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Dalam Kabupaten</h3>
            {lanjutDalamRows.map((r) => (
              <div key={`lanjut-dalam-${r.key}`} className={styles.dataRow}>
                <span>
                  {r.label}: {r.value}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Luar Kabupaten</h3>
            {lanjutLuarRows.map((r) => (
              <div key={`lanjut-luar-${r.key}`} className={styles.dataRow}>
                <span>
                  {r.label}: {r.value}
                </span>
              </div>
            ))}
          </div>

          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Lainnya</h3>
            <div className={styles.dataRow}>
              <span>Tidak Lanjut: {lanjutTidak}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Bekerja: {lanjutBekerja}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== XV. RENCANA KEGIATAN FISIK ===================== */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>XV. Rencana Kegiatan Fisik</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Rehabilitasi Ruang Kelas: {kfRehabRuangKelas}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Pembangunan Ruang Kelas Baru (RKB): {kfPembangunanRKB}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rehabilitasi Toilet: {kfRehabToilet}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Pembangunan Toilet: {kfPembangunanToilet}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDetailSmp;
