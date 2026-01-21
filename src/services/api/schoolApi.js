// src/services/api/schoolApi.js
import supabase from "@/services/supabaseClient";

/** =========================
 *  Utils
 *  ========================= */

// untuk RPC array uuid[] dan query IN() agar payload aman
const CHUNK_SIZE = 50;

function chunkArray(arr, size = CHUNK_SIZE) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const ensureArray = (x) => (Array.isArray(x) ? x : x ? [x] : []);

async function selectAll(table, columns = "*") {
  const { data, error } = await supabase.from(table).select(columns);
  if (error) throw error;
  return data || [];
}

const isAll = (v) => {
  if (v == null) return true;
  const s = String(v).trim().toUpperCase();
  return (
    s === "" ||
    s === "SEMUA" ||
    s === "ALL" ||
    s === "*" ||
    s === "NULL" ||
    s.startsWith("SEMUA ")
  );
};

const normFilter = (v) => (isAll(v) ? null : v);

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const getDeep = (obj, path, def = undefined) => {
  let cur = obj;
  for (const k of path) {
    if (!cur || typeof cur !== "object") return def;
    cur = cur[k];
  }
  return cur === undefined ? def : cur;
};

const hasAnyPositiveClassrooms = (c) => {
  if (!c) return false;
  return (
    toNum(c.good, 0) > 0 ||
    toNum(c.moderate, 0) > 0 ||
    toNum(c.heavy, 0) > 0 ||
    toNum(c.lacking, 0) > 0 ||
    toNum(c.total_room, 0) > 0
  );
};

function normalizeJenjang(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return "";
  if (s === "TK") return "PAUD";
  if (s.includes("PAUD")) return "PAUD";
  if (s.includes("SD")) return "SD";
  if (s.includes("SMP")) return "SMP";
  if (s.includes("PKBM")) return "PKBM";
  return s;
}

function extractJenjang(row) {
  const meta = isObj(row?.meta) ? row.meta : {};
  const details = isObj(row?.details) ? row.details : {};
  const raw =
    row?.jenjang ||
    row?.level ||
    row?.school_type_code ||
    row?.school_types?.code ||
    details?.jenjang ||
    details?.level ||
    meta?.jenjang ||
    meta?.level ||
    "";
  return normalizeJenjang(raw);
}

function extractDesa(row) {
  const meta = isObj(row?.meta) ? row.meta : {};
  const details = isObj(row?.details) ? row.details : {};
  // beberapa kemungkinan struktur
  return (
    row?.village ||
    row?.village_name ||
    row?.desa ||
    details?.desa ||
    details?.village ||
    meta?.desa ||
    meta?.village ||
    getDeep(meta, ["kelembagaan", "desa"]) ||
    getDeep(meta, ["lokasi", "desa"]) ||
    null
  );
}

function extractKecamatan(row) {
  const meta = isObj(row?.meta) ? row.meta : {};
  const details = isObj(row?.details) ? row.details : {};
  return (
    row?.kecamatan ||
    row?.kecamatan_name ||
    details?.kecamatan ||
    meta?.kecamatan ||
    meta?.subdistrict ||
    getDeep(meta, ["lokasi", "kecamatan"]) ||
    null
  );
}

function buildCoordinates(row) {
  const lat = toNum(row?.lat ?? row?.latitude, NaN);
  const lng = toNum(row?.lng ?? row?.longitude, NaN);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return [lng, lat]; // [lng, lat]
  // toleransi swap
  const lat2 = toNum(row?.lng, NaN);
  const lng2 = toNum(row?.lat, NaN);
  if (Number.isFinite(lat2) && Number.isFinite(lng2)) return [lng2, lat2];
  return null;
}

/**
 * classrooms utama dari meta.prasarana.classrooms
 * dukung variasi nama key (baik/good, rusakSedang/moderate, dll)
 */
