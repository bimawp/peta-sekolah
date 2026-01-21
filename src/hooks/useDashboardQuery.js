// src/hooks/useDashboardQuery.js
import useSWR from "swr";
import supabase from "@/services/supabaseClient";

/**
 * RPC yang ADA di Supabase Anda
 */
const RPC_STATS = "get_dashboard_stats";
const RPC_KEGIATAN = "rpc_kegiatan_summary_by_jenjang";
const RPC_KONDISI = "rpc_kelas_kondisi_summary_by_jenjang";
const RPC_KECAMATAN = "get_unique_kecamatan";

/**
 * Helpers
 */
function asObject(v) {
  if (!v) return {};
  if (Array.isArray(v)) {
    const first = v[0];
    return first && typeof first === "object" && !Array.isArray(first) ? first : {};
  }
  return typeof v === "object" ? v : {};
}
function asArray(v) {
  return Array.isArray(v) ? v : v != null ? [v] : [];
}
function asKecamatanStrings(v) {
  const arr = asArray(v);
  if (arr.length === 0) return [];
  if (arr.every((x) => typeof x === "string")) return arr;
  return arr
    .map((x) =>
      x && typeof x === "object"
        ? x.kecamatan ?? x.kecamatan_name ?? x.subdistrict ?? x.name ?? null
        : null
    )
    .filter(Boolean);
}

async function rpcSafe(fn, args = {}) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

async function fetchSchoolTypesMap() {
  const { data, error } = await supabase.from("school_types").select("id,code");
  if (error) throw error;
  const map = {};
  (data || []).forEach((r) => {
    map[String(r.id)] = String(r.code || "").toUpperCase();
  });
  return map;
}

/**
 * ✅ NEW SCHEMA FIX:
 * - schools TIDAK punya kolom kecamatan / kecamatan_name lagi.
 * - sumber kecamatan sekarang dari locations.subdistrict
 * - sumber desa bisa dari schools.village_name (kalau ada) atau locations.village
 *
 * Agar Dashboard.jsx tidak perlu diubah, kita "menyediakan" field legacy:
 * - kecamatan, kecamatan_name  -> locations.subdistrict
 * - village                   -> locations.village
 */
async function fetchSchoolsLite() {
  // minimal fields untuk top kecamatan/desa + fallback agregasi
  const { data: schools, error: e1 } = await supabase
    .from("schools")
    .select("id,npsn,school_type_id,location_id,village_name,class_condition");
  if (e1) throw e1;

  const rows = schools || [];
  const ids = Array.from(
    new Set(rows.map((r) => r.location_id).filter((x) => x != null))
  );

  let locMap = {};
  if (ids.length) {
    const { data: locs, error: e2 } = await supabase
      .from("locations")
      .select("id,subdistrict,village")
      .in("id", ids);
    if (e2) throw e2;

    locMap = {};
    (locs || []).forEach((l) => {
      locMap[String(l.id)] = l;
    });
  }

  return rows.map((r) => {
    const loc = r.location_id != null ? locMap[String(r.location_id)] : null;
    const subdistrict = (loc?.subdistrict ?? null) && String(loc.subdistrict).trim()
      ? String(loc.subdistrict).trim()
      : null;
    const village = (loc?.village ?? null) && String(loc.village).trim()
      ? String(loc.village).trim()
      : null;

    const villageName =
      (r.village_name ?? null) && String(r.village_name).trim()
        ? String(r.village_name).trim()
        : village;

    return {
      ...r,

      // legacy keys agar Dashboard.jsx tidak perlu diubah
      kecamatan: subdistrict,
      kecamatan_name: subdistrict,
      village: village,

      // pastikan village_name tetap terisi untuk filter desa
      village_name: villageName,

      // optional: expose raw location fields jika perlu debug
      _loc: loc || null,
    };
  });
}

/**
 * ✅ fallback kegiatan dari tabel baru (school_projects)
 * Dipakai jika RPC_KEGIATAN gagal / kosong.
 */
async function fetchProjectsLite() {
  const { data, error } = await supabase
    .from("school_projects")
    .select("school_id,activity_name,volume,fiscal_year");
  if (error) throw error;
  return data || [];
}

