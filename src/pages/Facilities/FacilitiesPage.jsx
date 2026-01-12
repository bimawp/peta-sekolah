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

// Supabase hanya untuk data sekolah & kegiatan,
// filter kecamatan/desa tetap murni dari JSON.
import supabase from "@/services/supabaseClient";

/* =====================================================================
   RPC (TERBARU)
   ===================================================================== */
const RPC_TOILET_SCHOOLS_CANDIDATES = [
  "rpc_facilities_toilet_schools",
  "rpc_facilities_toilet_school_list",
  "rpc_toilet_schools",
  "rpc_facilities_schools_toilet",
  "rpc_facilities_toilet_dataset_schools",
];

const RPC_TOILET_PROJECTS_CANDIDATES = [
  "rpc_facilities_toilet_projects",
  "rpc_facilities_toilet_project_list",
  "rpc_toilet_projects",
  "rpc_facilities_projects_toilet",
  "rpc_facilities_toilet_dataset_projects",
];

/**
 * Coba panggil RPC dari list kandidat (urut).
 * - Jika function tidak ada, lanjut ke kandidat berikutnya.
 * - Jika error selain "function not found", throw.
 */
async function rpcFirstAvailable(functionNames, args) {
  let lastErr = null;

  for (const fn of functionNames) {
    const { data, error } = await supabase.rpc(fn, args || {});
    if (!error) return { data, rpc: fn };

    lastErr = error;

    const msg = String(error?.message || "");
    const code = String(error?.code || "");

    const isNotFound =
      code === "PGRST202" ||
      /could not find the function/i.test(msg) ||
      /function .* does not exist/i.test(msg) ||
      /schema cache/i.test(msg);

    if (isNotFound) continue;

    throw error;
  }

  if (lastErr) throw lastErr;
  throw new Error("RPC failed (no candidate succeeded).");
}

/** Normalisasi aman: dukung beberapa variasi nama field dari RPC */
function pickFirst(obj, keys, fallback = null) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v !== undefined && v !== null) return v;
  }
  return fallback;
}

function ensureObject(x) {
  return x && typeof x === "object" ? x : {};
}

/**
 * Map row dari RPC -> bentuk yang dipakai normalizeSchoolData()
 * Target minimal:
 * { npsn, name, jenjang, village, kecamatan, type/status, toilets, teachers_toilet, students_toilet, student_count }
 *
 * FIX: tambahkan toilets_overall + total candidates karena banyak data non-SMP sering taruh di situ.
 * FIX KRITIS: toilets boleh null agar "UNKNOWN" tidak otomatis jadi 0.
 */
function mapRpcSchoolRowToLegacyShape(row) {
  const meta = ensureObject(row?.meta);

  const jenjangRaw =
    pickFirst(
      row,
      ["jenjang", "level", "school_level", "school_type_code", "code"],
      ""
    ) ||
    pickFirst(
      meta,
      ["jenjang", "level", "school_level", "school_type_code", "code"],
      ""
    );

  const jenjang = String(jenjangRaw || "").toUpperCase();

  const toiletsObj =
    pickFirst(row, ["toilets"], null) ??
    pickFirst(meta, ["toilets"], null) ??
    null;

  const toiletsOverallObj =
    pickFirst(
      row,
      ["toilets_overall", "toiletsOverall", "toilet_overall", "toiletOverall"],
      null
    ) ??
    pickFirst(
      meta,
      ["toilets_overall", "toiletsOverall", "toilet_overall", "toiletOverall"],
      null
    ) ??
    null;

  // Kandidat total toilet kalau hanya disediakan sebagai angka
  const toiletsTotalCandidate =
    pickFirst(row, ["toilets_total", "toiletsTotal", "total_toilet", "totalToilet"], null) ??
    pickFirst(meta, ["toilets_total", "toiletsTotal", "total_toilet", "totalToilet"], null) ??
    null;

  const teachersToiletObj =
    pickFirst(row, ["teachers_toilet"], null) ??
    pickFirst(meta, ["teachers_toilet"], null) ??
    {};

  const studentsToiletObj =
    pickFirst(row, ["students_toilet"], null) ??
    pickFirst(meta, ["students_toilet"], null) ??
    {};

  return {
    npsn: pickFirst(row, ["npsn"], ""),
    name: pickFirst(row, ["name", "nama", "nama_sekolah"], ""),
    jenjang,
    village: pickFirst(row, ["village", "desa", "village_name"], null),
    kecamatan: pickFirst(row, ["kecamatan", "subdistrict", "district"], null),
    type: pickFirst(row, ["type", "tipe", "status"], null),
    status: pickFirst(row, ["status", "type"], null),

    // penting
    toilets: toiletsObj, // bisa null / object / string-json
    toilets_overall: toiletsOverallObj, // sering dipakai agregat
    toilets_total_candidate: toiletsTotalCandidate, // kadang angka doang

    teachers_toilet: ensureObject(teachersToiletObj),
    students_toilet: ensureObject(studentsToiletObj),

    student_count: pickFirst(row, ["student_count", "siswa", "jumlah_siswa"], 0),
    meta,
  };
}