function extractClassroomsFromMeta(meta) {
  if (!isObj(meta)) return { good: 0, moderate: 0, heavy: 0, total_room: 0, lacking: 0 };

  const c1 = getDeep(meta, ["prasarana", "classrooms"]);
  const c2 = getDeep(meta, ["classrooms"]);
  const c = (isObj(c1) && c1) || (isObj(c2) && c2) || {};

  const good = toNum(c.classrooms_good ?? c.good ?? c.baik ?? 0, 0);
  const moderate = toNum(
    c.classrooms_moderate_damage ??
      c.moderate_damage ??
      c.moderate ??
      c.rusak_sedang ??
      c.rusakSedang ??
      0,
    0
  );
  const heavy = toNum(
    c.classrooms_heavy_damage ??
      c.heavy_damage ??
      c.heavy ??
      c.rusak_berat ??
      c.rusakBerat ??
      0,
    0
  );
  const total_room = toNum(c.total_room ?? c.total ?? c.total_all ?? 0, 0);
  const lacking = toNum(
    c.lacking_rkb ?? c.kurang_rkb ?? c.kurangRkb ?? c.kurangRKB ?? 0,
    0
  );

  return { good, moderate, heavy, total_room, lacking };
}

function extractClassroomsFromClassCondition(class_condition) {
  const cc = isObj(class_condition) ? class_condition : {};
  const good = toNum(cc.classrooms_good ?? cc.good ?? cc.baik ?? 0, 0);
  const moderate = toNum(
    cc.classrooms_moderate_damage ?? cc.moderate ?? cc.rusak_sedang ?? cc.rusakSedang ?? 0,
    0
  );
  const heavy = toNum(
    cc.classrooms_heavy_damage ?? cc.heavy ?? cc.rusak_berat ?? cc.rusakBerat ?? 0,
    0
  );
  const total_room = toNum(cc.total_room ?? cc.total ?? 0, 0);
  const lacking = toNum(cc.lacking_rkb ?? cc.kurang_rkb ?? cc.kurangRKB ?? 0, 0);
  return { good, moderate, heavy, total_room, lacking };
}

/**
 * class_conditions RPC row (jika ada)
 */
function extractClassroomsFromCcRow(ccRow) {
  const r = isObj(ccRow) ? ccRow : {};
  const good = toNum(r.classrooms_good ?? r.good ?? r.baik ?? 0, 0);
  const moderate = toNum(
    r.classrooms_moderate_damage ?? r.moderate_damage ?? r.moderate ?? r.rusak_sedang ?? r.rusakSedang ?? 0,
    0
  );
  const heavy = toNum(
    r.classrooms_heavy_damage ?? r.heavy_damage ?? r.heavy ?? r.rusak_berat ?? r.rusakBerat ?? 0,
    0
  );
  const total_room = toNum(r.total_room ?? r.total ?? 0, 0);
  const lacking = toNum(r.lacking_rkb ?? r.kurang_rkb ?? r.kurangRKB ?? 0, 0);
  return { good, moderate, heavy, total_room, lacking };
}

/**
 * intervensi dari meta.kegiatanFisik
 * support object atau array
 */
function extractIntervensiFromMeta(meta) {
  const m = isObj(meta) ? meta : {};
  const kf = m.kegiatanFisik;

  // fallback flat
  let rehab = toNum(m.rehab_unit ?? m.rehabRuangKelas ?? 0, 0);
  let pembangunan = toNum(m.pembangunan_unit ?? m.pembangunanRKB ?? 0, 0);

  // object
  if (isObj(kf)) {
    rehab = Math.max(
      rehab,
      toNum(kf.rehab_unit ?? kf.rehabilitasi_unit ?? kf.rehab ?? kf.rehabilitasi ?? 0, 0)
    );
    pembangunan = Math.max(
      pembangunan,
      toNum(kf.pembangunan_unit ?? kf.pembangunan ?? kf.bangun ?? kf.rkb ?? 0, 0)
    );
  }

  // array
  if (Array.isArray(kf)) {
    let rSum = rehab;
    let pSum = pembangunan;

    for (const it of kf) {
      if (!isObj(it)) continue;
      const label = String(it.nama ?? it.jenis ?? it.kegiatan ?? it.type ?? it.title ?? "").toLowerCase();
      const qty = toNum(it.jumlah ?? it.unit ?? it.count ?? it.total ?? 0, 0);

      if (!label) continue;
      if (label.includes("rehab") || label.includes("rehabil")) rSum += qty;
      if (label.includes("pembangunan") || label.includes("bangun") || label.includes("rkb")) pSum += qty;
    }

    rehab = Math.max(rehab, rSum);
    pembangunan = Math.max(pembangunan, pSum);
  }

  return { rehab_unit: rehab, pembangunan_unit: pembangunan };
}

/** =========================
 *  Schools
 *  ========================= */
export async function fetchAllSchools(columns = "*") {
  return selectAll("schools", columns);
}

