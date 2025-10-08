// src/services/api/schoolApi.js
import { supabase } from '@/services/supabaseClient';

/** =========================
 *  Utils
 *  ========================= */
const CHUNK_SIZE = 20; // kecil supaya URL PostgREST aman

function chunkArray(arr, size = CHUNK_SIZE) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const ensureArray = (x) => (Array.isArray(x) ? x : (x ? [x] : []));

async function selectAll(table, columns = '*') {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw error;
  return data || [];
}

/** =========================
 *  Schools
 *  ========================= */
export async function fetchAllSchools(columns = '*') {
  return selectAll('schools', columns);
}

export async function getSchoolById(id, columns = '*') {
  const { data, error } = await supabase
    .from('schools')
    .select(columns)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** =========================
 *  Helper: Schools by Filters
 *  ========================= */
async function fetchSchoolsByFilters(filters = {}) {
  const { level, kecamatan, village } = filters || {};
  let q = supabase.from('schools').select(`
    id,
    name,
    jenjang,
    kecamatan,
    village,
    lat,
    lng,
    updated_at
  `);

  if (level) q = q.eq('jenjang', level);
  if (kecamatan) q = q.eq('kecamatan', kecamatan);
  if (village) q = q.eq('village', village);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/** =========================
 *  Kegiatan
 *  ========================= */
export async function fetchAllKegiatanBySchoolIds(ids = [], columns = '*') {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length === 0) return [];

  const chunks = chunkArray(list);
  const results = await Promise.all(
    chunks.map(async (c) => {
      const { data, error } = await supabase
        .from('kegiatan')
        .select(columns)
        .in('school_id', c);
      if (error) throw error;
      return data || [];
    })
  );
  return results.flat();
}

/** =========================
 *  Class Conditions
 *  =========================
 *  (sesuai skema kamu: classrooms_good, classrooms_moderate_damage, ...)
 */
export async function fetchClassConditionsBySchoolIds(ids = []) {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length === 0) return [];

  const chunks = chunkArray(list);
  const results = await Promise.all(
    chunks.map(async (c) => {
      const { data, error } = await supabase
        .from('class_conditions')
        .select(`
          id,
          school_id,
          classrooms_good,
          classrooms_moderate_damage,
          classrooms_heavy_damage,
          total_room,
          lacking_rkb,
          total_mh,
          updated_at
        `)
        .in('school_id', c);
      if (error) throw error;
      return data || [];
    })
  );
  return results.flat();
}

/** =========================
 *  RPC helpers
 *  ========================= */
async function tryRpc(rpcName, payload) {
  const { data, error } = await supabase.rpc(rpcName, payload);
  if (error) return { ok: false, data: [], error };
  return { ok: true, data: data || [] };
}

/** =========================
 *  Load dataset (untuk SchoolDetailPage)
 *  =========================
 *  Input: filters { level, kecamatan, village }
 *  Output: array sekolah "merged" + relasi & coordinates
 */
export async function loadSchoolDatasetRPC(filters = {}) {
  // 1) Ambil sekolah sesuai filter
  const schools = await fetchSchoolsByFilters(filters);
  if (!schools.length) return [];

  const sids = schools.map((s) => s.id);

  // 2) Coba RPC, fallback ke SELECT biasa
  const [kegRpc, ccRpc] = await Promise.all([
    tryRpc('kegiatan_by_school_ids', { sids }),
    tryRpc('class_conditions_by_school_ids', { sids }),
  ]);

  const kegiatan = kegRpc.ok
    ? ensureArray(kegRpc.data)
    : await fetchAllKegiatanBySchoolIds(
        sids,
        'id,school_id,kegiatan,lokal,created_at,updated_at'
      );

  const classConditions = ccRpc.ok
    ? ensureArray(ccRpc.data)
    : await fetchClassConditionsBySchoolIds(sids);

  // 3) Index relasi per school_id
  const kegBySchool = new Map();
  for (const k of kegiatan) {
    if (!kegBySchool.has(k.school_id)) kegBySchool.set(k.school_id, []);
    kegBySchool.get(k.school_id).push(k);
  }

  // diasumsikan 1 row class_conditions per sekolah
  const ccBySchool = new Map();
  for (const c of classConditions) {
    ccBySchool.set(c.school_id, c);
  }

  // 4) Merge: bentuk array sesuai ekspektasi SchoolDetailPage
  const merged = schools.map((s) => {
    const hasNumber = (v) => typeof v === 'number' && !Number.isNaN(v);
    const coords =
      hasNumber(s.lng) && hasNumber(s.lat) ? [s.lng, s.lat] : null;

    return {
      ...s,
      // normalisasi nama field yang dipakai UI
      desa: s.village,
      coordinates: coords,
      kegiatan: kegBySchool.get(s.id) || [],
      class_conditions: ccBySchool.get(s.id) || null,
    };
  });

  return merged;
}

/** =========================
 *  Dashboard (opsional)
 *  ========================= */
export async function getDashboardStats() {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) throw error;
  return data;
}
