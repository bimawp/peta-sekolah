// src/services/api/detailApi.js
import supabase from "@/services/supabaseClient";

/**
 * RPC yang tersedia (sesuai output Anda):
 * - get_school_detail_by_npsn(input_npsn text)
 * - get_school_full_details_by_npsn(npsn_val text)
 * - rpc_school_detail_by_npsn(p_npsn text)
 * - rpc_school_detail_by_npsn_meta(p_npsn text)
 */
const RPC_CHAIN = [
  { name: "get_school_full_details_by_npsn", arg: "npsn_val" }, // paling kaya
  { name: "get_school_detail_by_npsn", arg: "input_npsn" },
  { name: "rpc_school_detail_by_npsn", arg: "p_npsn" },
  { name: "rpc_school_detail_by_npsn_meta", arg: "p_npsn" },
];

function pickRow(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data;
}

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

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

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
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
  const meta = row?.meta || {};
  const details = row?.details || {};
  const raw =
    row?.jenjang ||
    row?.level ||
    row?.school_type_code ||
    row?.school_type?.code ||
    details?.jenjang ||
    details?.level ||
    meta?.jenjang ||
    meta?.level ||
    "";
  return normalizeJenjang(raw) || "SMP";
}

function extractRegion(row) {
  const meta = row?.meta || {};
  const details = row?.details || {};

  const desa =
    row?.desa ||
    row?.village_name ||
    row?.village ||
    details?.desa ||
    details?.village ||
    meta?.desa ||
    meta?.village ||
    row?.locations?.village ||
    row?._raw?.locations?.village ||
    "-";

  const kecamatan =
    row?.kecamatan ||
    row?.kecamatan_name ||
    details?.kecamatan ||
    meta?.kecamatan ||
    row?.locations?.subdistrict ||
    row?.locations?.district ||
    row?._raw?.locations?.subdistrict ||
    row?._raw?.locations?.district ||
    "-";

  return { desa, kecamatan };
}

function attachCoordinates(row) {
  const lat = toNum(row?.lat ?? row?.latitude ?? row?._raw?.lat, NaN);
  const lng = toNum(row?.lng ?? row?.longitude ?? row?._raw?.lng, NaN);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { coordinates: [lng, lat] }; // [lng, lat]
  }
  return {};
}

/**
 * Pastikan meta shape konsisten (menggabungkan meta dari row & details)
 * + memaksa prasarana.classrooms & prasarana.ukuran minimal ada
 */
function ensureMetaShape(row) {
  const meta = isObj(row?.meta) ? row.meta : {};
  const details = isObj(row?.details) ? row.details : {};

  const mergedMeta = deepMerge(meta, isObj(details?.meta) ? details.meta : {});

  const pr = isObj(mergedMeta.prasarana) ? mergedMeta.prasarana : {};
  const kl = isObj(mergedMeta.kelembagaan) ? mergedMeta.kelembagaan : {};

  // ukuran (sesuai inputan DataInputForm)
  const ukuranExisting = isObj(pr.ukuran) ? pr.ukuran : {};
  const ukuran = deepMerge(ukuranExisting, {
    tanah: toNum(ukuranExisting?.tanah, toNum(pr?.ukuran?.tanah, 0)),
    bangunan: toNum(ukuranExisting?.bangunan, toNum(pr?.ukuran?.bangunan, 0)),
    halaman: toNum(ukuranExisting?.halaman, toNum(pr?.ukuran?.halaman, 0)),
  });

  // classrooms (sesuai inputan DataInputForm)
  const classroomsExisting = isObj(pr.classrooms) ? pr.classrooms : {};
  const classrooms = deepMerge(classroomsExisting, {
    total_room: toNum(classroomsExisting?.total_room, toNum(pr?.classrooms?.total_room, 0)),
    classrooms_good: toNum(classroomsExisting?.classrooms_good, toNum(pr?.classrooms?.classrooms_good, 0)),
    classrooms_moderate_damage: toNum(
      classroomsExisting?.classrooms_moderate_damage,
      toNum(pr?.classrooms?.classrooms_moderate_damage, 0)
    ),
    heavy_damage: toNum(classroomsExisting?.heavy_damage, toNum(pr?.classrooms?.heavy_damage, 0)),
    kurangRkb: toNum(classroomsExisting?.kurangRkb, toNum(pr?.classrooms?.kurangRkb, 0)),
    lahan: classroomsExisting?.lahan ?? pr?.classrooms?.lahan ?? "",
  });

  const prFixed = deepMerge(pr, { ukuran, classrooms });

  return deepMerge(mergedMeta, {
    prasarana: prFixed,
    kelembagaan: kl,
  });
}

/**
 * Normalisasi rombel dari meta sesuai DataInputForm:
 * - SD/SMP: meta.rombel.kelas1, kelas2, ...
 * - PAUD: meta.rombel.kb, tk, sps_tpa, ...
 * - PKBM: meta.rombel.paketA.kelas1, ...
 */
