// src/services/api/detailApi.js
import supabase from "@/services/supabaseClient";

/**
 * RPC yang tersedia:
 * - get_school_detail_by_npsn(input_npsn text)
 * - get_school_full_details_by_npsn(npsn_val text)
 * - rpc_school_detail_by_npsn(p_npsn text)
 * - rpc_school_detail_by_npsn_meta(p_npsn text)
 *
 * CATATAN SKEMA BARU:
 * - schools.kegiatan TIDAK ADA
 * - kegiatan/intervensi pindah ke tabel: school_projects
 *   kolom utama: activity_name, volume, fiscal_year
 */
const RPC_CHAIN = [
  { name: "rpc_school_detail_by_npsn_meta", arg: "p_npsn" },
  { name: "rpc_school_detail_by_npsn", arg: "p_npsn" },
  { name: "get_school_detail_by_npsn", arg: "input_npsn" },
  { name: "get_school_full_details_by_npsn", arg: "npsn_val" },
];

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function pickRow(data) {
  if (data == null) return null;
  if (Array.isArray(data)) return data[0] ?? null;
  return data;
}

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const pickStr = (...vals) => {
  for (const v of vals) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
};

/**
 * Prefer angka non-zero jika ada. Kalau tidak ada, 0 boleh jadi fallback terakhir.
 * Ini PENTING supaya "0 default" dari payload tidak mengalahkan angka real yang muncul belakangan.
 */
