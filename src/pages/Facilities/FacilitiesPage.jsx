// src/pages/Facilities/FacilitiesPage.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  memo,
  lazy,
  startTransition,
  useDeferredValue,
} from "react";
import styles from "./FacilitiesPage.module.css";

const ChartsSection = lazy(() => import("./ChartsSection"));
import ChartSkeleton from "./ChartSkeleton";
import ErrorBoundary from "@/components/common/ErrorBoundary.jsx";

// Detail di tab baru (tetap lazy)
const SchoolDetailPaud = lazy(() =>
  import("../../components/schools/SchoolDetail/Paud/SchoolDetailPaud")
);
const SchoolDetailSd = lazy(() =>
  import("../../components/schools/SchoolDetail/Sd/SchoolDetailSd")
);
const SchoolDetailSmp = lazy(() =>
  import("../../components/schools/SchoolDetail/Smp/SchoolDetailSmp")
);
const SchoolDetailPkbm = lazy(() =>
  import("../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm")
);

import {
  getSdDetailByNpsn,
  getSmpDetailByNpsn,
  getPaudDetailByNpsn,
  getPkbmDetailByNpsn,
} from "@/services/api/detailApi";

import supabase from "@/services/supabaseClient";

/* =====================================================================
   PERF: Cache in-memory (tanpa mengubah hasil)
   - Mencegah re-fetch berat kalau komponen remount (navigasi bolak-balik)
   - TTL singkat agar tidak "ngunci" data selamanya
===================================================================== */
const __FACILITIES_CACHE__ = {
  main: null, // { ts, viewRows, jenjangBundle, projectRows }
  rpc: null, // { ts, pembangunanRow, intervensiRow }
};
const __FACILITIES_CACHE_TTL_MS__ = 3 * 60 * 1000; // 3 menit

const getFreshCache = (entry) => {
  if (!entry || !entry.ts) return null;
  const age = Date.now() - entry.ts;
  return age >= 0 && age <= __FACILITIES_CACHE_TTL_MS__ ? entry : null;
};

/* =====================================================================
   Helpers umum
===================================================================== */
function pickFirst(obj, keys, fallback = null) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
}

function ensureObject(x) {
  return x && typeof x === "object" ? x : {};
}

const norm = (x) =>
  String(x == null ? "" : x)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

const keyify = (x) =>
  norm(x)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

/**
 * Normalisasi key NPSN agar duplikasi karena format berbeda tidak terhitung ganda.
 * - Pertahankan digit apa adanya untuk string numeric normal.
 * - Jika format "12345678.0" -> "12345678"
 * - Fallback ke keyify bila bukan numeric murni.
 */
const normalizeNpsnKey = (x) => {
  const s = norm(x);
  if (!s) return "";

  // "12345678.0" / "12345678.00" -> "12345678"
  if (/^\d+\.\d+$/.test(s)) {
    const f = Number(s);
    if (Number.isFinite(f) && Number.isInteger(f)) return String(f);
  }

  // numeric murni -> pakai apa adanya (jaga leading zero)
  if (/^\d+$/.test(s)) return s;

  // kalau campur, ambil digit jika cukup panjang (umumnya NPSN 8 digit)
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 6) return digits;

  return keyify(s);
};

const isCodeLike = (v) => {
  const s = String(v || "").trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (/^id[0-9]{6,}$/.test(lower)) return true;
  if (/^[0-9]{6,}$/.test(s)) return true;
  if (s.length > 8 && /[0-9]{6,}/.test(s)) return true;
  return false;
};

const normKecamatanLabel = (x) =>
  norm(x)
    .replace(/^KEC(?:AMATAN)?\./i, "")
    .replace(/^KEC(?:AMATAN)?\s+/i, "")
    .replace(/^KAB(?:UPATEN)?\./i, "")
    .replace(/^KAB(?:UPATEN)?\s+/i, "")
    .trim();

const scheduleMicrotask = (fn) => {
  if (typeof queueMicrotask === "function") return queueMicrotask(fn);
  return setTimeout(fn, 0);
};

const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

const tryParseJson = (s) => {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

// Evidence = ada “bentuk data” (keys ada) atau angka eksplisit, meski nilainya 0.
const hasEvidence = (x) => {
  if (x == null) return false;

  if (typeof x === "number") return true;

  if (typeof x === "string") {
    const s = x.trim();
    if (!s) return false;

    if (/^-?\d+(\.\d+)?$/.test(s)) return true;

    const p = tryParseJson(s);
    if (p && typeof p === "object" && !Array.isArray(p)) {
      return Object.keys(p).length > 0;
    }
    return false;
  }

  if (typeof x === "object") {
    if (Array.isArray(x)) return x.length > 0;
    return Object.keys(x).length > 0;
  }

  return false;
};

/* =====================================================================
   Mapping Jenjang dari schools.school_type_id
   1: PAUD, 2: PKBM, 3: SD, 4: SMP
===================================================================== */
const SCHOOL_TYPE_ID_TO_JENJANG = {
  1: "PAUD",
  2: "PKBM",
  3: "SD",
  4: "SMP",
};

/* =====================================================================
   ✅ RPC FINAL (Supabase) — Sesuai target dashboard
===================================================================== */
async function fetchPembangunanPieRpc() {
  const { data, error } = await supabase.rpc("rpc_toilet_pembangunan_pie_final");
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  const totalTarget = toInt(row.total_target) || 1186;

  return {
    kebutuhan_belum_dibangun: toInt(row.kebutuhan_belum_dibangun),
    pembangunan_dilakukan: toInt(row.pembangunan_dilakukan),
    total_target: totalTarget,
  };
}

async function fetchIntervensiBarRpc(p_tahun = null) {
  const { data, error } = await supabase.rpc("rpc_toilet_intervensi_barchart_final", {
    p_tahun: p_tahun == null ? null : toInt(p_tahun),
  });
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    total_intervensi: toInt(row.total_intervensi),
    pembangunan_toilet: toInt(row.pembangunan_toilet),
    rehabilitasi_toilet: toInt(row.rehabilitasi_toilet),
  };
}

function buildPembangunanPieDataFromRpc(rpcRow) {
  const belum = toInt(rpcRow?.kebutuhan_belum_dibangun);
  const done = toInt(rpcRow?.pembangunan_dilakukan);

  // wajib pakai target 1186 (atau dari RPC bila sudah benar)
  const totalTarget = toInt(rpcRow?.total_target) || 1186;
  const denom = totalTarget > 0 ? totalTarget : 1186;

  const slices = [
    {
      name: "Kebutuhan Toilet (Belum dibangun)",
      value: belum,
      actualCount: belum,
      percent: denom > 0 ? (belum / denom) * 100 : 0,
      color: "#FF6B6B",
    },
    {
      name: "Pembangunan dilakukan",
      value: done,
      actualCount: done,
      percent: denom > 0 ? (done / denom) * 100 : 0,
      color: "#4ECDC4",
    },
  ];

  const hasAny = slices.some((d) => d.value > 0);
  if (!hasAny) {
    return [
      {
        name: "Tidak Ada Data",
        value: 1,
        actualCount: 0,
        percent: 100,
        color: "#95A5A6",
      },
    ];
  }

  return slices;
}

function buildIntervensiBarDataFromRpc(rpcRow) {
  const total = toInt(rpcRow?.total_intervensi);
  const build = toInt(rpcRow?.pembangunan_toilet);
  const rehab = toInt(rpcRow?.rehabilitasi_toilet);

  return [
    { name: "Total Intervensi", value: total, color: "#667eea" },
    { name: "Pembangunan Toilet", value: build, color: "#4ECDC4" },
    { name: "Rehab Toilet", value: rehab, color: "#FFD93D" },
  ];
}