/* =====================================================================
   Helpers: cache detail di sessionStorage agar hover "Detail" terasa cepat
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
    sessionStorage.setItem(
      getCacheKey(jenjang, npsn),
      JSON.stringify({ ts: Date.now(), data })
    );
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

/** Prefetch modul detail (biar first render komponen detail lebih cepat di tab baru) */
async function prefetchDetailModule(jenjang) {
  try {
    if (jenjang === "SD")
      await import("@/components/schools/SchoolDetail/Sd/SchoolDetailSd");
    if (jenjang === "SMP")
      await import("@/components/schools/SchoolDetail/Smp/SchoolDetailSmp");
    if (jenjang === "PAUD")
      await import("@/components/schools/SchoolDetail/Paud/SchoolDetailPaud");
    if (jenjang === "PKBM")
      await import("@/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm");
  } catch {}
}

/* =====================================================================
   Helpers umum
===================================================================== */
const norm = (x) =>
  String(x == null ? "" : x)
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();

const keyify = (x) =>
  norm(x)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

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

    // numeric string
    if (/^-?\d+(\.\d+)?$/.test(s)) return true;

    // json string
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

// ambil counters (good/moderate/heavy/total) dari berbagai bentuk
const readToiletCounters = (raw) => {
  // normalize raw ke object
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
    good: ["good", "baik", "toilet_baik"],
    moderate: ["moderate_damage", "rusak_sedang", "rusakSedang", "sedang"],
    heavy: ["heavy_damage", "rusak_berat", "rusakBerat", "berat"],
    total: ["total", "jumlah", "toilets_total", "total_toilet", "totalUnit", "total_unit"],
  };

  // male/female split
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

/**
 * Klasifikasi kegiatan toilet
 */
const classifyToiletActivity = (name) => {
  const nm = String(name || "").toLowerCase();
  if (!/(toilet|jamban|wc)/i.test(nm)) return null;

  if (
    nm.includes("rehab") ||
    nm.includes("rehabilitasi") ||
    nm.includes("renov") ||
    nm.includes("perbaikan") ||
    nm.includes("pemeliharaan") ||
    nm.includes("perawatan") ||
    nm.includes("repair")
  ) {
    return "Rehab Toilet";
  }

  if (
    nm.includes("pembangunan") ||
    nm.includes("bangun") ||
    nm.includes("baru") ||
    nm.includes("penambahan")
  ) {
    return "Pembangunan Toilet";
  }

  return "Kegiatan Toilet Lain";
};

/**
 * Normalisasi 1 row sekolah -> angka toilet konsisten
 *
 * FIX UTAMA:
 * - bedakan ZERO vs UNKNOWN
 * - jika UNKNOWN: toiletKnown=false dan totalToiletUnits=null (jangan dihitung “tanpa toilet”)
 */