export async function getSchoolById(id, columns = "*") {
  const { data, error } = await supabase.from("schools").select(columns).eq("id", id).single();
  if (error) throw error;
  return data;
}

/** =========================
 *  RPC helpers
 *  ========================= */
async function tryRpc(rpcName, payload) {
  const { data, error } = await supabase.rpc(rpcName, payload);
  if (error) return { ok: false, data: null, error };
  return { ok: true, data: data ?? null };
}

function extractRows(d) {
  if (!d) return [];
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.rows)) return d.rows;
  if (d && Array.isArray(d.data)) return d.data;
  if (d && Array.isArray(d.items)) return d.items;
  return [];
}

/**
 * Ambil full row dari tabel schools berdasarkan uuid[] (agar meta/details selalu ada)
 */
async function hydrateSchoolsByIds(ids = []) {
  const list = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!list.length) return [];

  const chunks = chunkArray(list, 200); // untuk IN() lebih longgar
  const out = [];

  for (const c of chunks) {
    const { data, error } = await supabase
      .from("schools")
      .select(
        `
        id, name, npsn, address, status,
        student_count, st_male, st_female,
        lat, lng,
        village_name,
        kecamatan, kecamatan_name,
        meta, details, class_condition, facilities,
        school_type_id,
        school_types!school_type_id ( code, name )
      `
      )
      .in("id", c);

    if (error) throw error;
    out.push(...(data || []));
  }

  return out;
}

/** =========================
 *  Helper: Schools by Filters
 *  =========================
 *  Prioritas:
 *   1) get_schools_paginated
 *   2) get_schools_map_data
 *   3) rpc_map_schools
 *  Fallback:
 *   - schools_with_details (jika ada)
 *   - schools (paling pasti sesuai schema Anda)
 *
 *  Catatan penting:
 *  - Setelah dapat rows dari RPC/view, kita "hydrate" ke tabel schools supaya meta/details ikut terbawa.
 */