function buildKegiatanSummaryFromProjects(projects, schools, schoolTypesMap) {
  const idToType = {};
  (schools || []).forEach((s) => {
    if (s?.id) idToType[String(s.id)] = s.school_type_id;
  });

  const sums = {
    PAUD: { rehab: 0, pembangunan: 0 },
    SD: { rehab: 0, pembangunan: 0 },
    SMP: { rehab: 0, pembangunan: 0 },
    PKBM: { rehab: 0, pembangunan: 0 },
  };

  (projects || []).forEach((p) => {
    const sid = p?.school_id ? String(p.school_id) : null;
    const stid = sid ? idToType[sid] : null;
    const jenjang = schoolTypesMap?.[String(stid)] || "UNKNOWN";
    if (!sums[jenjang]) return;

    const nm = String(p?.activity_name || "").toLowerCase();
    const vol = Number(p?.volume);
    const v = Number.isFinite(vol) ? vol : 0;
    if (v <= 0) return;

    if (nm.includes("rehab") || nm.includes("rehabil")) sums[jenjang].rehab += v;
    if (nm.includes("pembangunan")) sums[jenjang].pembangunan += v;
  });

  // bentuk LONG format yang sudah di-handle oleh Dashboard.jsx (branch "long format")
  return [
    { jenjang: "PAUD", kegiatan: "Rehabilitasi Ruang Kelas", total_lokal: sums.PAUD.rehab },
    { jenjang: "PAUD", kegiatan: "Pembangunan RKB", total_lokal: sums.PAUD.pembangunan },

    { jenjang: "SD", kegiatan: "Rehabilitasi Ruang Kelas", total_lokal: sums.SD.rehab },
    { jenjang: "SD", kegiatan: "Pembangunan RKB", total_lokal: sums.SD.pembangunan },

    { jenjang: "SMP", kegiatan: "Rehabilitasi Ruang Kelas", total_lokal: sums.SMP.rehab },
    { jenjang: "SMP", kegiatan: "Pembangunan RKB", total_lokal: sums.SMP.pembangunan },

    { jenjang: "PKBM", kegiatan: "Rehabilitasi Ruang Kelas", total_lokal: sums.PKBM.rehab },
    { jenjang: "PKBM", kegiatan: "Pembangunan RKB", total_lokal: sums.PKBM.pembangunan },
  ];
}

/**
 * Fetch dashboard bundle (Supabase-first)
 */
async function fetchDashboardData() {
  const [statsRaw, kegiatanRaw, kondisiRaw, kecRaw, typeMapRaw, schoolsLiteRaw] =
    await Promise.allSettled([
      rpcSafe(RPC_STATS),
      rpcSafe(RPC_KEGIATAN),
      rpcSafe(RPC_KONDISI),
      rpcSafe(RPC_KECAMATAN),
      fetchSchoolTypesMap(),
      fetchSchoolsLite(),
    ]);

  const stats = statsRaw.status === "fulfilled" ? asObject(statsRaw.value) : {};
  let kegiatanSummary =
    kegiatanRaw.status === "fulfilled" ? asArray(kegiatanRaw.value) : [];
  const kondisiSummary =
    kondisiRaw.status === "fulfilled" ? asArray(kondisiRaw.value) : [];
  const allKecamatan =
    kecRaw.status === "fulfilled" ? asKecamatanStrings(kecRaw.value) : [];
  const schoolTypesMap =
    typeMapRaw.status === "fulfilled" ? typeMapRaw.value : {};
  const schools =
    schoolsLiteRaw.status === "fulfilled" ? schoolsLiteRaw.value : [];

  // ✅ fallback intervensi jika RPC kegiatan kosong/gagal
  if (!kegiatanSummary.length) {
    try {
      const projects = await fetchProjectsLite();
      const fallback = buildKegiatanSummaryFromProjects(projects, schools, schoolTypesMap);
      if (Array.isArray(fallback) && fallback.length) kegiatanSummary = fallback;
    } catch (_) {
      // biarkan tetap [] jika fallback gagal
    }
  }

  return {
    stats,
    kegiatanSummary,
    kondisiSummary,
    allKecamatan,
    schoolTypesMap,
    schools,
    _debug: {
      stats_ok: statsRaw.status === "fulfilled",
      kegiatan_ok: kegiatanRaw.status === "fulfilled" || kegiatanSummary.length > 0,
      kondisi_ok: kondisiRaw.status === "fulfilled",
      kec_ok: kecRaw.status === "fulfilled",
      schools_count: schools.length,
    },
  };
}

/**
 * Default export: kompatibel dengan pemakaian lama {data, loading, error}
 */
export default function useDashboardData() {
  const { data, error, isLoading } = useSWR(
    "dashboardDataSupabase",
    fetchDashboardData,
    {
      revalidateOnFocus: false,
      dedupingInterval: 1000 * 60 * 5,
      keepPreviousData: true,
      errorRetryCount: 1,
    }
  );

  return {
    data,
    loading: isLoading,
    error: error ? error.message || String(error) : null,
  };
}

/**
 * Optional named export (kalau Anda butuh bentuk SWR asli)
 */
export function useDashboardQuery() {
  return useSWR("dashboardDataSupabase", fetchDashboardData, {
    revalidateOnFocus: false,
    dedupingInterval: 1000 * 60 * 5,
    keepPreviousData: true,
    errorRetryCount: 1,
  });
}