const pickNumPreferNonZero = (...vals) => {
  let sawZero = false;
  for (const v of vals) {
    if (v == null) continue;
    if (typeof v === "string" && !v.trim()) continue;
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

function parseJsonLoose(v) {
  if (isObj(v) || Array.isArray(v)) return v;
  if (typeof v !== "string") return v;
  const s = v.trim();
  if (!s) return v;
  if (
    (s.startsWith("{") && s.endsWith("}")) ||
    (s.startsWith("[") && s.endsWith("]"))
  ) {
    try {
      return JSON.parse(s);
    } catch {
      return v;
    }
  }
  return v;
}

/**
 * Ambil list kegiatan dari tabel school_projects (utama).
 * Fallback: v_json_kegiatan_rows (jika tersedia & berisi).
 * Output diseragamkan sebagai array object:
 * { activity_name, volume, fiscal_year }
 */
async function fetchKegiatanListByNpsnOrSchoolId({ npsn, schoolId }) {
  const keyNpsn = String(npsn ?? "").trim();
  const keySchoolId = schoolId || null;

  const normalizeItem = (r) => {
    const activity_name = String(r?.activity_name ?? "").trim();
    if (!activity_name) return null;
    const volume = toNum(
      r?.volume ?? r?.lokal ?? r?.unit ?? r?.jumlah ?? r?.count ?? 0,
      0
    );
    const fiscal_year = r?.fiscal_year != null ? toNum(r.fiscal_year, 0) : null;
    return { activity_name, volume, fiscal_year };
  };

  // 1) school_projects (utama)
  try {
    let q = supabase
      .from("school_projects")
      .select("id, school_id, npsn, activity_name, volume, fiscal_year, created_at")
      .order("fiscal_year", { ascending: false })
      .order("created_at", { ascending: false });

    if (keySchoolId) q = q.eq("school_id", keySchoolId);
    else if (keyNpsn) q = q.eq("npsn", keyNpsn);
    else return [];

    const { data, error } = await q.limit(5000);
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const out = [];
    for (const r of rows) {
      const it = normalizeItem(r);
      if (it) out.push(it);
    }
    if (out.length) return out;
  } catch {
    // ignore → fallback view
  }

  // 2) fallback view: v_json_kegiatan_rows (jika punya akses & berisi)
  try {
    if (!keyNpsn) return [];
    const { data, error } = await supabase
      .from("v_json_kegiatan_rows")
      .select("npsn, activity_name, volume, fiscal_year")
      .eq("npsn", keyNpsn)
      .limit(5000);

    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    const out = [];
    for (const r of rows) {
      const it = normalizeItem(r);
      if (it) out.push(it);
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Unwrap wrapper populer dari RPC:
 * { data: {...} } / { school: {...} } / { detail: {...} } / { payload: {...} }
 *
 * Tambahan penting:
 * - get_school_full_details_by_npsn mengembalikan { base: {...}, rooms:..., staff:... }
 *   -> kita flatten jadi satu row yang valid.
 */
function unwrapRpcRow(input) {
  let cur = parseJsonLoose(input);

  for (let i = 0; i < 6; i++) {
    if (!isObj(cur)) break;

    // wrapper umum
    if (isObj(cur.data)) cur = cur.data;
    else if (isObj(cur.school)) cur = cur.school;
    else if (isObj(cur.detail)) cur = cur.detail;
    else if (isObj(cur.payload)) cur = cur.payload;

    // wrapper full_details: { base, rooms, staff, assets, classes, projects }
    else if (isObj(cur.base)) {
      const base = cur.base;
      const flattened = {
        ...base,
        rooms: cur.rooms ?? null,
        staff: cur.staff ?? null,
        assets: cur.assets ?? null,
        classes: cur.classes ?? null,
        projects: cur.projects ?? null,
        _full_details: true,
      };
      cur = flattened;
    } else break;

    cur = parseJsonLoose(cur);
  }

  return cur;
}

function hasIdentity(row) {
  if (!isObj(row)) return false;
  const id = row.id ?? row.school_id;
  const npsn = row.npsn ?? row.NPSN ?? row.npsn_val ?? row.base?.npsn;
  const name =
    row.name ??
    row.school_name ??
    row.nama_sekolah ??
    row.namaSekolah ??
    row.nama_pkbm ??
    row.pkbm_name ??
    row.base?.name;

  return Boolean(id || String(npsn ?? "").trim() || String(name ?? "").trim());
}

function isValidRow(row, npsnKey) {
  if (!isObj(row)) return false;
  if (!hasIdentity(row)) return false;

  const want = String(npsnKey ?? "").trim();
  const got = String(row?.npsn ?? row?.NPSN ?? row?.npsn_val ?? "").trim();
  if (want && got && got !== want) return false;

  return true;
}

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

function extractJenjang(row, fallback = "") {
  const meta = row?.meta || {};
  const details = row?.details || {};
  const raw =
    row?.jenjang ||
    row?.level ||
    row?.school_type_code ||
    row?.school_types?.code ||
    row?.school_type?.code ||
    details?.jenjang ||
    details?.level ||
    meta?.jenjang ||
    meta?.level ||
    meta?.schoolType ||
    "";
  return normalizeJenjang(raw) || normalizeJenjang(fallback) || "UNKNOWN";
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
    return { coordinates: [lng, lat] };
  }
  return {};
}

/**
 * Hitung L/P dari object siswa yang berbentuk:
 * - { kelas7:{l,p}, kelas8:{l,p}, ... , jumlahSiswa: N }
 * - { kelas1:{l,p}, ... }
 * - { paketA:{...} } (akan di-skip, tapi kalau ada l/p di dalam, tetap bisa keakumulasi)
 */
function sumLPFromSiswa(siswaObj) {
  if (!isObj(siswaObj)) return { l: 0, p: 0, total: 0 };

  let l = 0;
  let p = 0;

  const scan = (obj) => {
    if (!isObj(obj)) return;
    const lHere = toNum(obj.l ?? obj.L ?? obj.male, NaN);
    const pHere = toNum(obj.p ?? obj.P ?? obj.female, NaN);
    if (Number.isFinite(lHere)) l += lHere;
    if (Number.isFinite(pHere)) p += pHere;

    for (const v of Object.values(obj)) {
      if (isObj(v)) scan(v);
    }
  };

  // hanya scan children yang bentuknya kelas*/paket* agar tidak overcount
  const keys = Object.keys(siswaObj);
  const targetKeys = keys.filter((k) => {
    const kk = String(k).toLowerCase();
    return kk.startsWith("kelas") || kk.startsWith("paket") || kk.startsWith("tipe");
  });

  if (targetKeys.length) {
    for (const k of targetKeys) scan(siswaObj[k]);
  } else {
    scan(siswaObj);
  }

  const total = toNum(siswaObj.jumlahSiswa ?? siswaObj.total ?? l + p, l + p);
  return { l, p, total };
}

/**
 * NORMALISASI PENTING:
 * - Pastikan field dasar ada: name, npsn, address, status
 * - Pastikan siswa: student_count, st_male, st_female
 * - Parse kolom JSON yang kadang jadi string: meta, details, facilities, class_condition, prasarana, projects
 * - Pastikan meta.prasarana ada
 * - Kegiatan sekarang: dari projects (school_projects) / meta.kegiatan
 */
function normalizeRpcShape(rowIn, fallbackJenjang = "") {
  const r0 = isObj(rowIn) ? { ...rowIn } : {};
  const r = { ...r0 };

  // parse JSON-ish fields
  r.meta = parseJsonLoose(r.meta);
  r.details = parseJsonLoose(r.details);
  r.facilities = parseJsonLoose(r.facilities);
  r.class_condition = parseJsonLoose(r.class_condition);
  r.prasarana = parseJsonLoose(r.prasarana);
  r.siswa = parseJsonLoose(r.siswa);
  r.rombel = parseJsonLoose(r.rombel);
  r.guru = parseJsonLoose(r.guru);

  // kegiatan lama (jika ada) + projects baru
  r.kegiatan = parseJsonLoose(r.kegiatan);
  r.projects = parseJsonLoose(r.projects);

  // identity fields
  const name = pickStr(
    r.name,
    r.school_name,
    r.nama_sekolah,
    r.namaSekolah,
    r.nama_pkbm,
    r.pkbm_name,
    r.nama,
    r.details?.name,
    r.details?.school_name,
    r.meta?.name,
    r.meta?.school_name
  );
  if (name && !r.name) r.name = name;

  const npsn = pickStr(r.npsn, r.NPSN, r.npsn_val, r.meta?.npsn, r.details?.npsn);
  if (npsn && !r.npsn) r.npsn = npsn;

  const address = pickStr(
    r.address,
    r.alamat,
    r.addr,
    r.school_address,
    r.details?.address,
    r.details?.alamat,
    r.meta?.alamat
  );
  if (address && !r.address) r.address = address;

  const status = pickStr(
    r.status,
    r.status_sekolah,
    r.statusSekolah,
    r.ownership,
    r.kepemilikan,
    r.negeri_swasta,
    r.details?.status,
    r.meta?.status
  );
  if (status && !r.status) r.status = status;

  // ===== students: ambil dari banyak sumber (ROOT & NESTED) =====
  const meta0 = isObj(r.meta) ? r.meta : {};
  const details0 = isObj(r.details) ? r.details : {};
  const detailsMeta = isObj(details0?.meta) ? details0.meta : {};
  const metaMerged = deepMerge(meta0, detailsMeta);

  const siswaRoot = isObj(r.siswa) ? r.siswa : null;
  const siswaMeta = isObj(metaMerged?.siswa) ? metaMerged.siswa : null;

  const lpFromSiswaRoot = siswaRoot ? sumLPFromSiswa(siswaRoot) : { l: 0, p: 0, total: 0 };
  const lpFromSiswaMeta = siswaMeta ? sumLPFromSiswa(siswaMeta) : { l: 0, p: 0, total: 0 };

  // male/female
  const stMale = pickNumPreferNonZero(
    r.st_male,
    r.students_male,
    r.student_male,
    r.jumlah_siswa_laki,
    r.jml_siswa_l,
    r.siswa_l,
    r.pd_l,
    r.peserta_didik_l,
    lpFromSiswaRoot.l,
    lpFromSiswaMeta.l
  );

  const stFemale = pickNumPreferNonZero(
    r.st_female,
    r.students_female,
    r.student_female,
    r.jumlah_siswa_perempuan,
    r.jml_siswa_p,
    r.siswa_p,
    r.pd_p,
    r.peserta_didik_p,
    lpFromSiswaRoot.p,
    lpFromSiswaMeta.p
  );

  // total
  const stTotal = pickNumPreferNonZero(
    r.student_count,
    r.students_total,
    r.total_students,
    r.total_siswa,
    r.jumlah_siswa,
    r.jml_siswa,
    r.pd_total,
    r.jumlah_peserta_didik,
    r.total_peserta_didik,
    r.peserta_didik_total,
    siswaRoot?.jumlahSiswa,
    siswaMeta?.jumlahSiswa,
    lpFromSiswaRoot.total,
    lpFromSiswaMeta.total,
    stMale + stFemale
  );

  r.st_male = toNum(stMale, 0);
  r.st_female = toNum(stFemale, 0);
  r.student_count = toNum(stTotal, 0);

  // ===== prasarana =====
  const prFromMeta = isObj(metaMerged?.prasarana) ? metaMerged.prasarana : {};
  const prFromRoot = isObj(r.prasarana) ? r.prasarana : {};
  const facilities0 = isObj(r.facilities) ? r.facilities : {};
  const cc0 = isObj(r.class_condition) ? r.class_condition : {};

  // gabung: meta.prasarana -> root.prasarana -> facilities -> class_condition(classrooms)
  let pr = deepMerge(prFromMeta, prFromRoot);
  pr = deepMerge(pr, facilities0);

  if (Object.keys(cc0).length) {
    const cls0 = isObj(pr?.classrooms) ? pr.classrooms : {};
    const clsPatch = {
      total_room: toNum(cc0.total_room ?? cc0.total_all ?? cc0.total, toNum(cls0.total_room, 0)),
      total_mh: toNum(
        cc0.total_mh ??
          (toNum(cc0.classrooms_moderate_damage, 0) + toNum(cc0.classrooms_heavy_damage, 0)),
        toNum(cls0.total_mh, 0)
      ),
      classrooms_good: toNum(cc0.classrooms_good ?? cc0.good, toNum(cls0.classrooms_good, 0)),
      classrooms_moderate_damage: toNum(
        cc0.classrooms_moderate_damage ?? cc0.moderate_damage,
        toNum(cls0.classrooms_moderate_damage, 0)
      ),
      classrooms_heavy_damage: toNum(
        cc0.classrooms_heavy_damage ?? cc0.heavy_damage,
        toNum(cls0.classrooms_heavy_damage, 0)
      ),
      lacking_rkb: toNum(
        cc0.lacking_rkb ?? cc0.kurangRkb ?? cc0.kurang_rkb,
        toNum(cls0.lacking_rkb, 0)
      ),
    };
    pr = deepMerge(pr, { classrooms: deepMerge(cls0, clsPatch) });
  }

  // ===== kegiatan: (SKEMA BARU) kalau meta.kegiatan kosong, ambil dari projects (school_projects)
  const projectsFromCol = Array.isArray(r.projects)
    ? r.projects
    : Array.isArray(r.school_projects)
    ? r.school_projects
    : null;

  // tetap dukung field lama bila ada (agar kompatibel)
  const kegiatanFromCol = Array.isArray(r.kegiatan) ? r.kegiatan : projectsFromCol;

  const kegiatanFromMeta =
    Array.isArray(metaMerged?.kegiatan) ? metaMerged.kegiatan :
    Array.isArray(metaMerged?.kegiatan?.items) ? metaMerged.kegiatan.items :
    Array.isArray(metaMerged?.projects) ? metaMerged.projects :
    null;

  let metaFinal = metaMerged;
  if (!kegiatanFromMeta && kegiatanFromCol) {
    metaFinal = deepMerge(metaFinal, { kegiatan: kegiatanFromCol });
  }

  // ===== siswa shape: pastikan ada minimal struktur =====
  if (!isObj(metaFinal?.siswa)) {
    const l = toNum(r.st_male, 0);
    const p = toNum(r.st_female, 0);
    const total = toNum(r.student_count, l + p);
    metaFinal = deepMerge(metaFinal, {
      siswa: { total: { l, p, total }, jumlahSiswa: total },
    });
  }

  // set prasarana ke meta
  metaFinal = deepMerge(metaFinal, { prasarana: pr });

  // set meta final
  r.meta = metaFinal;

  // jenjang
  r.jenjang = extractJenjang(r, fallbackJenjang);

  // TOP-LEVEL ALIAS (paling penting untuk komponen)
  r.prasarana = pr;
  r.siswa = isObj(r.meta?.siswa) ? r.meta.siswa : r.siswa;

  return r;
}

function ensureMetaShape(row) {
  const meta = isObj(row?.meta) ? row.meta : {};
  const details = isObj(row?.details) ? row.details : {};
  const mergedMeta = deepMerge(meta, isObj(details?.meta) ? details.meta : {});

  const pr = isObj(mergedMeta.prasarana) ? mergedMeta.prasarana : {};
  const kl = isObj(mergedMeta.kelembagaan) ? mergedMeta.kelembagaan : {};

  // ukuran
  const ukuranExisting = isObj(pr.ukuran) ? pr.ukuran : {};
  const ukuran = deepMerge(ukuranExisting, {
    tanah: toNum(ukuranExisting?.tanah, toNum(pr?.ukuran?.tanah, 0)),
    bangunan: toNum(ukuranExisting?.bangunan, toNum(pr?.ukuran?.bangunan, 0)),
    halaman: toNum(ukuranExisting?.halaman, toNum(pr?.ukuran?.halaman, 0)),
  });

  // classrooms
  const classroomsExisting = isObj(pr.classrooms) ? pr.classrooms : {};
  const classrooms = deepMerge(classroomsExisting, {
    total_room: toNum(classroomsExisting?.total_room, toNum(pr?.classrooms?.total_room, 0)),
    total_mh: toNum(classroomsExisting?.total_mh, toNum(pr?.classrooms?.total_mh, 0)),
    classrooms_good: toNum(
      classroomsExisting?.classrooms_good,
      toNum(pr?.classrooms?.classrooms_good, 0)
    ),
    classrooms_moderate_damage: toNum(
      classroomsExisting?.classrooms_moderate_damage,
      toNum(pr?.classrooms?.classrooms_moderate_damage, 0)
    ),
    classrooms_heavy_damage: toNum(
      classroomsExisting?.classrooms_heavy_damage,
      toNum(pr?.classrooms?.classrooms_heavy_damage, 0)
    ),
    heavy_damage: toNum(
      classroomsExisting?.heavy_damage,
      toNum(pr?.classrooms?.heavy_damage ?? pr?.classrooms?.classrooms_heavy_damage, 0)
    ),
    lacking_rkb: toNum(
      classroomsExisting?.lacking_rkb,
      toNum(
        pr?.classrooms?.lacking_rkb ?? pr?.classrooms?.kurangRkb ?? pr?.classrooms?.kurang_rkb,
        0
      )
    ),
    kurangRkb: toNum(
      classroomsExisting?.kurangRkb,
      toNum(pr?.classrooms?.kurangRkb ?? pr?.classrooms?.lacking_rkb, 0)
    ),
  });

  const prFixed = deepMerge(pr, { ukuran, classrooms });

  return deepMerge(mergedMeta, {
    prasarana: prFixed,
    kelembagaan: kl,
  });
}

function normalizeRombelMeta(meta) {
  const m = isObj(meta) ? meta : {};
  const src = isObj(m.rombel) ? m.rombel : null;
  if (!src) return {};

  const paketKeys = Object.keys(src).filter(
    (k) => /^paket[a-z0-9]+$/i.test(k) && isObj(src[k])
  );
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

  const out = {};
  let total = 0;

  for (const [k, v] of Object.entries(src)) {
    const n = toNum(v, NaN);
    if (!Number.isFinite(n)) continue;
    out[k] = n;
    if (String(k).toLowerCase() !== "total") total += n;
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

  if (!out.jumlahGuru) {
    out.jumlahGuru =
      out.pns +
      out.pppk +
      out.pppkParuhWaktu +
      out.nonAsnDapodik +
      out.nonAsnTidakDapodik;
  }
  return out;
}

/**
 * (A) Ambil dari tabel schools dulu (paling stabil).
 * SKEMA BARU: hapus kolom yang tidak ada, gunakan relasi locations + school_types.
 * Kegiatan diambil dari school_projects, lalu disuntikkan ke meta.kegiatan (jika belum ada).
 */
async function fetchDetailFromSchoolsTable(npsn) {
  const key = String(npsn ?? "").trim();
  if (!key) return null;

  const { data, error } = await supabase
    .from("schools")
    .select(
      `
      id, name, npsn, address, status,
      student_count, st_male, st_female,
      lat, lng,
      village_name,
      meta, details, facilities, class_condition,
      school_type_id, location_id,
      school_types:school_type_id ( code, name ),
      locations:location_id ( subdistrict, village, district, province, extra )
    `
    )
    .eq("npsn", key)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // ambil kegiatan dari school_projects (utama), fallback view jika perlu
  const projects = await fetchKegiatanListByNpsnOrSchoolId({
    npsn: data?.npsn,
    schoolId: data?.id,
  });

  // suntikkan ke meta.kegiatan kalau meta belum punya kegiatan yang terisi
  const meta0 = isObj(data?.meta) ? data.meta : {};
  const details0 = isObj(data?.details) ? data.details : {};
  const detailsMeta = isObj(details0?.meta) ? details0.meta : {};
  const metaMerged = deepMerge(meta0, detailsMeta);

  const metaHasKegiatan =
    Array.isArray(metaMerged?.kegiatan) && metaMerged.kegiatan.length > 0;

  const metaFinal =
    !metaHasKegiatan && Array.isArray(projects) && projects.length
      ? deepMerge(metaMerged, { kegiatan: projects })
      : metaMerged;

  const row = {
    ...data,
    meta: metaFinal,
    projects, // tetap expose juga
  };

  return { row, _rpc: "schools", _rpc_arg: "npsn", _raw: row };
}

async function fetchDetailRaw(npsn) {
  const key = String(npsn ?? "").trim();
  if (!key) return null;

  // 1) tabel schools dulu
  const fromTable = await fetchDetailFromSchoolsTable(key);
  if (fromTable?.row) return fromTable;

  // 2) fallback RPC chain (jika masih ada)
  let lastError = null;

  for (const rpc of RPC_CHAIN) {
    const { data, error } = await supabase.rpc(rpc.name, { [rpc.arg]: key });

    if (error) {
      lastError = error;
      continue;
    }

    const picked = pickRow(data);
    if (!picked) continue;

    const row = unwrapRpcRow(picked);
    if (!isValidRow(row, key)) continue;

    return { row, _rpc: rpc.name, _rpc_arg: rpc.arg, _raw: picked };
  }

  if (lastError) {
    console.error("[detailApi] All RPC candidates failed:", lastError);
    throw lastError;
  }

  return null;
}

function adaptCommon(payload, fallbackJenjang = "") {
  const rawRow = payload?.row || {};
  const rowNorm = normalizeRpcShape(rawRow, fallbackJenjang);

  const metaFixed = ensureMetaShape(rowNorm);
  const rowFixed = { ...rowNorm, meta: metaFixed };

  const jenjang = extractJenjang(rowFixed, fallbackJenjang);
  const { desa, kecamatan } = extractRegion(rowFixed);
  const rombel = normalizeRombelMeta(rowFixed?.meta);

  // pastikan top-level alias tetap konsisten
  const prasarana = isObj(rowFixed?.prasarana)
    ? rowFixed.prasarana
    : isObj(rowFixed?.meta?.prasarana)
    ? rowFixed.meta.prasarana
    : {};

  return {
    ...rowFixed,
    jenjang,
    desa,
    kecamatan,

    siswa: isObj(rowFixed?.siswa)
      ? rowFixed.siswa
      : isObj(rowFixed?.meta?.siswa)
      ? rowFixed.meta.siswa
      : {},
    siswaAbk: isObj(rowFixed?.meta?.siswaAbk) ? rowFixed.meta.siswaAbk : {},
    rombel,
    prasarana,

    _raw: payload?._raw,
    _rpc: payload?._rpc,
    _rpc_arg: payload?._rpc_arg,
    ...attachCoordinates(rowFixed),
  };
}

async function adaptWithRelations(payload, fallbackJenjang = "") {
  const common = adaptCommon(payload, fallbackJenjang);

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

  const guruMeta =
    isObj(common?.guru) ? common.guru :
    isObj(common?.meta?.guru) ? common.meta.guru :
    null;

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
  return adaptWithRelations(payload, "SD");
}

export async function getSmpDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload, "SMP");
}

export async function getPaudDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload, "PAUD");
}

export async function getPkbmDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload, "PKBM");
}

export async function getSchoolDetailByNpsn(npsn) {
  const payload = await fetchDetailRaw(npsn);
  if (!payload) return null;
  return adaptWithRelations(payload, "UNKNOWN");
}