const normalizeSchoolData = (school) => {
  let tipe = school.type || school.status || "Tidak Diketahui";
  if (school.jenjang === "PAUD" || school.jenjang === "PKBM") tipe = "Swasta";

  const jenjang = String(school.jenjang || "").toUpperCase();

  // STRONG evidence: toilets/toilets_overall/total-candidate ada bentuknya (meski 0)
  const strongEvidence =
    hasEvidence(school.toilets) ||
    hasEvidence(school.toilets_overall) ||
    hasEvidence(school.toilets_total_candidate);

  // SMP split (teachers/students) hanya dianggap evidence kalau ada angka > 0
  const t = readToiletCounters(school.teachers_toilet || {});
  const s = readToiletCounters(school.students_toilet || {});
  const splitPositive =
    t.total + s.total > 0 ||
    t.good + t.moderate + t.heavy + s.good + s.moderate + s.heavy > 0;

  const toiletKnown = strongEvidence || (jenjang === "SMP" && splitPositive);

  // kalau UNKNOWN, jangan dipaksa jadi 0 (biar tidak dihitung “tanpa toilet”)
  if (!toiletKnown) {
    return {
      npsn: String(school.npsn || ""),
      nama: school.name,
      jenjang,
      tipe,
      desa: school.village,
      kecamatan: school.kecamatan,

      toiletBaik: 0,
      toiletRusakSedang: 0,
      toiletRusakBerat: 0,

      totalToilet: 0,
      totalToiletUnits: null, // penting
      toiletKnown: false,

      student_count: school.student_count == null ? 0 : toInt(school.student_count),
      originalData: school,
    };
  }

  // KNOWN: tentukan sumber angka
  let toiletBaik = 0;
  let toiletRusakSedang = 0;
  let toiletRusakBerat = 0;
  let totalToiletUnits = 0;

  if (jenjang === "SMP" && splitPositive) {
    toiletBaik = t.good + s.good;
    toiletRusakSedang = t.moderate + s.moderate;
    toiletRusakBerat = t.heavy + s.heavy;

    totalToiletUnits = t.total + s.total;
    if (totalToiletUnits <= 0)
      totalToiletUnits = toiletBaik + toiletRusakSedang + toiletRusakBerat;
  } else {
    // pakai toilets / toilets_overall / total-candidate (ambil yang ada evidence pertama)
    const source = hasEvidence(school.toilets)
      ? school.toilets
      : hasEvidence(school.toilets_overall)
      ? school.toilets_overall
      : school.toilets_total_candidate;

    const c = readToiletCounters(source);

    toiletBaik = c.good;
    toiletRusakSedang = c.moderate;
    toiletRusakBerat = c.heavy;
    totalToiletUnits = c.total;

    if (totalToiletUnits <= 0)
      totalToiletUnits = toiletBaik + toiletRusakSedang + toiletRusakBerat;
  }

  const totalToilet = toiletBaik + toiletRusakSedang + toiletRusakBerat;

  return {
    npsn: String(school.npsn || ""),
    nama: school.name,
    jenjang,
    tipe,
    desa: school.village,
    kecamatan: school.kecamatan,

    toiletBaik,
    toiletRusakSedang,
    toiletRusakBerat,

    totalToilet,
    totalToiletUnits, // 0 kalau benar-benar 0, bukan karena unknown
    toiletKnown: true,

    student_count: school.student_count == null ? 0 : toInt(school.student_count),
    originalData: school,
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

  const kecamatanOptions = Array.from(kecMap.values()).sort((a, b) =>
    a.localeCompare(b, "id")
  );

  const desaByKecamatan = {};
  desaMap.forEach((dMap, kKey) => {
    desaByKecamatan[kKey] = Array.from(dMap.values()).sort((a, b) =>
      a.localeCompare(b, "id")
    );
  });

  return { kecamatanOptions, desaByKecamatan };
};

/* =====================================================================
   DataTable
===================================================================== */
const DataTable = memo(function DataTable({
  data,
  onDetailClick,
  onDetailPrefetch,
  onDetailModulePrefetch,
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
                      <span className={styles.numberBadge}>
                        {Number(school.student_count || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.conditionGood}>
                        {Number((school.kondisiKelas && school.kondisiKelas.baik) || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.conditionModerate}>
                        {Number((school.kondisiKelas && school.kondisiKelas.rusakSedang) || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.conditionBad}>
                        {Number((school.kondisiKelas && school.kondisiKelas.rusakBerat) || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.numberBadge}>{Number(school.kurangRKB || 0)}</span>
                    </td>
                    <td>
                      <span className={styles.numberBadge}>
                        {Number(school.rehabRuangKelas || 0)}
                      </span>
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
                        onClick={() => onDetailClick && onDetailClick(school)}
                      >
                        <span className={styles.detailIcon}>👁️</span> Detail
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
                    Tidak ada data
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

  const [selectedJenjang, setSelectedJenjang] = useState("Semua Jenjang");
  const [selectedKecamatan, setSelectedKecamatan] = useState("Semua Kecamatan");
  const [selectedDesa, setSelectedDesa] = useState("Semua Desa");

  const [schoolData, setSchoolData] = useState([]);
  const [kegiatanData, setKegiatanData] = useState([]);
  const [filteredSchoolData, setFilteredSchoolData] = useState([]);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [desaByKecamatan, setDesaByKecamatan] = useState({});

  const [kondisiPieData, setKondisiPieData] = useState([]);
  const [rehabilitasiPieData, setRehabilitasiPieData] = useState([]);
  const [pembangunanPieData, setPembangunanPieData] = useState([]);
  const [kondisiToiletData, setKondisiToiletData] = useState([]);
  const [intervensiToiletData, setIntervensiToiletData] = useState([]);

  const performSearch = (data) => {
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
  };

  useEffect(() => {
    let cancelled = false;

    const initializeData = async () => {
      setLoading(true);
      setError(null);

      try {
        const urls = {
          paud: "https://peta-sekolah.vercel.app/paud/data/paud.json",
          sd: "https://peta-sekolah.vercel.app/sd/data/sd_new.json",
          smp: "https://peta-sekolah.vercel.app/smp/data/smp.json",
          pkbm: "https://peta-sekolah.vercel.app/pkbm/data/pkbm.json",
          kecamatan: "https://peta-sekolah.vercel.app/data/kecamatan.geojson",
        };

        const [
          schoolsRpcRes,
          projectsRpcRes,
          paudJson,
          sdJson,
          smpJson,
          pkbmJson,
          kecamatanGeoJson,
        ] = await Promise.all([
          rpcFirstAvailable(RPC_TOILET_SCHOOLS_CANDIDATES, {}),
          rpcFirstAvailable(RPC_TOILET_PROJECTS_CANDIDATES, {}),
          fetch(urls.paud).then((res) => res.json()).catch(() => null),
          fetch(urls.sd).then((res) => res.json()).catch(() => null),
          fetch(urls.smp).then((res) => res.json()).catch(() => null),
          fetch(urls.pkbm).then((res) => res.json()).catch(() => null),
          fetch(urls.kecamatan).then((res) => res.json()).catch(() => null),
        ]);

        if (cancelled) return;

        const schoolsRpcDataRaw = schoolsRpcRes?.data;
        const schoolsRpcRows = Array.isArray(schoolsRpcDataRaw)
          ? schoolsRpcDataRaw
          : Array.isArray(schoolsRpcDataRaw?.schools)
          ? schoolsRpcDataRaw.schools
          : [];

        const projectsRpcDataRaw = projectsRpcRes?.data;
        const projectsRpcRows = Array.isArray(projectsRpcDataRaw)
          ? projectsRpcDataRaw
          : Array.isArray(projectsRpcDataRaw?.projects)
          ? projectsRpcDataRaw.projects
          : [];

        const allRawData = (schoolsRpcRows || []).map((row) =>
          mapRpcSchoolRowToLegacyShape(row)
        );

        const allProcessedData = allRawData.map(normalizeSchoolData);
        setSchoolData(allProcessedData);

        const allKegiatanData = (projectsRpcRows || []).map((p) => ({
          Kegiatan: pickFirst(p, ["activity_name", "kegiatan", "Kegiatan"], ""),
          Lokal: pickFirst(p, ["volume", "nilai", "Lokal"], null),
          school_id: pickFirst(p, ["school_id"], null),
          npsn: pickFirst(p, ["npsn"], null),
        }));
        setKegiatanData(allKegiatanData);

        const flattenSchoolData = (dataByKecamatan) => {
          if (!dataByKecamatan) return [];
          return Object.entries(dataByKecamatan).flatMap(([kecamatanName, schools]) =>
            (schools || []).map((school) => ({
              ...school,
              kecamatan: kecamatanName,
            }))
          );
        };

        const jsonSchools = [
          ...flattenSchoolData(paudJson),
          ...flattenSchoolData(sdJson),
          ...flattenSchoolData(smpJson),
          ...flattenSchoolData(pkbmJson),
        ];

        const { kecamatanOptions: kecFromJson, desaByKecamatan } =
          buildLocationMasterFromSchools(jsonSchools);

        setDesaByKecamatan(desaByKecamatan || {});

        let finalKecamatanOptions = [];
        if (kecamatanGeoJson && Array.isArray(kecamatanGeoJson.features)) {
          const allDistricts = kecamatanGeoJson.features
            .map((feature) => feature.properties && feature.properties.district)
            .filter(Boolean)
            .map(normKecamatanLabel);

          const uniqueDistricts = [...new Set(allDistricts)].sort((a, b) =>
            a.localeCompare(b, "id")
          );
          finalKecamatanOptions = uniqueDistricts;
        } else {
          finalKecamatanOptions = kecFromJson || [];
        }
        setKecamatanOptions(finalKecamatanOptions);

        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          const msg = e?.message ? e.message : String(e);
          setError(`Failed to load data: ${msg}`);
          setLoading(false);
        }
      }
    };

    initializeData();

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

  useEffect(() => {
    if (schoolData.length === 0) return;

    startTransition(() => {
      let filtered = schoolData;

      if (selectedJenjang !== "Semua Jenjang")
        filtered = filtered.filter((s) => s.jenjang === selectedJenjang);

      if (selectedKecamatan !== "Semua Kecamatan")
        filtered = filtered.filter(
          (s) =>
            normKecamatanLabel(s.kecamatan || "") ===
            normKecamatanLabel(selectedKecamatan || "")
        );

      if (selectedDesa !== "Semua Desa")
        filtered = filtered.filter(
          (s) => String(s.desa || "") === String(selectedDesa || "")
        );

      filtered = performSearch(filtered);
      setFilteredSchoolData(filtered);

      scheduleMicrotask(() => {
        generateChartData(filtered, kegiatanData);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    schoolData,
    kegiatanData,
    selectedJenjang,
    selectedKecamatan,
    selectedDesa,
    deferredSearchQuery,
  ]);

  const resetAllFilters = () => {
    setSelectedJenjang("Semua Jenjang");
    setSelectedKecamatan("Semua Kecamatan");
    setSelectedDesa("Semua Desa");
    setSearchQuery("");
  };

  const renderLabelInside = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    actualCount,
  }) => {
    if (!actualCount) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight="bold"
      >
        <tspan x={x} dy="-0.3em">{`${percent.toFixed(1)}%`}</tspan>
        <tspan x={x} dy="1.2em">
          ({actualCount})
        </tspan>
      </text>
    );
  };

  const customPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const p = data && data.payload ? data.payload : null;
      if (!p || p.percent === undefined) return null;
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipContent}>
            <span className={styles.tooltipLabel}>{p.name}</span>
            <span className={styles.tooltipValue}>
              {p.actualCount} unit ({p.percent.toFixed(1)}%)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const customBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipContent}>
            <span className={styles.tooltipLabel}>{label}</span>
            <span className={styles.tooltipValue}>{payload[0].value} unit</span>
          </div>
        </div>
      );
    }
    return null;
  };

  /**
   * Generate charts
   * FIX: "Sekolah Tanpa Toilet" = KNOWN + totalToiletUnits==0 (UNKNOWN tidak dihitung).
   */
  const generateChartData = (schoolsFiltered, allKegiatanData) => {
    const schools = Array.isArray(schoolsFiltered) ? schoolsFiltered : [];
    const kegiatan = Array.isArray(allKegiatanData) ? allKegiatanData : [];

    let totalBaik = 0;
    let totalSedang = 0;
    let totalBerat = 0;

    for (const s of schools) {
      totalBaik += toInt(s?.toiletBaik);
      totalSedang += toInt(s?.toiletRusakSedang);
      totalBerat += toInt(s?.toiletRusakBerat);
    }

    const totalUnit = totalBaik + totalSedang + totalBerat;

    // FIX: UNKNOWN tidak dihitung; KNOWN + zero saja.
    const sekolahTanpaToilet = schools.reduce((acc, s) => {
      if (!s?.toiletKnown) return acc; // UNKNOWN tidak dihitung
      return acc + (toInt(s.totalToiletUnits) === 0 ? 1 : 0);
    }, 0);

    // Konsisten: set NPSN yang benar-benar KNOWN & zero
    const tanpaToiletSet = new Set(
      schools
        .filter((s) => s?.toiletKnown && toInt(s.totalToiletUnits) === 0)
        .map((s) => String(s?.npsn || "").trim())
        .filter(Boolean)
    );

    // (Opsional) Debug cepat di DEV
    if (import.meta?.env?.DEV) {
      const known = schools.filter((s) => s?.toiletKnown).length;
      const unknown = schools.length - known;
      const zeroKnown = schools.filter((s) => s?.toiletKnown && toInt(s.totalToiletUnits) === 0)
        .length;
      // eslint-disable-next-line no-console
      console.log(
        "[TOILET DEBUG] schools:",
        schools.length,
        "known:",
        known,
        "unknown:",
        unknown,
        "known_zero:",
        zeroKnown
      );
    }

    const allowedNpsn = new Set(
      schools.map((s) => String(s?.npsn || "").trim()).filter(Boolean)
    );

    const pembangunanSet = new Set();
    const rehabSet = new Set();

    for (const k of kegiatan) {
      const npsn = String(k?.npsn || "").trim();
      if (!npsn) continue;
      if (!allowedNpsn.has(npsn)) continue;

      const cat = classifyToiletActivity(k?.Kegiatan);
      if (cat === "Pembangunan Toilet") {
        if (tanpaToiletSet.has(npsn)) pembangunanSet.add(npsn);
      } else if (cat === "Rehab Toilet") {
        rehabSet.add(npsn);
      }
    }

    const pembangunanDilakukan = pembangunanSet.size;
    const rehabDilakukan = rehabSet.size;
    const totalIntervensi = new Set([...pembangunanSet, ...rehabSet]).size;

    const kebutuhanBelumDibangun = Math.max(0, sekolahTanpaToilet - pembangunanDilakukan);

    const pieDataMapper = (d) => ({ ...d, actualCount: d.value });

    // Pembangunan pie
    {
      const a = kebutuhanBelumDibangun;
      const b = pembangunanDilakukan;
      const total = a + b || 1;

      const slices = [
        {
          name: "Kebutuhan Toilet (Belum dibangun)",
          value: a,
          percent: (a / total) * 100,
          color: "#FF6B6B",
        },
        {
          name: "Pembangunan dilakukan",
          value: b,
          percent: (b / total) * 100,
          color: "#4ECDC4",
        },
      ].filter((d) => d.value > 0);

      setPembangunanPieData(
        slices.length
          ? slices.map(pieDataMapper)
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

    // Rehabilitasi pie (sesuai kebutuhan angka kamu)
    {
      const belum = totalBerat;
      const done = rehabDilakukan;
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
      ].filter((d) => d.value > 0);

      setRehabilitasiPieData(
        slices.length
          ? slices.map(pieDataMapper)
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

    // Bar Intervensi
    setIntervensiToiletData([
      { name: "Total Intervensi", value: totalIntervensi, color: "#667eea" },
      { name: "Pembangunan Toilet", value: pembangunanDilakukan, color: "#4ECDC4" },
      { name: "Rehab Toilet", value: rehabDilakukan, color: "#FFD93D" },
    ]);

    // Bar Kondisi Toilet
    setKondisiToiletData([
      { name: "Total Unit", value: totalUnit, color: "#667eea" },
      { name: "Unit Baik", value: totalBaik, color: "#4ECDC4" },
      { name: "Unit Rusak Sedang", value: totalSedang, color: "#FFD93D" },
      { name: "Unit Rusak Berat", value: totalBerat, color: "#FF6B6B" },
      // INI HARUSnya turun ke ~1186 jika UNKNOWN tidak dihitung
      { name: "Sekolah Tanpa Toilet", value: sekolahTanpaToilet, color: "#ff8787" },
    ]);

    // Pie Kondisi Toilet
    if (totalUnit > 0) {
      setKondisiPieData(
        [
          {
            name: "Baik",
            value: totalBaik,
            percent: (totalBaik / totalUnit) * 100,
            color: "#4ECDC4",
          },
          {
            name: "Rusak Sedang",
            value: totalSedang,
            percent: (totalSedang / totalUnit) * 100,
            color: "#FFD93D",
          },
          {
            name: "Rusak Berat",
            value: totalBerat,
            percent: (totalBerat / totalUnit) * 100,
            color: "#FF6B6B",
          },
        ].map(pieDataMapper)
      );
    } else {
      setKondisiPieData([
        {
          name: "Tidak Ada Data",
          value: 1,
          actualCount: 0,
          percent: 100,
          color: "#95A5A6",
        },
      ]);
    }
  };

  const mappedTableData = useMemo(() => {
    return (filteredSchoolData || []).map((s) => ({
      npsn: s.npsn,
      namaSekolah: s.nama,
      jenjang: s.jenjang,
      tipeSekolah: s.tipe,
      desa: s.desa,
      kecamatan: s.kecamatan,
      student_count: Number(s.student_count || 0),
      kondisiKelas: {
        baik: Number(s.toiletBaik || 0),
        rusakSedang: Number(s.toiletRusakSedang || 0),
        rusakBerat: Number(s.toiletRusakBerat || 0),
      },
      kurangRKB: 0,
      rehabRuangKelas: 0,
      pembangunanRKB: 0,
    }));
  }, [filteredSchoolData]);

  const handleDetailClickNavigate = useCallback((row) => {
    const npsn = row && row.npsn ? row.npsn : null;
    const jenjang = String(row && row.jenjang ? row.jenjang : "").toUpperCase();
    if (!npsn) {
      alert("NPSN sekolah tidak ditemukan.");
      return;
    }
    let url = `/detail-sekolah?npsn=${encodeURIComponent(npsn)}&jenjang=${encodeURIComponent(
      jenjang
    )}`;
    if (jenjang === "PAUD") url = `/paud/school_detail?npsn=${encodeURIComponent(npsn)}`;
    if (jenjang === "SD") url = `/sd/school_detail?npsn=${encodeURIComponent(npsn)}`;
    if (jenjang === "SMP") url = `/smp/school_detail?npsn=${encodeURIComponent(npsn)}`;
    if (jenjang === "PKBM") url = `/pkbm/school_detail?npsn=${encodeURIComponent(npsn)}`;
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

  const FiltersBar = () => (
    <section className={`${styles.card} ${styles.filtersCard || ""}`}>
      <header className={styles.cardHeader}>
        <h2>Filter Data</h2>
      </header>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          alignItems: "end",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
            Filter Jenjang
          </label>
          <select
            value={selectedJenjang}
            onChange={(e) => setSelectedJenjang(e.target.value)}
            className={styles.itemsPerPageSelect}
            style={{ width: "100%" }}
          >
            {jenjangOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
            Filter Kecamatan
          </label>
          <select
            value={selectedKecamatan}
            onChange={(e) => {
              setSelectedKecamatan(e.target.value);
              setSelectedDesa("Semua Desa");
            }}
            className={styles.itemsPerPageSelect}
            style={{ width: "100%" }}
          >
            {["Semua Kecamatan", ...kecamatanOptions].map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
            Filter Desa
          </label>
          <select
            value={selectedDesa}
            onChange={(e) => setSelectedDesa(e.target.value)}
            className={styles.itemsPerPageSelect}
            style={{ width: "100%" }}
            disabled={selectedKecamatan === "Semua Kecamatan"}
          >
            {desaOptionsFiltered.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>
            Pencarian Cepat
          </label>
          <input
            type="text"
            placeholder="Cari nama sekolah / NPSN / desa / kecamatan…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <button
            onClick={resetAllFilters}
            className={styles.resetTableButton}
            style={{ width: "100%", marginTop: 6 }}
          >
            Reset Semua Filter
          </button>
        </div>
      </div>
    </section>
  );

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

  const renderMainView = () => {
    if (loading) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p className={styles.loadingText}>Memuat data sekolah...</p>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Terjadi Kesalahan</h3>
              <p className={styles.errorMessage}>{error}</p>
              <button className={styles.retryButton} onClick={() => window.location.reload()}>
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

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

        <ErrorBoundary>
          <Suspense
            fallback={
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
            }
          >
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
          </Suspense>
        </ErrorBoundary>

        <section className={`${styles.card} ${styles.tableCard}`}>
          <header className={styles.cardHeader}>
            <div className={styles.tableHeaderContent}>
              <h2>Data Sekolah</h2>
            </div>
          </header>

          <div className={styles.chartContent}>
            <DataTable
              data={mappedTableData}
              onDetailClick={handleDetailClickNavigate}
              onDetailPrefetch={handlePrefetchDetail}
              onDetailModulePrefetch={handlePrefetchModule}
            />
          </div>
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