async function fetchSchoolsByFilters(filters = {}) {
  const level = normFilter(filters?.level ?? filters?.jenjang);
  const kecamatan = normFilter(filters?.kecamatan);
  const village = normFilter(filters?.village ?? filters?.desa);

  // -------- 1) Coba: get_schools_paginated
  const paginatedPayloads = [
    { p_page: 1, p_page_size: 10000, p_jenjang: level, p_kecamatan: kecamatan, p_desa: village },
    { page: 1, page_size: 10000, jenjang: level, kecamatan, desa: village },
    { _page: 1, _page_size: 10000, _jenjang: level, _kecamatan: kecamatan, _desa: village },
  ];

  for (const payload of paginatedPayloads) {
    const res = await tryRpc("get_schools_paginated", payload);
    if (!res.ok) continue;

    const rows = extractRows(res.data);
    if (rows.length) {
      // hydrate meta/details via tabel schools
      const ids = rows.map((r) => r?.id).filter(Boolean);
      const full = await hydrateSchoolsByIds(ids);
      const byId = new Map(full.map((x) => [x.id, x]));

      // merge: full override field dasar; row tetap menyumbang field view seperti jenjang/village jika ada
      return rows.map((r) => ({ ...(r || {}), ...(byId.get(r?.id) || {}) }));
    }
  }

  // -------- 2) Coba: get_schools_map_data
  const mapDataPayloads = [
    { p_jenjang: level, p_kecamatan: kecamatan, p_desa: village },
    { jenjang: level, kecamatan, desa: village },
    { _jenjang: level, _kecamatan: kecamatan, _desa: village },
  ];

  for (const payload of mapDataPayloads) {
    const res = await tryRpc("get_schools_map_data", payload);
    if (!res.ok) continue;

    const rows = extractRows(res.data);
    if (rows.length) {
      const ids = rows.map((r) => r?.id).filter(Boolean);
      const full = await hydrateSchoolsByIds(ids);
      const byId = new Map(full.map((x) => [x.id, x]));
      return rows.map((r) => ({ ...(r || {}), ...(byId.get(r?.id) || {}) }));
    }
  }

  // -------- 3) Coba: rpc_map_schools
  for (const payload of mapDataPayloads) {
    const res = await tryRpc("rpc_map_schools", payload);
    if (!res.ok) continue;

    const rows = extractRows(res.data);
    if (rows.length) {
      const ids = rows.map((r) => r?.id).filter(Boolean);
      const full = await hydrateSchoolsByIds(ids);
      const byId = new Map(full.map((x) => [x.id, x]));
      return rows.map((r) => ({ ...(r || {}), ...(byId.get(r?.id) || {}) }));
    }
  }

  // -------- 4) Coba: view schools_with_details (jika ada)
  // View bisa berubah-ubah kolomnya, jadi pilih minimal yang biasanya ada.
  try {
    let q = supabase
      .from("schools_with_details")
      .select("id,name,npsn,address,status,student_count,st_male,st_female,lat,lng,jenjang,kecamatan,village");

    if (level) q = q.eq("jenjang", String(level));
    if (kecamatan) q = q.eq("kecamatan", String(kecamatan));
    if (village) q = q.eq("village", String(village));

    const { data, error } = await q;
    if (!error && Array.isArray(data) && data.length) {
      const ids = data.map((r) => r?.id).filter(Boolean);
      const full = await hydrateSchoolsByIds(ids);
      const byId = new Map(full.map((x) => [x.id, x]));
      return data.map((r) => ({ ...(r || {}), ...(byId.get(r?.id) || {}) }));
    }
  } catch {
    // ignore → lanjut ke fallback tabel schools
  }

  // -------- 5) Fallback paling pasti: tabel schools (sesuai schema Anda)
  // Jika level diisi, cari school_type_id dari school_types supaya filter server-side tepat.
  let typeId = null;
  if (level) {
    try {
      const { data: st, error: stErr } = await supabase
        .from("school_types")
        .select("id")
        .eq("code", String(level).toUpperCase())
        .maybeSingle?.();

      if (!stErr && st?.id != null) typeId = st.id;
    } catch {
      // jika gagal, kita filter client-side nanti
      typeId = null;
    }
  }

  let q = supabase
    .from("schools")
    .select(
      `
      id, name, npsn, address, status,
      student_count, st_male, st_female,
      lat, lng,
      village_name,
      kecamatan, kecamatan_name,
      meta, details, class_condition, facilities,
      school_type_id,
      school_types!school_type_id ( code, name )
    `
    )
    .limit(10000);

  if (typeId != null) q = q.eq("school_type_id", typeId);
  if (kecamatan) {
    // karena ada kecamatan dan kecamatan_name, kita filter client-side untuk menghindari mismatch
  }
  if (village) {
    // sama, village_name bisa beda sumber
  }

  const { data, error } = await q;
  if (error) throw error;

  let rows = data || [];

  // fallback client-side filter jika perlu
  if (level && typeId == null) {
    const L = String(level).toUpperCase();
    rows = rows.filter((r) => String(r?.school_types?.code || "").toUpperCase() === L);
  }
  if (kecamatan) {
    const K = String(kecamatan).trim().toLowerCase();
    rows = rows.filter((r) => {
      const v = String(r?.kecamatan || r?.kecamatan_name || extractKecamatan(r) || "").trim().toLowerCase();
      return v === K;
    });
  }
  if (village) {
    const V = String(village).trim().toLowerCase();
    rows = rows.filter((r) => {
      const v = String(r?.village_name || extractDesa(r) || "").trim().toLowerCase();
      return v === V;
    });
  }

  return rows;
}

/** =========================
 *  Kegiatan
 *  ========================= */
export async function fetchAllKegiatanBySchoolIds(ids = []) {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length === 0) return [];

  const chunks = chunkArray(list);
  const results = await Promise.all(
    chunks.map(async (c) => {
      const { data, error } = await supabase.rpc("kegiatan_by_school_ids", { sids: c });
      if (error) throw error;
      return data || [];
    })
  );

  return results.flat();
}

/** =========================
 *  Class Conditions (RPC optional)
 *  ========================= */
export async function fetchClassConditionsBySchoolIds(ids = []) {
  const list = Array.isArray(ids) ? ids : [];
  if (list.length === 0) return [];

  const chunks = chunkArray(list);
  const results = await Promise.all(
    chunks.map(async (c) => {
      const { data, error } = await supabase.rpc("class_conditions_by_school_ids", { sids: c });
      if (error) throw error;
      return data || [];
    })
  );

  return results.flat();
}

/** =========================
 *  Load dataset (untuk SchoolDetailPage)
 *  =========================
 *  Input: filters { level/jenjang, kecamatan, village/desa }
 *  Output: array sekolah "merged" + relasi + derived fields untuk UI
 *
 *  FIX KRUSIAL:
 *  - kondisiKelas/kurangRKB diambil dari meta.prasarana.classrooms (utama)
 *  - rehab/pembangunan diambil dari meta.kegiatanFisik (utama)
 *  - RPC class_conditions hanya fallback terakhir
 */