function normalizeRombelMeta(meta) {
  const m = isObj(meta) ? meta : {};
  const src = isObj(m.rombel) ? m.rombel : null;
  if (!src) return {};

  // PKBM: paketA/paketB/paketC (nested object)
  const paketKeys = Object.keys(src).filter((k) => /^paket[a-z0-9]+$/i.test(k) && isObj(src[k]));
  if (paketKeys.length) {
    const out = {};
    let grandTotal = 0;
    for (const pk of paketKeys) {
      const pkt = src[pk];
      const pktOut = {};
      let pktTotal = 0;

      for (const [k, v] of Object.entries(pkt)) {
        const n = toNum(v, NaN);
        if (!Number.isFinite(n)) continue;
        pktOut[k] = n;
        if (/^kelas[0-9]+$/i.test(k)) pktTotal += n;
      }

      pktOut.total = toNum(pktOut.total, pktTotal);
      grandTotal += pktOut.total || 0;
      out[pk] = pktOut;
    }
    out.total = toNum(src.total, grandTotal);
    return out;
  }

  // SD/SMP/PAUD: flat object
  const out = {};
  let total = 0;

  for (const [k, v] of Object.entries(src)) {
    const n = toNum(v, NaN);
    if (!Number.isFinite(n)) continue;

    // simpan angka
    out[k] = n;

    // hitung total otomatis kalau bukan key "total"
    const kl = String(k).toLowerCase();
    if (kl !== "total") total += n;
  }

  out.total = toNum(src.total, total);
  return out;
}

async function fetchSchoolClassesBySchoolId(schoolId) {
  if (!schoolId) return { classes: {}, rows: [] };

  const { data, error } = await supabase
    .from("school_classes")
    .select("grade,count")
    .eq("school_id", schoolId);

  if (error) {
    console.warn("[detailApi] school_classes fetch error:", error);
    return { classes: {}, rows: [] };
  }

  const rows = Array.isArray(data) ? data : [];
  const classes = {};

  for (const r of rows) {
    const g = String(r?.grade ?? "").trim();
    if (!g) continue;
    classes[g] = (classes[g] || 0) + toNum(r?.count, 0);
  }

  return { classes, rows };
}

async function fetchStaffSummaryBySchoolId(schoolId) {
  if (!schoolId) return { roles: {}, rows: [] };

  const { data, error } = await supabase
    .from("staff_summary")
    .select("role,count")
    .eq("school_id", schoolId);

  if (error) {
    console.warn("[detailApi] staff_summary fetch error:", error);
    return { roles: {}, rows: [] };
  }

  const rows = Array.isArray(data) ? data : [];
  const roles = {};
  for (const r of rows) {
    const role = String(r?.role ?? "").trim();
    if (!role) continue;
    roles[role] = (roles[role] || 0) + toNum(r?.count, 0);
  }
  return { roles, rows };
}

function guruFromStaffRoles(roles) {
  const r = isObj(roles) ? roles : {};
  const out = {
    pns: toNum(r.guru_pns, 0),
    pppk: toNum(r.guru_pppk, 0),
    pppkParuhWaktu: toNum(r.guru_pppk_paruh_waktu, 0),
    nonAsnDapodik: toNum(r.guru_non_asn_dapodik, 0),
    nonAsnTidakDapodik: toNum(r.guru_non_asn_tidak_dapodik, 0),
    kekuranganGuru: toNum(r.guru_kekurangan, 0),
    jumlahGuru: toNum(r.guru_total, 0),
  };

  // fallback total jika tidak ada role total
  if (!out.jumlahGuru) {
    out.jumlahGuru =
      out.pns + out.pppk + out.pppkParuhWaktu + out.nonAsnDapodik + out.nonAsnTidakDapodik;
  }

  return out;
}

async function fetchDetailRaw(npsn) {
  const key = String(npsn ?? "").trim();
  if (!key) return null;

  let lastError = null;

  for (const rpc of RPC_CHAIN) {
    const { data, error } = await supabase.rpc(rpc.name, { [rpc.arg]: key });
    if (error) {
      lastError = error;
      continue;
    }
    const row = pickRow(data);
    if (!row) return null;
    return { row, _rpc: rpc.name, _rpc_arg: rpc.arg };
  }

  console.error("[detailApi] All RPC candidates failed:", lastError);
  throw lastError || new Error("Tidak dapat memuat detail sekolah (RPC gagal).");
}

function adaptCommon(payload) {
  const row = payload?.row || {};
  const metaFixed = ensureMetaShape(row);
  const rowFixed = { ...row, meta: metaFixed };

  const jenjang = extractJenjang(rowFixed);
  const { desa, kecamatan } = extractRegion(rowFixed);

  const rombel = normalizeRombelMeta(rowFixed?.meta);

  return {
    ...rowFixed,
    jenjang,
    desa,
    kecamatan,

    // convenience (sesuai inputan)
    siswa: isObj(rowFixed?.meta?.siswa) ? rowFixed.meta.siswa : {},
    siswaAbk: isObj(rowFixed?.meta?.siswaAbk) ? rowFixed.meta.siswaAbk : {},
    rombel,

    _raw: row,
    _rpc: payload?._rpc,
    _rpc_arg: payload?._rpc_arg,
    ...attachCoordinates(rowFixed),
  };
}

async function adaptWithRelations(payload) {
  const common = adaptCommon(payload);

  const schoolId =
    common?.id ||
    common?.school_id ||
    common?._raw?.id ||
    common?._raw?.school_id ||
    null;

  const [{ classes }, { roles }] = await Promise.all([
    fetchSchoolClassesBySchoolId(schoolId),
    fetchStaffSummaryBySchoolId(schoolId),
  ]);

  // guru: meta.guru jika ada, kalau tidak ambil dari staff_summary
  const guruMeta = isObj(common?.meta?.guru) ? common.meta.guru : null;
  const guru = guruMeta ? guruMeta : guruFromStaffRoles(roles);

  return {
    ...common,
    classes: classes || {},
    guru,
    staff_roles: roles || {},
  };
}

/* =======================
   EXPORT UTAMA (per jenjang)
   ======================= */
export async function getSdDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload);
}

export async function getSmpDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload);
}

export async function getPaudDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload);
}

export async function getPkbmDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload);
}

/**
 * Generic: dipakai jika route Anda hanya punya 1 handler detail.
 */
export async function getSchoolDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload);
}
