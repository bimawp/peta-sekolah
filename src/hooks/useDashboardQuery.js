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
        ? x.kecamatan ?? x.kecamatan_name ?? x.name ?? null
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

async function fetchSchoolsLite() {
  // minimal fields untuk top kecamatan/desa + fallback agregasi
  const { data, error } = await supabase
    .from("schools")
    .select(
      "id,npsn,school_type_id,kecamatan,kecamatan_name,village_name,class_condition"
    );
  if (error) throw error;
  return data || [];
}

/**
 * Fetch dashboard bundle (Supabase-first)
 */
async function fetchDashboardData() {
  const [statsRaw, kegiatanRaw, kondisiRaw, kecRaw, typeMap, schoolsLite] =
    await Promise.allSettled([
      rpcSafe(RPC_STATS),
      rpcSafe(RPC_KEGIATAN),
      rpcSafe(RPC_KONDISI),
      rpcSafe(RPC_KECAMATAN),
      fetchSchoolTypesMap(),
      fetchSchoolsLite(),
    ]);

  const stats = statsRaw.status === "fulfilled" ? asObject(statsRaw.value) : {};
  const kegiatanSummary =
    kegiatanRaw.status === "fulfilled" ? asArray(kegiatanRaw.value) : [];
  const kondisiSummary =
    kondisiRaw.status === "fulfilled" ? asArray(kondisiRaw.value) : [];
  const allKecamatan =
    kecRaw.status === "fulfilled" ? asKecamatanStrings(kecRaw.value) : [];
  const schoolTypesMap =
    typeMap.status === "fulfilled" ? typeMap.value : {};
  const schools =
    schoolsLite.status === "fulfilled" ? schoolsLite.value : [];

  return {
    stats,
    kegiatanSummary,
    kondisiSummary,
    allKecamatan,
    schoolTypesMap,
    schools,
    _debug: {
      stats_ok: statsRaw.status === "fulfilled",
      kegiatan_ok: kegiatanRaw.status === "fulfilled",
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