export async function loadSchoolDatasetRPC(filters = {}) {
  // 1) Ambil sekolah sesuai filter (RPC/view/table) + sudah di-hydrate meta/details
  const schools = await fetchSchoolsByFilters(filters);
  if (!schools.length) return [];

  // Pastikan ada id (uuid) karena RPC kegiatan/class_conditions pakai school_id.
  const sids = schools.map((s) => s.id).filter(Boolean);
  if (!sids.length) return [];

  // 2) Kegiatan (opsional tetapi berguna)
  const kegRpc = await tryRpc("kegiatan_by_school_ids", { sids });
  const kegiatan = kegRpc.ok ? ensureArray(kegRpc.data) : await fetchAllKegiatanBySchoolIds(sids);

  // 3) class_conditions RPC: hanya fallback terakhir (karena meta adalah sumber utama)
  const ccRpc = await tryRpc("class_conditions_by_school_ids", { sids });
  const classConditions = ccRpc.ok ? ensureArray(ccRpc.data) : [];

  // Index relasi per school_id
  const kegBySchool = new Map();
  for (const k of kegiatan) {
    if (!k || !k.school_id) continue;
    if (!kegBySchool.has(k.school_id)) kegBySchool.set(k.school_id, []);
    kegBySchool.get(k.school_id).push(k);
  }

  // diasumsikan 1 row class_conditions per sekolah
  const ccBySchool = new Map();
  for (const c of classConditions) {
    if (!c || !c.school_id) continue;
    ccBySchool.set(c.school_id, c);
  }

  // 4) Merge: bentuk array sesuai ekspektasi SchoolDetailPage
  const merged = schools.map((s) => {
    // meta selalu ada (schema meta NOT NULL), tapi tetap aman
    const meta = isObj(s?.meta) ? s.meta : {};
    const details = isObj(s?.details) ? s.details : {};

    // derived region & jenjang
    const jenjang = extractJenjang(s) || normalizeJenjang(details?.jenjang) || "";
    const desaValue = extractDesa(s);
    const kecValue = extractKecamatan(s);

    // coordinates robust
    const coords = buildCoordinates(s);

    // ====== kondisi kelas: META (utama) ======
    const fromMeta = extractClassroomsFromMeta(meta);

    // fallback 1: class_condition kolom
    const fromClassCondition = extractClassroomsFromClassCondition(s?.class_condition);

    // fallback 2: RPC class_conditions row (jika ada)
    const fromCcRow = extractClassroomsFromCcRow(ccBySchool.get(s.id));

    let classrooms = fromMeta;
    if (!hasAnyPositiveClassrooms(classrooms) && hasAnyPositiveClassrooms(fromClassCondition)) {
      classrooms = fromClassCondition;
    }
    if (!hasAnyPositiveClassrooms(classrooms) && hasAnyPositiveClassrooms(fromCcRow)) {
      classrooms = fromCcRow;
    }

    // intervensi dari meta.kegiatanFisik
    const { rehab_unit, pembangunan_unit } = extractIntervensiFromMeta(meta);

    return {
      ...s,

      // alias yang sering dipakai UI
      namaSekolah: s.name || s.namaSekolah || "",
      jenjang: jenjang,
      desa: desaValue,
      kecamatan: kecValue,

      // map
      coordinates: coords,

      // yang dipakai chart/table di SchoolDetailPage
      kondisiKelas: {
        baik: toNum(classrooms.good, 0),
        rusakSedang: toNum(classrooms.moderate, 0),
        rusakBerat: toNum(classrooms.heavy, 0),
        total_room: toNum(classrooms.total_room, 0),
      },
      kurangRKB: toNum(classrooms.lacking, 0),

      rehabRuangKelas: toNum(rehab_unit, 0),
      pembangunanRKB: toNum(pembangunan_unit, 0),

      // relasi tambahan
      kegiatan: kegBySchool.get(s.id) || [],

      // tetap simpan kalau komponen lain butuh
      class_conditions: ccBySchool.get(s.id) || null,
    };
  });

  return merged;
}

/** =========================
 *  Dashboard
 *  ========================= */
export async function getDashboardStats() {
  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) throw error;
  return data;
}