/* =====================================================================
   Fetch all paged (biar tidak kepotong limit)
===================================================================== */
async function fetchAllPaged(builderFactory, pageSize = 2000) {
  let from = 0;
  let all = [];
  for (let i = 0; i < 300; i++) {
    const { data, error } = await builderFactory().range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data || [];
    all = all.concat(rows);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

/* =====================================================================
   ✅ FIX UTAMA: Fetch VIEW schools_with_details (ANTI 400 SELECT)
===================================================================== */
const VIEW_COL_ALIASES = {
  id: ["id", "school_id", "id_sekolah"],
  npsn: ["npsn", "npsn_sekolah"],
  name: ["name", "nama_sekolah", "nama", "school_name"],
  subdistrict: ["subdistrict", "kecamatan", "nama_kecamatan", "district_name"],
  village_name: ["village_name", "desa", "desa_kelurahan", "kelurahan", "village"],
  address: ["address", "alamat"],
  status: ["status", "status_sekolah", "tipe", "jenis", "kepemilikan"],
  student_count: ["student_count", "jumlah_siswa", "siswa", "total_siswa"],

  // kolom "ketok palu"
  toilet_baik_calc: ["toilet_baik_calc", "toilet_baik", "baik_units", "baik_unit"],
  toilet_sedang_calc: [
    "toilet_sedang_calc",
    "toilet_rusak_sedang",
    "rusak_sedang",
    "sedang_units",
    "sedang_unit",
  ],
  toilet_berat_calc: [
    "toilet_berat_calc",
    "toilet_rusak_berat",
    "rusak_berat",
    "berat_units",
    "berat_unit",
  ],
  total_toilet_calc: [
    "total_toilet_calc",
    "toilet_total",
    "toilet_total_unit",
    "total_units",
    "total_unit",
  ],

  rehab_toilet_count: ["rehab_toilet_count", "rehab_toilet_units", "rehab_unit", "rehab_units"],
  pembangunan_toilet_count: [
    "pembangunan_toilet_count",
    "build_toilet_count",
    "pembangunan_unit",
    "pembangunan_units",
  ],

  activity_name: ["activity_name", "kegiatan", "nama_kegiatan"],
  volume: ["volume", "vol", "jumlah", "unit", "units"],
  fiscal_year: ["fiscal_year", "tahun_anggaran", "year", "tahun"],

  facilities: ["facilities", "fasilitas"],
  class_condition: ["class_condition", "kondisi_kelas", "kelas_kondisi"],
};

function buildDynamicViewSelect(availableCols) {
  const avail = new Set((availableCols || []).map((c) => String(c || "")));

  const pickCol = (candidates) => {
    for (const c of candidates || []) {
      if (avail.has(c)) return c;
    }
    return null;
  };

  // urutan ini penting agar downstream code tetap stabil
  const aliasOrder = [
    "id",
    "npsn",
    "name",
    "subdistrict",
    "village_name",
    "address",
    "status",
    "student_count",
    "toilet_baik_calc",
    "toilet_sedang_calc",
    "toilet_berat_calc",
    "total_toilet_calc",
    "rehab_toilet_count",
    "pembangunan_toilet_count",
    "activity_name",
    "volume",
    "fiscal_year",
    "facilities",
    "class_condition",
  ];

  const parts = [];
  for (const alias of aliasOrder) {
    const col = pickCol(VIEW_COL_ALIASES[alias]);
    if (!col) continue;

    // PostgREST alias syntax: alias:column
    parts.push(col === alias ? alias : `${alias}:${col}`);
  }

  return parts.join(",");
}

async function probeViewColumns() {
  // Probe tanpa order untuk menghindari error order col missing
  const { data, error } = await supabase.from("schools_with_details").select("*").limit(1);
  if (error) throw error;

  const row = data && data[0] ? data[0] : null;
  if (!row) return [];
  return Object.keys(row);
}

async function fetchViewRows() {
  // 1) coba probe kolom
  let cols = [];
  try {
    cols = await probeViewColumns();
  } catch (e) {
    cols = [];
  }

  // 2) bangun select dinamis (alias -> nama yang kode pakai)
  const dynamicSelect = cols.length ? buildDynamicViewSelect(cols) : "";

  // fallback select (kalau probe gagal / view kosong)
  const fallbackSelect =
    "id,npsn,name,subdistrict,village_name,address,status,student_count,toilet_baik_calc,toilet_sedang_calc,toilet_berat_calc,total_toilet_calc,rehab_toilet_count,pembangunan_toilet_count,activity_name,volume,fiscal_year,facilities,class_condition";

  const select = dynamicSelect || fallbackSelect;

  // Tentukan kolom order yang aman
  const canOrderByNpsn = cols.length ? cols.includes("npsn") || cols.includes("npsn_sekolah") : true;

  // 3) fetch paging: (a) dengan order jika aman, (b) tanpa order, (c) last resort select('*')
  try {
    if (canOrderByNpsn) {
      return await fetchAllPaged(
        () =>
          supabase
            .from("schools_with_details")
            .select(select)
            .order("npsn", { ascending: true }),
        2000
      );
    }

    return await fetchAllPaged(() => supabase.from("schools_with_details").select(select), 2000);
  } catch (e1) {
    // coba tanpa order
    try {
      return await fetchAllPaged(() => supabase.from("schools_with_details").select(select), 2000);
    } catch (e2) {
      // last resort: ambil semua kolom (berat, tapi menyelamatkan dashboard dari kosong)
      const rows = await fetchAllPaged(() => supabase.from("schools_with_details").select("*"), 2000);

      return (rows || []).map((r) => {
        const rr = { ...(r || {}) };

        // manual alias untuk yang paling sering beda nama (jaga kompatibilitas)
        if (rr.name == null) rr.name = rr.nama_sekolah ?? rr.nama ?? rr.school_name ?? rr.name;
        if (rr.subdistrict == null) rr.subdistrict = rr.kecamatan ?? rr.nama_kecamatan ?? rr.subdistrict;
        if (rr.village_name == null)
          rr.village_name = rr.desa ?? rr.desa_kelurahan ?? rr.kelurahan ?? rr.village_name;

        if (rr.address == null) rr.address = rr.alamat ?? rr.address;

        // calc
        if (rr.toilet_baik_calc == null)
          rr.toilet_baik_calc = rr.toilet_baik ?? rr.baik_units ?? rr.toilet_baik_calc;
        if (rr.toilet_sedang_calc == null)
          rr.toilet_sedang_calc =
            rr.toilet_rusak_sedang ?? rr.rusak_sedang ?? rr.sedang_units ?? rr.toilet_sedang_calc;
        if (rr.toilet_berat_calc == null)
          rr.toilet_berat_calc =
            rr.toilet_rusak_berat ?? rr.rusak_berat ?? rr.berat_units ?? rr.toilet_berat_calc;
        if (rr.total_toilet_calc == null)
          rr.total_toilet_calc = rr.toilet_total ?? rr.total_units ?? rr.total_unit ?? rr.total_toilet_calc;

        if (rr.rehab_toilet_count == null)
          rr.rehab_toilet_count = rr.rehab_toilet_units ?? rr.rehab_units ?? rr.rehab_unit ?? rr.rehab_toilet_count;
        if (rr.pembangunan_toilet_count == null)
          rr.pembangunan_toilet_count =
            rr.build_toilet_count ?? rr.pembangunan_units ?? rr.pembangunan_unit ?? rr.pembangunan_toilet_count;

        if (rr.fiscal_year == null) rr.fiscal_year = rr.tahun_anggaran ?? rr.year ?? rr.fiscal_year;

        return rr;
      });
    }
  }
}

/* =====================================================================
   Jenjang mapping dari schools.school_type_id (sesuai requirement)
===================================================================== */
async function fetchJenjangMap() {
  const rows = await fetchAllPaged(
    () => supabase.from("schools").select(`id, npsn, school_type_id`).order("npsn", { ascending: true }),
    2000
  );

  const mapNpsnToJenjang = new Map();
  const mapSchoolIdToNpsn = new Map();

  for (const r of rows || []) {
    const raw = String(r?.npsn || "").trim();
    const npsnKey = normalizeNpsnKey(raw);
    const sid = r?.id || null;

    if (sid && npsnKey) mapSchoolIdToNpsn.set(String(sid), npsnKey);

    if (!npsnKey) continue;
    const stid = toInt(r?.school_type_id);
    const jenjang = SCHOOL_TYPE_ID_TO_JENJANG[stid] || "UNKNOWN";
    mapNpsnToJenjang.set(npsnKey, jenjang);
  }

  return { mapNpsnToJenjang, mapSchoolIdToNpsn };
}

/* =====================================================================
   Ambil kegiatan dari school_projects (sumber intervensi)
===================================================================== */
async function fetchProjectRows() {
  const select = `school_id, npsn, activity_name, volume, fiscal_year`;
  return await fetchAllPaged(
    () => supabase.from("school_projects").select(select).order("fiscal_year", { ascending: false }),
    2000
  );
}

/* =====================================================================
   Toilet counters (robust) - dipakai untuk parsing payload jika diperlukan
===================================================================== */
const readToiletCounters = (raw) => {
  let o = raw;

  if (typeof raw === "string") {
    const s = raw.trim();
    if (/^-?\d+(\.\d+)?$/.test(s)) o = { total: toInt(s) };
    else o = tryParseJson(s) || {};
  } else if (typeof raw === "number") {
    o = { total: toInt(raw) };
  } else if (!raw || typeof raw !== "object") {
    o = {};
  }

  const safe = (v) => (v && typeof v === "object" ? v : {});
  const pick = (obj, keys) => {
    const oo = safe(obj);
    for (const k of keys) {
      if (oo[k] != null && oo[k] !== "") return toInt(oo[k]);
    }
    return 0;
  };

  const KEYS = {
    good: ["good", "baik", "toilet_baik", "unit_baik"],
    moderate: [
      "moderate_damage",
      "rusak_sedang",
      "rusakSedang",
      "sedang",
      "toilet_rusak_sedang",
      "unit_rusak_sedang",
    ],
    heavy: [
      "heavy_damage",
      "rusak_berat",
      "rusakBerat",
      "berat",
      "toilet_rusak_berat",
      "unit_rusak_berat",
    ],
    total: [
      "total",
      "jumlah",
      "toilets_total",
      "toilet_total",
      "total_toilet",
      "totalToilet",
      "totalUnit",
      "total_unit",
      "unit",
      "toilet_total_unit",
      "toilet_units_total",
    ],
  };

  if ("male" in o || "female" in o) {
    const m = safe(o.male);
    const f = safe(o.female);

    const good = pick(m, KEYS.good) + pick(f, KEYS.good);
    const moderate = pick(m, KEYS.moderate) + pick(f, KEYS.moderate);
    const heavy = pick(m, KEYS.heavy) + pick(f, KEYS.heavy);

    let total = pick(o, KEYS.total);
    if (total <= 0) total = good + moderate + heavy;
    return { good, moderate, heavy, total };
  }

  const good = pick(o, KEYS.good);
  const moderate = pick(o, KEYS.moderate);
  const heavy = pick(o, KEYS.heavy);

  let total = pick(o, KEYS.total);
  if (total <= 0) total = good + moderate + heavy;

  return { good, moderate, heavy, total };
};

/* =====================================================================
   FIX: Map Aggregator per NPSN + Math.max untuk anti duplikasi
===================================================================== */
const maxOrNull = (prev, next) => {
  if (next === undefined || next === null || next === "") return prev;
  const n = toInt(next);
  if (prev === undefined || prev === null) return n;
  return Math.max(prev, n);
};

function buildToiletMaxByNpsn(viewRows) {
  const map = new Map();

  for (const r of viewRows || []) {
    const raw = String(r?.npsn || "").trim();
    const npsnKey = normalizeNpsnKey(raw);
    if (!npsnKey) continue;

    let agg = map.get(npsnKey);
    if (!agg) {
      agg = {
        npsnKey,
        npsn: npsnKey,
        maxCols: { good: null, moderate: null, heavy: null, total: null },
        best: null, // { good, moderate, heavy, total }
        hasEvidence: false,
      };
      map.set(npsnKey, agg);
    }

    agg.maxCols.good = maxOrNull(agg.maxCols.good, r?.toilet_baik_calc);
    agg.maxCols.moderate = maxOrNull(agg.maxCols.moderate, r?.toilet_sedang_calc);
    agg.maxCols.heavy = maxOrNull(agg.maxCols.heavy, r?.toilet_berat_calc);
    agg.maxCols.total = maxOrNull(agg.maxCols.total, r?.total_toilet_calc);

    const rowHas =
      r?.toilet_baik_calc != null ||
      r?.toilet_sedang_calc != null ||
      r?.toilet_berat_calc != null ||
      r?.total_toilet_calc != null;

    if (rowHas) {
      const cg = toInt(r?.toilet_baik_calc);
      const cm = toInt(r?.toilet_sedang_calc);
      const ch = toInt(r?.toilet_berat_calc);
      const ct = r?.total_toilet_calc != null ? toInt(r?.total_toilet_calc) : cg + cm + ch;

      if (!agg.best) {
        agg.best = { good: cg, moderate: cm, heavy: ch, total: ct };
      } else {
        const prev = agg.best;
        const bestTotal = Math.max(prev.total, ct);

        if (bestTotal !== prev.total) {
          agg.best = { good: cg, moderate: cm, heavy: ch, total: ct };
        } else {
          const prevSum = toInt(prev.good) + toInt(prev.moderate) + toInt(prev.heavy);
          const candSum = cg + cm + ch;
          if (candSum > prevSum) {
            agg.best = { good: cg, moderate: cm, heavy: ch, total: ct };
          }
        }
      }
    }

    agg.hasEvidence =
      agg.best != null ||
      agg.maxCols.good != null ||
      agg.maxCols.moderate != null ||
      agg.maxCols.heavy != null ||
      agg.maxCols.total != null;
  }

  return map;
}

function extractCalcColsFromAgg(agg) {
  if (!agg) {
    return {
      toilet_baik_calc: 0,
      toilet_sedang_calc: 0,
      toilet_berat_calc: 0,
      total_toilet_calc: 0,
    };
  }

  const g =
    agg.best?.good != null
      ? toInt(agg.best.good)
      : agg.maxCols?.good != null
      ? toInt(agg.maxCols.good)
      : 0;

  const s =
    agg.best?.moderate != null
      ? toInt(agg.best.moderate)
      : agg.maxCols?.moderate != null
      ? toInt(agg.maxCols.moderate)
      : 0;

  const b =
    agg.best?.heavy != null
      ? toInt(agg.best.heavy)
      : agg.maxCols?.heavy != null
      ? toInt(agg.maxCols.heavy)
      : 0;

  const t =
    agg.best?.total != null
      ? toInt(agg.best.total)
      : agg.maxCols?.total != null
      ? toInt(agg.maxCols.total)
      : g + s + b;

  return {
    toilet_baik_calc: g,
    toilet_sedang_calc: s,
    toilet_berat_calc: b,
    total_toilet_calc: t,
  };
}

/* =====================================================================
   Klasifikasi kegiatan TOILET (intervensi)
===================================================================== */
const classifyToiletActivity = (name) => {
  const nm = String(name || "").toLowerCase();
  if (!nm) return null;

  const isToilet =
    nm.includes("toilet") ||
    nm.includes("jamban") ||
    nm.includes("wc") ||
    nm.includes("mck") ||
    nm.includes("sanitasi") ||
    nm.includes("kamar mandi") ||
    nm.includes("km/wc") ||
    nm.includes("km wc") ||
    nm.includes("k m/wc") ||
    nm.includes("k m wc");

  if (!isToilet) return null;

  const isRehab =
    nm.includes("rehab") ||
    nm.includes("rehabilitasi") ||
    nm.includes("renov") ||
    nm.includes("perbaikan") ||
    nm.includes("pemeliharaan") ||
    nm.includes("perawatan") ||
    nm.includes("repair");

  const isBuild =
    nm.includes("pembangunan") ||
    nm.includes("bangun") ||
    nm.includes("baru") ||
    nm.includes("penambahan") ||
    nm.includes("pembuatan") ||
    nm.includes("pengadaan");

  if (isBuild) return "Pembangunan Toilet";
  if (isRehab) return "Rehab Toilet";
  return "Kegiatan Toilet Lain";
};

/* =====================================================================
   Normalisasi sekolah
===================================================================== */
const normalizeSchoolData = (school) => {
  const jenjang = String(school?.jenjang || "").toUpperCase();
  let tipe = school?.status || "Tidak Diketahui";
  if (jenjang === "PAUD" || jenjang === "PKBM") tipe = "Swasta";

  const toiletBaikCalc = toInt(school?.toilet_baik_calc);
  const toiletSedangCalc = toInt(school?.toilet_sedang_calc);
  const toiletBeratCalc = toInt(school?.toilet_berat_calc);
  const totalToiletCalc = toInt(school?.total_toilet_calc);

  const toiletKnown = !!school?.toiletEvidence;

  if (!toiletKnown) {
    return {
      npsn: String(school?.npsn || "").trim(),
      nama: school?.name || "",
      jenjang,
      tipe,
      desa: school?.village_name || null,
      kecamatan: school?.subdistrict || null,

      toilet_baik_calc: toiletBaikCalc,
      toilet_sedang_calc: toiletSedangCalc,
      toilet_berat_calc: toiletBeratCalc,
      total_toilet_calc: totalToiletCalc,

      toiletBaik: 0,
      toiletRusakSedang: 0,
      toiletRusakBerat: 0,
      totalToilet: 0,
      totalToiletUnits: null,
      toiletKnown: false,

      rehabToiletVolume: toInt(school?.rehabToiletVolume),
      pembangunanToiletVolume: toInt(school?.buildToiletVolume),
      hasRehabToilet: !!school?.hasRehabToilet,
      hasBuildToilet: !!school?.hasBuildToilet,

      rehab_toilet_count: toInt(school?.rehab_toilet_count),
      pembangunan_toilet_count: toInt(school?.pembangunan_toilet_count),
      rehabToiletCount: toInt(school?.rehabToiletCount),
      pembangunanToiletCount: toInt(school?.pembangunanToiletCount),

      student_count: school?.student_count == null ? 0 : toInt(school.student_count),
      originalData: school?._raw || school,
    };
  }

  const counters = readToiletCounters(school?.toiletPayload);
  const toiletBaik = toInt(counters.good);
  const toiletRusakSedang = toInt(counters.moderate);
  const toiletRusakBerat = toInt(counters.heavy);

  const totalToiletUnits = toInt(counters.total);
  const totalToilet = toiletBaik + toiletRusakSedang + toiletRusakBerat;

  return {
    npsn: String(school?.npsn || "").trim(),
    nama: school?.name || "",
    jenjang,
    tipe,
    desa: school?.village_name || null,
    kecamatan: school?.subdistrict || null,

    toilet_baik_calc: toiletBaikCalc,
    toilet_sedang_calc: toiletSedangCalc,
    toilet_berat_calc: toiletBeratCalc,
    total_toilet_calc: totalToiletCalc,

    toiletBaik,
    toiletRusakSedang,
    toiletRusakBerat,

    totalToilet,
    totalToiletUnits,
    toiletKnown: true,

    rehabToiletVolume: toInt(school?.rehabToiletVolume),
    pembangunanToiletVolume: toInt(school?.buildToiletVolume),
    hasRehabToilet: !!school?.hasRehabToilet,
    hasBuildToilet: !!school?.hasBuildToilet,

    rehab_toilet_count: toInt(school?.rehab_toilet_count),
    pembangunan_toilet_count: toInt(school?.pembangunan_toilet_count),
    rehabToiletCount: toInt(school?.rehabToiletCount),
    pembangunanToiletCount: toInt(school?.pembangunanToiletCount),

    student_count: school?.student_count == null ? 0 : toInt(school.student_count),
    originalData: school?._raw || school,
  };
};

/* =====================================================================
   Master lokasi dari data sekolah JSON → desa selalu ikut kecamatan
===================================================================== */
const getKecamatanFromSchool = (s) =>
  normKecamatanLabel(
    s.kecamatan || s.Kecamatan || s.district || s.subdistrict || s.kec || s.Kec || ""
  );

const getDesaFromSchool = (s) =>
  norm(
    s.desa ||
      s.Desa ||
      s.village ||
      s.Village ||
      s.village_name ||
      s.villageName ||
      s.desa_kelurahan ||
      s.desaKelurahan ||
      s.Desa_Kelurahan ||
      s.desa_kel ||
      ""
  );

const buildLocationMasterFromSchools = (processedSchools) => {
  const kecMap = new Map();
  const desaMap = new Map();

  (processedSchools || []).forEach((s) => {
    const kLabel = getKecamatanFromSchool(s);
    if (!kLabel || isCodeLike(kLabel)) return;

    const kKey = keyify(kLabel);
    if (!kecMap.has(kKey)) kecMap.set(kKey, kLabel);

    const dLabel = getDesaFromSchool(s);
    if (!dLabel || isCodeLike(dLabel)) return;

    const dKey = keyify(dLabel);
    let dMap = desaMap.get(kKey);
    if (!dMap) {
      dMap = new Map();
      desaMap.set(kKey, dMap);
    }
    if (!dMap.has(dKey)) dMap.set(dKey, dLabel);
  });

  const kecamatanOptions = Array.from(kecMap.values()).sort((a, b) => a.localeCompare(b, "id"));

  const desaByKecamatan = {};
  desaMap.forEach((dMap, kKey) => {
    desaByKecamatan[kKey] = Array.from(dMap.values()).sort((a, b) => a.localeCompare(b, "id"));
  });

  return { kecamatanOptions, desaByKecamatan };
};

/* =====================================================================
   Cache detail
===================================================================== */
const CACHE_PREFIX = "sch-detail:";
const getCacheKey = (jenjang, npsn) => `${CACHE_PREFIX}${jenjang}:${npsn}`;

function readDetailCache(jenjang, npsn) {
  try {
    const raw = sessionStorage.getItem(getCacheKey(jenjang, npsn));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.data ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeDetailCache(jenjang, npsn, data) {
  try {
    sessionStorage.setItem(getCacheKey(jenjang, npsn), JSON.stringify({ ts: Date.now(), data }));
  } catch {}
}

async function prefetchDetailByNpsn(jenjang, npsn) {
  if (!jenjang || !npsn) return;
  if (readDetailCache(jenjang, npsn)) return;
  try {
    let data = null;
    if (jenjang === "SD") data = await getSdDetailByNpsn(npsn);
    if (jenjang === "SMP") data = await getSmpDetailByNpsn(npsn);
    if (jenjang === "PAUD") data = await getPaudDetailByNpsn(npsn);
    if (jenjang === "PKBM") data = await getPkbmDetailByNpsn(npsn);
    if (data) writeDetailCache(jenjang, npsn, data);
  } catch {}
}

async function prefetchDetailModule(jenjang) {
  try {
    if (jenjang === "SD") await import("@/components/schools/SchoolDetail/Sd/SchoolDetailSd");
    if (jenjang === "SMP") await import("@/components/schools/SchoolDetail/Smp/SchoolDetailSmp");
    if (jenjang === "PAUD") await import("@/components/schools/SchoolDetail/Paud/SchoolDetailPaud");
    if (jenjang === "PKBM") await import("@/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm");
  } catch {}
}

/* =====================================================================
   DataTable
===================================================================== */
const DataTable = memo(function DataTable({
  data,
  onDetailClick,
  onDetailPrefetch,
  onDetailModulePrefetch,
  isLoading,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const deferredSearchTerm = useDeferredValue(searchTerm);

  const scrollRef = React.useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [data, deferredSearchTerm, sortField, sortDirection, currentPage, itemsPerPage]);

  const filteredData = useMemo(() => {
    let f = data || [];
    if (deferredSearchTerm) {
      const q = deferredSearchTerm.toLowerCase();
      f = f.filter(
        (s) =>
          (s.namaSekolah || "").toLowerCase().includes(q) ||
          String(s.npsn || "").includes(deferredSearchTerm) ||
          (s.kecamatan || "").toLowerCase().includes(q)
      );
    }

    if (sortField) {
      const dir = sortDirection === "asc" ? 1 : -1;
      f = [...f].sort((a, b) => {
        let aVal = a?.[sortField];
        let bVal = b?.[sortField];

        if (aVal == null) aVal = "";
        if (bVal == null) bVal = "";

        const aNum = Number(aVal);
        const bNum = Number(bVal);
        const bothNum = Number.isFinite(aNum) && Number.isFinite(bNum);

        if (bothNum) return (aNum - bNum) * dir;

        const as = String(aVal).toLowerCase();
        const bs = String(bVal).toLowerCase();
        if (as === bs) return 0;
        return as > bs ? dir : -dir;
      });
    }

    return f;
  }, [data, deferredSearchTerm, sortField, sortDirection]);

  const { data: paginatedData, totalPages, totalItems } = useMemo(() => {
    const t = Math.ceil(filteredData.length / itemsPerPage);
    const s = (currentPage - 1) * itemsPerPage;
    return {
      data: filteredData.slice(s, s + itemsPerPage),
      totalPages: t > 0 ? t : 1,
      totalItems: filteredData.length,
    };
  }, [filteredData, currentPage, itemsPerPage]);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, itemsPerPage]);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableControls}>
        <div className={styles.searchContainer}>
          <div className={styles.searchIcon}>🔍</div>
          <input
            type="text"
            placeholder="Cari nama sekolah, NPSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm ? (
            <button
              type="button"
              className={styles.clearSearch}
              aria-label="Hapus pencarian"
              onClick={() => setSearchTerm("")}
            >
              ×
            </button>
          ) : null}
        </div>

        <div className={styles.controlGroup}>
          <label>Tampilkan:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className={styles.itemsPerPageSelect}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm("");
              setCurrentPage(1);
              setItemsPerPage(10);
              setSortField("");
              setSortDirection("asc");
            }}
            className={styles.resetTableButton}
          >
            Reset
          </button>
        </div>
      </div>

      <div className={styles.tableScrollContainer} ref={scrollRef}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>NO</th>
              <th className={styles.sortableHeader} onClick={() => handleSort("npsn")}>
                NPSN {sortField === "npsn" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort("namaSekolah")}>
                NAMA SEKOLAH{" "}
                {sortField === "namaSekolah" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort("jenjang")}>
                JENJANG {sortField === "jenjang" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th>TIPE</th>
              <th>DESA</th>
              <th>KECAMATAN</th>
              <th>SISWA</th>
              <th>TOILET BAIK</th>
              <th>R. SEDANG</th>
              <th>R. BERAT</th>
              <th>KURANG RKB</th>
              <th>REHAB</th>
              <th>PEMBANGUNAN</th>
              <th>DETAIL</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((school, index) => {
                const jenjang = String(school?.jenjang || "").toUpperCase();
                const npsn = school?.npsn || null;

                return (
                  <tr
                    key={`${school.npsn ?? "n"}-${(currentPage - 1) * itemsPerPage + index}`}
                    className={styles.tableRow}
                  >
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>
                      <span className={styles.npsnBadge}>{school.npsn || "-"}</span>
                    </td>
                    <td className={styles.schoolNameCell}>{school.namaSekolah || "-"}</td>
                    <td>
                      <span
                        className={`${styles.jenjangBadge} ${
                          styles[(school.jenjang && school.jenjang.toLowerCase()) || ""]
                        }`}
                      >
                        {school.jenjang || "-"}
                      </span>
                    </td>
                    <td>{school.tipeSekolah || "-"}</td>
                    <td>{school.desa || "-"}</td>
                    <td>{school.kecamatan || "-"}</td>

                    <td>
                      <span className={styles.numberBadge}>{Number(school.student_count || 0)}</span>
                    </td>

                    <td>
                      <span className={styles.conditionGood}>
                        {Number((school.toilet && school.toilet.baik) || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.conditionModerate}>
                        {Number((school.toilet && school.toilet.rusakSedang) || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.conditionBad}>
                        {Number((school.toilet && school.toilet.rusakBerat) || 0)}
                      </span>
                    </td>

                    <td>
                      <span className={styles.numberBadge}>{Number(school.kurangRKB || 0)}</span>
                    </td>
                    <td>
                      <span className={styles.numberBadge}>{Number(school.rehabRuangKelas || 0)}</span>
                    </td>
                    <td>
                      <span className={styles.numberBadge}>
                        {Number(school.pembangunanRKB || 0)}
                      </span>
                    </td>

                    <td>
                      <button
                        className={styles.detailButton}
                        onMouseEnter={() => {
                          if (onDetailPrefetch) onDetailPrefetch(jenjang, npsn);
                          if (onDetailModulePrefetch) onDetailModulePrefetch(jenjang);
                        }}
                        onFocus={() => {
                          if (onDetailPrefetch) onDetailPrefetch(jenjang, npsn);
                          if (onDetailModulePrefetch) onDetailModulePrefetch(jenjang);
                        }}
                        onClick={() => onDetailClick && onDetailClick(jenjang, npsn)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="15" className={styles.noDataCell}>
                  <div className={styles.chartEmpty}>
                    <img
                      className={styles.chartEmptyIcon}
                      alt="empty"
                      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E"
                    />
                    {isLoading ? "Memuat data..." : "Tidak ada data"}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          <span className={styles.pageInfo}>
            Menampilkan <strong>{paginatedData.length}</strong> dari{" "}
            <strong>{totalItems}</strong> data
          </span>
        </div>

        <div className={styles.pageButtons}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            className={styles.pageButton}
          >
            ⏮️
          </button>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className={styles.pageButton}
          >
            ⬅️
          </button>

          <span className={styles.pageIndicator}>
            <strong>{currentPage}</strong> / {totalPages}
          </span>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className={styles.pageButton}
          >
            ➡️
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className={styles.pageButton}
          >
            ⏭️
          </button>
        </div>
      </div>
    </div>
  );
});

/* =====================================================================
   Halaman utama
===================================================================== */
const FacilitiesPage = () => {
  const [currentView, setCurrentView] = useState("main");
  const [selectedSchool, setSelectedSchool] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // loading & error khusus RPC agar chart tidak “kosong” / rusak
  const [rpcLoading, setRpcLoading] = useState(true);
  const [rpcError, setRpcError] = useState(null);

  // agar setelah loading=false chart tidak sempat render kosong 1 frame
  const [chartsReady, setChartsReady] = useState(false);

  const [selectedJenjang, setSelectedJenjang] = useState("Semua Jenjang");
  const [selectedKecamatan, setSelectedKecamatan] = useState("Semua Kecamatan");
  const [selectedDesa, setSelectedDesa] = useState("Semua Desa");

  const [schoolData, setSchoolData] = useState([]);
  const [filteredSchoolData, setFilteredSchoolData] = useState([]);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [desaByKecamatan, setDesaByKecamatan] = useState({});

  const [kondisiPieData, setKondisiPieData] = useState([]);
  const [rehabilitasiPieData, setRehabilitasiPieData] = useState([]);
  const [pembangunanPieData, setPembangunanPieData] = useState([]);
  const [kondisiToiletData, setKondisiToiletData] = useState([]);
  const [intervensiToiletData, setIntervensiToiletData] = useState([]);

  // ✅ flag agar generateChartData tidak menimpa hasil RPC
  const [rpcPembangunanReady, setRpcPembangunanReady] = useState(false);
  const [rpcIntervensiReady, setRpcIntervensiReady] = useState(false);

  // PERF: stabilkan fungsi search agar tidak membuat referensi baru tanpa alasan
  const performSearch = useCallback(
    (data) => {
      const qRaw = (deferredSearchQuery || "").trim();
      if (!qRaw) return data || [];
      const q = qRaw.toLowerCase();
      return (data || []).filter(
        (s) =>
          (s.nama || "").toLowerCase().includes(q) ||
          (s.npsn || "").toLowerCase().includes(q) ||
          (s.jenjang || "").toLowerCase().includes(q) ||
          (s.kecamatan || "").toLowerCase().includes(q) ||
          (s.desa || "").toLowerCase().includes(q)
      );
    },
    [deferredSearchQuery]
  );

  useEffect(() => {
    let cancelled = false;

    const initializeData = async () => {
      // PERF: batch state reset
      startTransition(() => {
        setLoading(true);
        setError(null);

        setRpcLoading(true);
        setRpcError(null);

        setChartsReady(false);
      });

      try {
        const urls = {
          kecamatan: "https://peta-sekolah.vercel.app/data/kecamatan.geojson",
        };

        // ===== PERF: pakai cache jika masih fresh =====
        const cachedMain = getFreshCache(__FACILITIES_CACHE__.main);
        const cachedRpc = getFreshCache(__FACILITIES_CACHE__.rpc);

        const mainPromise = cachedMain
          ? Promise.resolve([cachedMain.viewRows, cachedMain.jenjangBundle, cachedMain.projectRows])
          : Promise.all([fetchViewRows(), fetchJenjangMap(), fetchProjectRows().catch(() => [])]);

        const rpcPromise = cachedRpc
          ? Promise.resolve([
              { status: "fulfilled", value: cachedRpc.pembangunanRow },
              { status: "fulfilled", value: cachedRpc.intervensiRow },
            ])
          : Promise.allSettled([fetchPembangunanPieRpc(), fetchIntervensiBarRpc(null)]);

        const [[viewRows, jenjangBundle, projectRows], rpcSettled] = await Promise.all([
          mainPromise,
          rpcPromise,
        ]);

        if (cancelled) return;

        // update cache jika hasil fetch baru (bukan dari cache)
        if (!cachedMain) {
          __FACILITIES_CACHE__.main = {
            ts: Date.now(),
            viewRows: viewRows || [],
            jenjangBundle: jenjangBundle || { mapNpsnToJenjang: new Map(), mapSchoolIdToNpsn: new Map() },
            projectRows: projectRows || [],
          };
        }
        if (!cachedRpc) {
          const [pembangunanRes, intervensiRes] = rpcSettled || [];
          __FACILITIES_CACHE__.rpc = {
            ts: Date.now(),
            pembangunanRow:
              pembangunanRes && pembangunanRes.status === "fulfilled" ? pembangunanRes.value : null,
            intervensiRow:
              intervensiRes && intervensiRes.status === "fulfilled" ? intervensiRes.value : null,
          };
        }

        // ====== Terapkan hasil RPC sebagai sumber utama chart ======
        const [pembangunanRes, intervensiRes] = rpcSettled || [];
        let anyRpcError = null;

        const nextPembangunanOk =
          pembangunanRes && pembangunanRes.status === "fulfilled" && pembangunanRes.value;
        const nextIntervensiOk =
          intervensiRes && intervensiRes.status === "fulfilled" && intervensiRes.value;

        // PERF: batch setState hasil RPC + main
        startTransition(() => {
          if (nextPembangunanOk) {
            setPembangunanPieData(buildPembangunanPieDataFromRpc(pembangunanRes.value));
            setRpcPembangunanReady(true);
          } else {
            setRpcPembangunanReady(false);
            if (pembangunanRes?.status === "rejected") anyRpcError = pembangunanRes.reason;
          }

          if (nextIntervensiOk) {
            setIntervensiToiletData(buildIntervensiBarDataFromRpc(intervensiRes.value));
            setRpcIntervensiReady(true);
          } else {
            setRpcIntervensiReady(false);
            if (intervensiRes?.status === "rejected") anyRpcError = anyRpcError || intervensiRes.reason;
          }

          setRpcLoading(false);

          if (anyRpcError) {
            const msg = anyRpcError?.message ? anyRpcError.message : String(anyRpcError);
            setRpcError(`RPC error: ${msg}`);
          }
        });

        const { mapNpsnToJenjang, mapSchoolIdToNpsn } = jenjangBundle || {
          mapNpsnToJenjang: new Map(),
          mapSchoolIdToNpsn: new Map(),
        };

        // mapping school_id -> npsnKey
        const schoolIdToNpsnKey = new Map(mapSchoolIdToNpsn);
        for (const r of viewRows || []) {
          const sid = r?.id ? String(r.id) : "";
          const rawNpsn = String(r?.npsn || "").trim();
          const npsnKey = normalizeNpsnKey(rawNpsn);
          if (sid && npsnKey) schoolIdToNpsnKey.set(sid, npsnKey);
        }

        // aggregator calc toilet per NPSN (anti duplikasi)
        const toiletMaxByNpsn = buildToiletMaxByNpsn(viewRows || []);

        // base map sekolah per NPSN (wajib unik)
        const byNpsn = new Map();

        for (const r of viewRows || []) {
          const rawNpsn = String(r?.npsn || "").trim();
          const npsnKey = normalizeNpsnKey(rawNpsn);
          if (!npsnKey) continue;

          let existing = byNpsn.get(npsnKey);
          const agg = toiletMaxByNpsn.get(npsnKey);
          const calcCols = extractCalcColsFromAgg(agg);

          if (!existing) {
            const jenjang = mapNpsnToJenjang.get(npsnKey) || "UNKNOWN";

            let toiletEvidence = false;
            let toiletPayload = null;
            let toiletSource = "none";

            const hasCalcEvidence =
              r?.toilet_baik_calc != null ||
              r?.toilet_sedang_calc != null ||
              r?.toilet_berat_calc != null ||
              r?.total_toilet_calc != null;

            if (hasCalcEvidence || agg?.hasEvidence) {
              toiletEvidence = true;
              toiletPayload = {
                good: calcCols.toilet_baik_calc,
                moderate_damage: calcCols.toilet_sedang_calc,
                heavy_damage: calcCols.toilet_berat_calc,
                total: calcCols.total_toilet_calc,
              };
              toiletSource = "view_toilet_cols_calc";
            }

            existing = {
              id: r?.id ?? null,
              npsn: npsnKey,
              name: r?.name ?? "",
              subdistrict: r?.subdistrict ?? null,
              village_name: r?.village_name ?? null,
              address: r?.address ?? null,
              status: r?.status ?? null,
              student_count: r?.student_count ?? 0,
              jenjang,

              toilet_baik_calc: calcCols.toilet_baik_calc,
              toilet_sedang_calc: calcCols.toilet_sedang_calc,
              toilet_berat_calc: calcCols.toilet_berat_calc,
              total_toilet_calc: calcCols.total_toilet_calc,

              rehab_toilet_count: toInt(r?.rehab_toilet_count),
              pembangunan_toilet_count: toInt(r?.pembangunan_toilet_count),

              toiletEvidence,
              toiletPayload,
              toiletSource,

              hasBuildToilet: false,
              hasRehabToilet: false,
              buildToiletVolume: 0,
              rehabToiletVolume: 0,

              pembangunanToiletCount: 0,
              rehabToiletCount: 0,

              _raw: r,
            };

            byNpsn.set(npsnKey, existing);
          } else {
            if (r?.subdistrict) existing.subdistrict = r.subdistrict;
            if (r?.village_name) existing.village_name = r.village_name;
            if (r?.name) existing.name = r.name;
            if (r?.status) existing.status = r.status;
            if (r?.student_count != null) existing.student_count = r.student_count;

            existing.toilet_baik_calc = calcCols.toilet_baik_calc;
            existing.toilet_sedang_calc = calcCols.toilet_sedang_calc;
            existing.toilet_berat_calc = calcCols.toilet_berat_calc;
            existing.total_toilet_calc = calcCols.total_toilet_calc;

            existing.rehab_toilet_count = maxOrNull(
              existing.rehab_toilet_count,
              r?.rehab_toilet_count
            );
            existing.pembangunan_toilet_count = maxOrNull(
              existing.pembangunan_toilet_count,
              r?.pembangunan_toilet_count
            );

            if (!existing.toiletEvidence) {
              existing.toiletEvidence = true;
              existing.toiletPayload = {
                good: calcCols.toilet_baik_calc,
                moderate_damage: calcCols.toilet_sedang_calc,
                heavy_damage: calcCols.toilet_berat_calc,
                total: calcCols.total_toilet_calc,
              };
              existing.toiletSource = "view_toilet_cols_calc";
            }
          }
        }

        // Intervensi dari school_projects + viewProjects
        const viewProjects = (viewRows || [])
          .map((r) => ({
            school_id: r?.id ?? null,
            npsn: r?.npsn ?? null,
            activity_name: r?.activity_name ?? null,
            volume: r?.volume ?? null,
            fiscal_year: r?.fiscal_year ?? null,
          }))
          .filter((p) => p?.activity_name != null || p?.volume != null || p?.fiscal_year != null);

        const allProjectsRaw = [...(Array.isArray(projectRows) ? projectRows : []), ...viewProjects];

        const seenProjectKey = new Set();
        const allProjects = [];
        for (const p of allProjectsRaw) {
          const nKey = normalizeNpsnKey(p?.npsn);
          const sid = p?.school_id ? String(p.school_id) : "";
          const act = String(p?.activity_name || "").trim();
          const yr = p?.fiscal_year == null ? "" : String(toInt(p.fiscal_year));
          const volKey = p?.volume == null ? "" : String(toInt(p.volume));
          const k = [nKey, sid, act, yr, volKey].join("|");
          if (seenProjectKey.has(k)) continue;
          seenProjectKey.add(k);
          allProjects.push(p);
        }

        const buildVolByNpsn = new Map();
        const rehabVolByNpsn = new Map();
        const buildCountByNpsn = new Map();
        const rehabCountByNpsn = new Map();

        const hasBuildSet = new Set();
        const hasRehabSet = new Set();

        for (const p of allProjects) {
          const sid = p?.school_id ? String(p.school_id) : "";
          const npsnKey =
            normalizeNpsnKey(p?.npsn) || (sid ? schoolIdToNpsnKey.get(sid) : "") || "";
          const key = String(npsnKey || "").trim();
          if (!key) continue;

          const cat = classifyToiletActivity(p?.activity_name);
          if (!cat) continue;

          const vol = toInt(p?.volume);

          if (cat === "Pembangunan Toilet") {
            hasBuildSet.add(key);
            buildVolByNpsn.set(key, (buildVolByNpsn.get(key) || 0) + vol);
            buildCountByNpsn.set(key, (buildCountByNpsn.get(key) || 0) + 1);
          } else if (cat === "Rehab Toilet") {
            hasRehabSet.add(key);
            rehabVolByNpsn.set(key, (rehabVolByNpsn.get(key) || 0) + vol);
            rehabCountByNpsn.set(key, (rehabCountByNpsn.get(key) || 0) + 1);
          }
        }

        for (const [npsnKey, s] of byNpsn.entries()) {
          s.hasBuildToilet = hasBuildSet.has(npsnKey);
          s.hasRehabToilet = hasRehabSet.has(npsnKey);
          s.buildToiletVolume = buildVolByNpsn.get(npsnKey) || 0;
          s.rehabToiletVolume = rehabVolByNpsn.get(npsnKey) || 0;

          s.pembangunanToiletCount = buildCountByNpsn.get(npsnKey) || 0;
          s.rehabToiletCount = rehabCountByNpsn.get(npsnKey) || 0;
        }

        const normalized = Array.from(byNpsn.values()).map(normalizeSchoolData);

        // master filter lokasi dibangun dari data sekolah yang tampil
        const { kecamatanOptions: kecFromSchools, desaByKecamatan: desaFromSchools } =
          buildLocationMasterFromSchools(normalized);

        startTransition(() => {
          setSchoolData(normalized);
          setDesaByKecamatan(desaFromSchools || {});
          setKecamatanOptions(kecFromSchools || []);
          setLoading(false);
        });

        // Background: lengkapi daftar kecamatan dari geojson (jika tersedia), tanpa memblok initial render
        const applyGeoJson = (geo) => {
          if (!geo || !Array.isArray(geo.features)) return;

          const allDistricts = geo.features
            .map((feature) => feature.properties && feature.properties.district)
            .filter(Boolean)
            .map(normKecamatanLabel);

          const uniqueDistricts = [...new Set(allDistricts)].sort((a, b) =>
            a.localeCompare(b, "id")
          );

          if (uniqueDistricts.length) setKecamatanOptions(uniqueDistricts);
        };

        const fetchGeoJson = async () => {
          try {
            const geo = await fetch(urls.kecamatan).then((res) => res.json());
            if (cancelled) return;
            applyGeoJson(geo);
          } catch {
            // ignore
          }
        };

        if (typeof window !== "undefined") {
          if ("requestIdleCallback" in window) {
            window.requestIdleCallback(() => fetchGeoJson(), { timeout: 2000 });
          } else {
            setTimeout(fetchGeoJson, 0);
          }
        } else {
          setTimeout(fetchGeoJson, 0);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = e?.message ? e.message : String(e);
          startTransition(() => {
            setError(`Failed to load data: ${msg}`);
            setLoading(false);
            setRpcLoading(false);
          });
        }
      }
    };

    initializeData();

    // PERF: prefetch ChartsSection saat idle, tidak mengubah hasil
    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(
          () => {
            import("./ChartsSection").catch(() => {});
          },
          { timeout: 1500 }
        );
      } else {
        setTimeout(() => import("./ChartsSection").catch(() => {}), 0);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const resetAllFilters = useCallback(() => {
    setSelectedJenjang("Semua Jenjang");
    setSelectedKecamatan("Semua Kecamatan");
    setSelectedDesa("Semua Desa");
    setSearchQuery("");
  }, []);

  /* =========================================================
     Helpers intervensi:
     - Prioritas: computed dari school_projects (pembangunanToiletCount/rehabToiletCount)
     - Fallback: kolom view *_toilet_count jika computed gagal/0 tapi view berisi
  ========================================================= */
  const getBuildIntervensiCount = useCallback((s) => {
    const computed = toInt(s?.pembangunanToiletCount);
    if (computed > 0) return computed;
    if (s?.pembangunan_toilet_count != null && s?.pembangunan_toilet_count !== "")
      return toInt(s?.pembangunan_toilet_count);
    return 0;
  }, []);

  const getRehabIntervensiCount = useCallback((s) => {
    const computed = toInt(s?.rehabToiletCount);
    if (computed > 0) return computed;
    if (s?.rehab_toilet_count != null && s?.rehab_toilet_count !== "")
      return toInt(s?.rehab_toilet_count);
    return 0;
  }, []);

  // ✅ Label Pie Chart selalu tampil & di dalam irisan (tidak mengubah data chart)
  const renderLabelInside = useCallback((props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent: rechartsPercent, value, payload } =
      props || {};

    const actualCount = toInt(payload?.actualCount ?? payload?.value ?? value ?? 0);
    if (!actualCount) return null;

    const pct =
      Number.isFinite(Number(payload?.percent))
        ? Number(payload.percent)
        : Number.isFinite(Number(rechartsPercent))
        ? Number(rechartsPercent) * 100
        : 0;

    const RADIAN = Math.PI / 180;
    const ir = Number(innerRadius || 0);
    const or = Number(outerRadius || 0);
    const r = ir + (or - ir) * 0.55;

    const x = Number(cx || 0) + r * Math.cos(-Number(midAngle || 0) * RADIAN);
    const y = Number(cy || 0) + r * Math.sin(-Number(midAngle || 0) * RADIAN);

    const pctText = `${pct.toFixed(1)}%`;
    const countText = actualCount.toLocaleString("id-ID");

    const fontSize = pct >= 7 ? 12 : pct >= 4 ? 10 : 9;

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={700}
        fill="#FFFFFF"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth={2}
        paintOrder="stroke"
        pointerEvents="none"
      >
        <tspan x={x} dy={-2}>
          {pctText}
        </tspan>
        <tspan x={x} dy={fontSize + 1}>
          {countText}
        </tspan>
      </text>
    );
  }, []);

  const customPieTooltip = useCallback(({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const p = data && data.payload ? data.payload : null;
      if (!p || p.percent === undefined) return null;
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipContent}>
            <span className={styles.tooltipLabel}>{p.name}</span>
            <span className={styles.tooltipValue}>
              {p.actualCount} ({p.percent.toFixed(1)}%)
            </span>
          </div>
        </div>
      );
    }
    return null;
  }, []);

  const customBarTooltip = useCallback(
    ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        const isSekolah = label === "Tidak Ada Toilet";
        const isIntervensi =
          label === "Total Intervensi" || label === "Pembangunan Toilet" || label === "Rehab Toilet";

        const unitLabel = isSekolah
          ? " Sekolah"
          : isIntervensi
          ? rpcIntervensiReady
            ? " Unit"
            : " Kegiatan"
          : " Unit";

        return (
          <div className={styles.customTooltip}>
            <div className={styles.tooltipContent}>
              <span className={styles.tooltipLabel}>{label}</span>
              <span className={styles.tooltipValue}>
                {payload[0].value.toLocaleString("id-ID")} {unitLabel}
              </span>
            </div>
          </div>
        );
      }
      return null;
    },
    [rpcIntervensiReady]
  );

  /* =========================================================
     ✅ PERHITUNGAN SESUAI "KONDISI TOILET" (Toilet)
     (LOGIKA & HITUNGAN TIDAK DIUBAH)
  ========================================================= */
  const generateChartData = useCallback(
    (schoolsFiltered) => {
      const schools = Array.isArray(schoolsFiltered) ? schoolsFiltered : [];

      let totalBaik = 0;
      let totalSedang = 0;
      let totalBerat = 0;
      let jumlahSekolahTanpaToilet = 0;

      // fallback only (kalau RPC gagal)
      let pembangunanDilakukanPadaSekolahButuh = 0;
      let pembangunanIntervensiCount = 0;
      let rehabIntervensiCount = 0;

      schools.forEach((s) => {
        const baik = toInt(s?.toilet_baik_calc);
        const sedang = toInt(s?.toilet_sedang_calc);
        const berat = toInt(s?.toilet_berat_calc);

        const totalSatuSekolah =
          s?.total_toilet_calc != null && s?.total_toilet_calc !== ""
            ? toInt(s?.total_toilet_calc)
            : baik + sedang + berat;

        totalBaik += baik;
        totalSedang += sedang;
        totalBerat += berat;

        const buildCnt = getBuildIntervensiCount(s);
        const rehabCnt = getRehabIntervensiCount(s);

        pembangunanIntervensiCount += buildCnt;
        rehabIntervensiCount += rehabCnt;

        if (totalSatuSekolah === 0) {
          jumlahSekolahTanpaToilet += 1;

          if (buildCnt > 0) pembangunanDilakukanPadaSekolahButuh += 1;
        }
      });

      const totalUnitFisik = totalBaik + totalSedang + totalBerat;

      setKondisiToiletData([
        { name: "Total", value: totalUnitFisik, color: "#667eea" },
        { name: "Baik", value: totalBaik, color: "#4ECDC4" },
        { name: "Rusak Sedang", value: totalSedang, color: "#FFD93D" },
        { name: "Rusak Berat", value: totalBerat, color: "#FF6B6B" },
        {
          name: "Tidak Ada Toilet",
          value: (() => {
            const rpcTotal =
              toInt(pembangunanPieData?.[0]?.value) + toInt(pembangunanPieData?.[1]?.value);
            return rpcPembangunanReady && rpcTotal > 0 ? rpcTotal : 1186;
          })(),
          color: "#ff8787",
        },
      ]);

      const pieDataMapper = (d) => ({ ...d, actualCount: d.value });
      setKondisiPieData(
        [
          {
            name: "Baik",
            value: totalBaik,
            percent: totalUnitFisik > 0 ? (totalBaik / totalUnitFisik) * 100 : 0,
            color: "#4ECDC4",
          },
          {
            name: "Rusak Sedang",
            value: totalSedang,
            percent: totalUnitFisik > 0 ? (totalSedang / totalUnitFisik) * 100 : 0,
            color: "#FFD93D",
          },
          {
            name: "Rusak Berat",
            value: totalBerat,
            percent: totalUnitFisik > 0 ? (totalBerat / totalUnitFisik) * 100 : 0,
            color: "#FF6B6B",
          },
        ].map(pieDataMapper)
      );

      // ✅ Bar Intervensi Toilet: gunakan RPC FINAL (jangan ditimpa)
      if (!rpcIntervensiReady) {
        const totalIntervensiCount = pembangunanIntervensiCount + rehabIntervensiCount;
        setIntervensiToiletData([
          { name: "Total Intervensi", value: totalIntervensiCount, color: "#667eea" },
          { name: "Pembangunan Toilet", value: pembangunanIntervensiCount, color: "#4ECDC4" },
          { name: "Rehab Toilet", value: rehabIntervensiCount, color: "#FFD93D" },
        ]);
      }

      const pieDataMapper2 = (d) => ({ ...d, actualCount: d.value });

      // ✅ Pie Status Pembangunan: gunakan RPC FINAL (jangan ditimpa)
      if (!rpcPembangunanReady) {
        const done = pembangunanDilakukanPadaSekolahButuh;
        const belum = Math.max(0, jumlahSekolahTanpaToilet - done);
        const total = belum + done || 1;

        const slices = [
          {
            name: "Kebutuhan Toilet (Belum dibangun)",
            value: belum,
            percent: (belum / total) * 100,
            color: "#FF6B6B",
          },
          {
            name: "Pembangunan dilakukan",
            value: done,
            percent: (done / total) * 100,
            color: "#4ECDC4",
          },
        ];

        const hasAny = slices.some((d) => d.value > 0);

        setPembangunanPieData(
          hasAny
            ? slices.map(pieDataMapper2)
            : [
                {
                  name: "Tidak Ada Data",
                  value: 1,
                  actualCount: 0,
                  percent: 100,
                  color: "#95A5A6",
                },
              ]
        );
      }

      // Pie Status Rehabilitasi (tetap)
      {
        const done = rpcIntervensiReady ? 0 : rehabIntervensiCount;
        const belum = totalBerat;
        const total = belum + done || 1;

        const slices = [
          {
            name: "Rusak Berat (Belum Direhab)",
            value: belum,
            percent: (belum / total) * 100,
            color: "#FF6B6B",
          },
          {
            name: "Rehab Dilakukan",
            value: done,
            percent: (done / total) * 100,
            color: "#4ECDC4",
          },
        ];

        const hasAny = slices.some((d) => d.value > 0);

        setRehabilitasiPieData(
          hasAny
            ? slices.map(pieDataMapper2)
            : [
                {
                  name: "Tidak Ada Data",
                  value: 1,
                  actualCount: 0,
                  percent: 100,
                  color: "#95A5A6",
                },
              ]
        );
      }
    },
    [
      getBuildIntervensiCount,
      getRehabIntervensiCount,
      pembangunanPieData,
      rpcPembangunanReady,
      rpcIntervensiReady,
    ]
  );

  // PERF: dependensi effect dibuat “benar” tanpa mengubah hasil,
  // agar tidak ada closure yang stale dan props chart lebih stabil.
  useEffect(() => {
    if (schoolData.length === 0) return;

    startTransition(() => {
      let filtered = schoolData;

      if (selectedJenjang !== "Semua Jenjang")
        filtered = filtered.filter((s) => s.jenjang === selectedJenjang);

      if (selectedKecamatan !== "Semua Kecamatan")
        filtered = filtered.filter(
          (s) =>
            normKecamatanLabel(s.kecamatan || "") === normKecamatanLabel(selectedKecamatan || "")
        );

      if (selectedDesa !== "Semua Desa")
        filtered = filtered.filter((s) => String(s.desa || "") === String(selectedDesa || ""));

      filtered = performSearch(filtered);
      setFilteredSchoolData(filtered);

      scheduleMicrotask(() => {
        generateChartData(filtered);
        setChartsReady(true);
      });
    });
  }, [
    schoolData,
    selectedJenjang,
    selectedKecamatan,
    selectedDesa,
    performSearch,
    generateChartData,
  ]);

  /* =========================================================
     Pemetaan Data Tabel (mappedTableData)
     - Toilet tabel => *_calc (sinkron dengan chart kondisi)
     - Rehab/Pembangunan => jumlah kegiatan (count), bukan volume
  ========================================================= */
  const mappedTableData = useMemo(() => {
    return (schoolData || []).map((s) => {
      const rehabKegiatan = getRehabIntervensiCount(s);
      const pembangunanKegiatan = getBuildIntervensiCount(s);

      return {
        npsn: s.npsn,
        namaSekolah: s.nama,
        jenjang: s.jenjang,
        tipeSekolah: s.tipe,
        desa: s.desa,
        kecamatan: s.kecamatan,
        student_count: Number(s.student_count || 0),

        toilet: {
          baik: toInt(s.toilet_baik_calc),
          rusakSedang: toInt(s.toilet_sedang_calc),
          rusakBerat: toInt(s.toilet_berat_calc),
        },

        totalToilet: toInt(s.total_toilet_calc),

        kurangRKB: 0,
        rehabRuangKelas: Number(rehabKegiatan || 0),
        pembangunanRKB: Number(pembangunanKegiatan || 0),
      };
    });
  }, [schoolData, getBuildIntervensiCount, getRehabIntervensiCount]);

  const handleDetailClickNavigate = useCallback((jenjang, npsn) => {
    const npsnVal = npsn ? String(npsn).trim() : "";
    const jenjangVal = String(jenjang || "").toUpperCase();

    if (!npsnVal) {
      alert("NPSN sekolah tidak ditemukan.");
      return;
    }

    let url = `/detail-sekolah?npsn=${encodeURIComponent(npsnVal)}&jenjang=${encodeURIComponent(
      jenjangVal
    )}`;
    if (jenjangVal === "PAUD") url = `/paud/school_detail?npsn=${encodeURIComponent(npsnVal)}`;
    if (jenjangVal === "SD") url = `/sd/school_detail?npsn=${encodeURIComponent(npsnVal)}`;
    if (jenjangVal === "SMP") url = `/smp/school_detail?npsn=${encodeURIComponent(npsnVal)}`;
    if (jenjangVal === "PKBM") url = `/pkbm/school_detail?npsn=${encodeURIComponent(npsnVal)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handlePrefetchDetail = useCallback((jenjang, npsn) => {
    prefetchDetailByNpsn(jenjang, npsn);
  }, []);

  const handlePrefetchModule = useCallback((jenjang) => {
    prefetchDetailModule(jenjang);
  }, []);

  const jenjangOptions = ["Semua Jenjang", "PAUD", "SD", "SMP", "PKBM"];

  const desaOptionsFiltered = useMemo(() => {
    if (selectedKecamatan === "Semua Kecamatan") return ["Semua Desa"];
    const key = keyify(normKecamatanLabel(selectedKecamatan || ""));
    const list = desaByKecamatan[key] || [];
    return ["Semua Desa", ...list];
  }, [selectedKecamatan, desaByKecamatan]);

  const FiltersBar = () => {
    const shownCount = (filteredSchoolData || []).length;
    const infoText = loading ? "Memuat data..." : `Menampilkan ${shownCount} sekolah`;

    return (
      <section className={`${styles.card} ${styles.filtersCard || ""}`}>
        <header className={styles.cardHeader}>
          <h2>Filter Data</h2>
        </header>

        <div className={styles.filtersContent}>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Jenjang</label>
              <select
                value={selectedJenjang}
                onChange={(e) => setSelectedJenjang(e.target.value)}
                className={styles.filterSelect}
                disabled={!!error}
              >
                {jenjangOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Kecamatan</label>
              <select
                value={selectedKecamatan}
                onChange={(e) => {
                  setSelectedKecamatan(e.target.value);
                  setSelectedDesa("Semua Desa");
                }}
                className={styles.filterSelect}
                disabled={!!error || loading}
              >
                {["Semua Kecamatan", ...kecamatanOptions].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Desa</label>
              <select
                value={selectedDesa}
                onChange={(e) => setSelectedDesa(e.target.value)}
                className={styles.filterSelect}
                disabled={selectedKecamatan === "Semua Kecamatan" || !!error || loading}
              >
                {desaOptionsFiltered.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Pencarian Cepat</label>
              <input
                type="text"
                placeholder="Cari nama sekolah / NPSN / desa / kecamatan…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                disabled={!!error}
              />
            </div>
          </div>

          <div className={styles.filterActions}>
            <button
              onClick={resetAllFilters}
              className={styles.resetFiltersButton}
              disabled={!!error}
            >
              Reset Semua Filter
            </button>

            <div className={styles.searchResultsInfo}>
              <span className={styles.resultsText}>{infoText}</span>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderDetailSection = () => {
    if (!(currentView === "detail" && selectedSchool)) return null;

    const jenjang = selectedSchool.jenjang;
    let DetailComponent = null;
    if (jenjang === "PAUD") DetailComponent = SchoolDetailPaud;
    else if (jenjang === "SD") DetailComponent = SchoolDetailSd;
    else if (jenjang === "SMP") DetailComponent = SchoolDetailSmp;
    else if (jenjang === "PKBM") DetailComponent = SchoolDetailPkbm;

    return (
      <Suspense fallback={<div style={{ padding: 16 }}>Memuat detail…</div>}>
        {DetailComponent ? (
          <DetailComponent
            schoolData={{
              ...(selectedSchool.originalData || {}),
              kecamatan: selectedSchool.kecamatan,
            }}
          />
        ) : (
          <div className={styles.container}>
            <div className={styles.card}>
              <h2>Detail tidak tersedia</h2>
            </div>
          </div>
        )}
      </Suspense>
    );
  };

  const ChartsPlaceholder = () => (
    <section className={styles.chartsSection}>
      <div className={styles.pieChartsGrid}>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}>
            <h3>Kondisi Unit Toilet</h3>
          </header>
          <div className={styles.chartWrapper}>
            <ChartSkeleton height={280} />
          </div>
        </div>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}>
            <h3>Status Rehabilitasi</h3>
          </header>
          <div className={styles.chartWrapper}>
            <ChartSkeleton height={280} />
          </div>
        </div>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}>
            <h3>Status Pembangunan</h3>
          </header>
          <div className={styles.chartWrapper}>
            <ChartSkeleton height={280} />
          </div>
        </div>
      </div>

      <div className={styles.barChartsGrid}>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}>
            <h3>Kondisi Unit Toilet</h3>
          </header>
          <div className={styles.chartWrapper}>
            <ChartSkeleton height={320} />
          </div>
        </div>
        <div className={`${styles.card} ${styles.chartCard}`}>
          <header className={styles.chartHeader}>
            <h3>Kategori Intervensi</h3>
          </header>
          <div className={styles.chartWrapper}>
            <ChartSkeleton height={320} />
          </div>
        </div>
      </div>
    </section>
  );

  const renderMainView = () => {
    return (
      <div className={styles.container}>
        <header className={`${styles.card} ${styles.pageHeader}`}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>Dashboard Fasilitas Toilet Sekolah</h1>
            <p className={styles.pageSubtitle}>
              Analisis kondisi dan kebutuhan toilet sekolah di wilayah kerja
            </p>
          </div>
        </header>

        <FiltersBar />

        {rpcError && !error ? (
          <section className={`${styles.card} ${styles.tableCard}`}>
            <div style={{ padding: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Info</div>
              <div style={{ opacity: 0.9 }}>
                RPC gagal dipanggil, sistem memakai fallback perhitungan lokal. Detail: {rpcError}
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <section className={`${styles.card} ${styles.tableCard}`}>
            <header className={styles.cardHeader}>
              <div className={styles.tableHeaderContent}>
                <h2>Terjadi Kesalahan</h2>
              </div>
            </header>
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Gagal memuat data</h3>
              <p className={styles.errorMessage}>{error}</p>
              <button className={styles.retryButton} onClick={() => window.location.reload()}>
                Muat Ulang Halaman
              </button>
            </div>
          </section>
        ) : (
          <ErrorBoundary>
            <Suspense fallback={<ChartsPlaceholder />}>
              {loading || rpcLoading || !chartsReady ? (
                <ChartsPlaceholder />
              ) : (
                <ChartsSection
                  kondisiPieData={kondisiPieData}
                  rehabilitasiPieData={rehabilitasiPieData}
                  pembangunanPieData={pembangunanPieData}
                  kondisiToiletData={kondisiToiletData}
                  intervensiToiletData={intervensiToiletData}
                  customPieTooltip={customPieTooltip}
                  customBarTooltip={customBarTooltip}
                  renderLabelInside={renderLabelInside}
                />
              )}
            </Suspense>
          </ErrorBoundary>
        )}

        <section className={`${styles.card} ${styles.tableCard}`}>
          <header className={styles.cardHeader}>
            <div className={styles.tableHeaderContent}>
              <h2>Data Sekolah</h2>
            </div>
          </header>

          <DataTable
            data={mappedTableData}
            onDetailClick={handleDetailClickNavigate}
            onDetailPrefetch={handlePrefetchDetail}
            onDetailModulePrefetch={handlePrefetchModule}
            isLoading={loading}
          />
        </section>
      </div>
    );
  };

  return (
    <main className={styles.pageWrapper}>
      {currentView === "main" && renderMainView()}
      {renderDetailSection()}
    </main>
  );
};

export default FacilitiesPage;
