// src/services/api/detailApi.js
// SUPABASE ONLY + fleksibel baca tabel untuk PAUD/PKBM/SD/SMP
import supabase from '../supabaseClient';

// ---------- Helpers ----------
const int = (v, d = 0) => {
  if (v === null || v === undefined) return d;
  const n = Number(v);
  return Number.isNaN(n) ? d : n;
};
const one = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);
const truthy = (v) => v !== null && v !== undefined && v !== '';

// alias pick number dengan fallback banyak nama kolom
const pickNum = (obj, keys = [], d = 0) => {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k) && truthy(obj[k])) return int(obj[k], d);
  }
  return d;
};

const EMPTY_BLOCK = { good:0, moderate_damage:0, heavy_damage:0, total_mh:0, total_all:0 };
const emptyLabPack = () => ({
  laboratory_comp:   { ...EMPTY_BLOCK },
  laboratory_langua: { ...EMPTY_BLOCK },
  laboratory_ipa:    { ...EMPTY_BLOCK },
  laboratory_fisika: { ...EMPTY_BLOCK },
  laboratory_biologi:{ ...EMPTY_BLOCK },
});

const EMPTY_TOILET_GENDER = { good:0, moderate_damage:0, heavy_damage:0, total_mh:0, total_all:0 };
const emptyToilets = () => ({
  teachers_toilet: { male: { ...EMPTY_TOILET_GENDER }, female: { ...EMPTY_TOILET_GENDER }, _overall: { good:0, moderate_damage:0, heavy_damage:0, total:0 } },
  students_toilet: { male: { ...EMPTY_TOILET_GENDER }, female: { ...EMPTY_TOILET_GENDER }, _overall: { good:0, moderate_damage:0, heavy_damage:0, total:0 } },
});

const mapLabKey = (lab_type) => {
  if (!lab_type) return null;
  const s = String(lab_type).toLowerCase();
  if (s.includes('komputer')) return 'laboratory_comp';
  if (s.includes('bahasa'))   return 'laboratory_langua';
  if (s.includes('ipa'))      return 'laboratory_ipa';
  if (s.includes('fisika'))   return 'laboratory_fisika';
  if (s.includes('biologi'))  return 'laboratory_biologi';
  return null;
};

const mapRoomKey = (room_type) => {
  if (!room_type) return null;
  const s = String(room_type).toLowerCase();
  if (s.includes('kepala')) return 'kepsek_room';
  if (s.includes('guru'))   return 'teacher_room';
  if (s.includes('tata') || s.includes('administrasi') || s.includes('administration'))
    return 'administration_room';
  return null;
};

const mapOwnershipTitle = (key) => String(key || '')
  .replace(/_/g, ' ')
  .replace(/^\w/, (c) => c.toUpperCase());

// ---------- Normalizer blok toilet (buat _overall + isi male/female.total_all) ----------
const normalizeToilets = (rows) => {
  const toilets = emptyToilets();
  let tGood = 0, tMod = 0, tHeavy = 0, tTotalSeen = 0;

  (rows || []).forEach((r) => {
    const typ = String(r.type || '').toLowerCase();
    const good = int(r.good, 0);
    const mod  = int(r.moderate_damage, 0);
    const heavy= int(r.heavy_damage, 0);
    const total = r.total != null ? int(r.total, 0) : (good + mod + heavy);

    tGood += good; tMod += mod; tHeavy += heavy; tTotalSeen += total;

    const key = typ.includes('guru') ? 'teachers_toilet' : typ.includes('siswa') ? 'students_toilet' : null;
    if (key) {
      toilets[key] = {
        male:   { ...EMPTY_TOILET_GENDER, total_all: int(r.male, 0) },
        female: { ...EMPTY_TOILET_GENDER, total_all: int(r.female, 0) },
        _overall: { good, moderate_damage: mod, heavy_damage: heavy, total },
      };
    }
  });

  const toilets_overall = { good: tGood, moderate_damage: tMod, heavy_damage: tHeavy, total: tTotalSeen };
  return { toilets, toilets_overall };
};

// ---------- Normalizer furniture/komputer (alias berbagai nama kolom) ----------
const normalizeFurnitureComputer = (row) => {
  const r = row || {};
  // aliasing kolom: meja/tables, kursi/chairs, papan/boards/whiteboards, komputer/computer
  const tables   = pickNum(r, ['tables','meja','jumlah_meja','tbl','table'], 0);
  const chairs   = pickNum(r, ['chairs','kursi','jumlah_kursi','chr','chair'], 0);
  const boards   = pickNum(r, ['boards','papan','whiteboards','papan_tulis','board'], 0);
  const computer = pickNum(r, ['computer','komputer','jumlah_komputer','pc','compute'], 0);

  // possible “kekurangan” fields
  const n_tables = pickNum(r, ['n_tables','tables_need','kekurangan_meja'], 0);
  const n_chairs = pickNum(r, ['n_chairs','chairs_need','kekurangan_kursi'], 0);

  // breakdown opsional (jika ada kolom *_good/_moderate/_heavy)
  const tables_good   = pickNum(r, ['tables_good','good_tables'], tables);
  const tables_mod    = pickNum(r, ['tables_moderate','moderate_tables'], 0);
  const tables_heavy  = pickNum(r, ['tables_heavy','heavy_tables'], 0);

  const chairs_good   = pickNum(r, ['chairs_good','good_chairs'], chairs);
  const chairs_mod    = pickNum(r, ['chairs_moderate','moderate_chairs'], 0);
  const chairs_heavy  = pickNum(r, ['chairs_heavy','heavy_chairs'], 0);

  return {
    tables, chairs, boards, computer,
    n_tables, n_chairs,
    tables_good, tables_moderate: tables_mod, tables_heavy,
    chairs_good, chairs_moderate: chairs_mod, chairs_heavy,
  };
};

// ---------- Normalizer building_status (tanah/gedung — “Ya” flags + land_available) ----------
const normalizeBuildingStatus = (row) => {
  const b = row || {};
  const tanah = b.tanah || b.land || {};
  const gedung = b.gedung || b.building || {};
  const tanahOut = { ...tanah };
  const gedungOut = { ...gedung };

  // pastikan ada land_available (luas tanah)
  if (!('land_available' in tanahOut)) {
    tanahOut.land_available = pickNum(b, ['land_area', 'luas_tanah'], 0);
  }
  return { tanah: tanahOut, gedung: gedungOut };
};

// =================== SMP ===================
export async function getSmpDetailByNpsn(npsn) {
  const { data: school } = await supabase
    .from('schools')
    .select('id,name,npsn,address,village,kecamatan,student_count,st_male,st_female,lat,lng,latitude,longitude')
    .eq('npsn', npsn)
    .maybeSingle();
  if (!school) return null;

  const schoolId = school.id;
  const lat = school.lat != null ? Number(school.lat) : (school.latitude != null ? Number(school.latitude) : null);
  const lng = school.lng != null ? Number(school.lng) : (school.longitude != null ? Number(school.longitude) : null);

  const base = {
    id: schoolId,
    name: school.name || '-',
    npsn: school.npsn || '-',
    address: school.address || '-',
    village: school.village || '-',
    kecamatan: school.kecamatan || '-',
    student_count: int(school.student_count, 0),
    coordinates: (typeof lat === 'number' && typeof lng === 'number') ? [lat, lng] : null,
  };

  const [
    { data: ccRows },
    { data: libRows },
    { data: labRows },
    { data: roomRows },
    { data: toiletRows },
    { data: fcompRows },
    { data: officRows },
    { data: kegRows },
    { data: bstatRows },
  ] = await Promise.all([
    supabase.from('class_conditions').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('library').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('laboratory').select('*').eq('school_id', schoolId),
    supabase.from('teacher_room').select('*').eq('school_id', schoolId),
    supabase.from('toilets').select('*').eq('school_id', schoolId),
    supabase.from('furniture_computer').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('official_residences').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('kegiatan').select('kegiatan,lokal').eq('school_id', schoolId),
    supabase.from('building_status').select('*').eq('school_id', schoolId).limit(1),
  ]);

  // class_condition
  const cc = one(ccRows) || {};
  const class_condition = {
    classrooms_good: int(cc.classrooms_good, 0),
    classrooms_moderate_damage: int(cc.classrooms_moderate_damage, 0),
    classrooms_heavy_damage: int(cc.classrooms_heavy_damage, 0),
    total_room: int(cc.total_room, 0),
    lacking_rkb: int(cc.lacking_rkb, 0),
    total_mh: int(cc.classrooms_moderate_damage, 0) + int(cc.classrooms_heavy_damage, 0),
  };

  // library
  const lib = one(libRows) || {};
  const library = {
    good: int(lib.good, 0),
    moderate_damage: int(lib.moderate_damage, 0),
    heavy_damage: int(lib.heavy_damage, 0),
    total_mh: int(lib.moderate_damage, 0) + int(lib.heavy_damage, 0),
    total_all: lib.total != null
      ? int(lib.total, 0)
      : int(lib.good, 0) + int(lib.moderate_damage, 0) + int(lib.heavy_damage, 0),
  };

  // labs
  const labs = emptyLabPack();
  (labRows || []).forEach((r) => {
    const k = mapLabKey(r.lab_type);
    if (!k) return;
    const good = int(r.good, 0);
    const mod  = int(r.moderate_damage, 0);
    const heavy= int(r.heavy_damage, 0);
    labs[k] = {
      good,
      moderate_damage: mod,
      heavy_damage: heavy,
      total_mh: r.total_mh != null ? int(r.total_mh) : (mod + heavy),
      total_all: r.total_all != null ? int(r.total_all) : (good + mod + heavy),
    };
  });

  // rooms
  const rooms = {
    kepsek_room:         { ...EMPTY_BLOCK },
    teacher_room:        { ...EMPTY_BLOCK },
    administration_room: { ...EMPTY_BLOCK },
  };
  (roomRows || []).forEach((r) => {
    const k = mapRoomKey(r.room_type);
    if (!k) return;
    const good = int(r.good, 0);
    const mod  = int(r.moderate_damage, 0);
    const heavy= int(r.heavy_damage, 0);
    rooms[k] = {
      good,
      moderate_damage: mod,
      heavy_damage: heavy,
      total_mh: r.total_mh != null ? int(r.total_mh) : (mod + heavy),
      total_all: r.total_all != null ? int(r.total_all) : (good + mod + heavy),
    };
  });

  // toilets (detail + overall)
  const { toilets, toilets_overall } = normalizeToilets(toiletRows);

  // furniture_computer (dengan alias)
  const fcomp = normalizeFurnitureComputer(one(fcompRows) || {});

  // residences
  const offic = one(officRows) || {};
  const official_residences = {
    total: int(offic.total, 0),
    good: int(offic.good, 0),
    moderate_damage: int(offic.moderate_damage, 0),
    heavy_damage: int(offic.heavy_damage, 0),
  };

  // kegiatan
  const pembangunanRKB = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('pembangunan'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);
  const rehabRKB = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('rehab'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);

  // facilities/building_status
  const bstat = normalizeBuildingStatus(one(bstatRows) || {});
  const facilities = {
    land_area: pickNum(one(bstatRows) || {}, ['land_area','luas_tanah'], null),
    building_area: pickNum(one(bstatRows) || {}, ['building_area','luas_bangunan'], null),
    yard_area: pickNum(one(bstatRows) || {}, ['yard_area','luas_halaman'], null),
  };

  return {
    ...base,
    class_condition,
    library,
    ...labs,
    ...rooms,
    ...toilets,
    toilets_overall,          // keseluruhan
    furniture_computer: fcomp,
    official_residences,
    pembangunanRKB,
    rehabRKB,
    facilities,
    building_status: bstat,
  };
}

// =================== SD ===================
export async function getSdDetailByNpsn(npsn) {
  const { data: school } = await supabase
    .from('schools')
    .select('id,name,npsn,address,village,kecamatan,student_count,lat,lng,latitude,longitude')
    .eq('npsn', npsn)
    .maybeSingle();
  if (!school) return null;

  const schoolId = school.id;
  const lat = school.lat != null ? Number(school.lat) : (school.latitude != null ? Number(school.latitude) : null);
  const lng = school.lng != null ? Number(school.lng) : (school.longitude != null ? Number(school.longitude) : null);

  const base = {
    id: schoolId,
    name: school.name || '-',
    npsn: school.npsn || '-',
    address: school.address || '-',
    village: school.village || '-',
    kecamatan: school.kecamatan || '-',
    student_count: int(school.student_count, 0),
    coordinates: (typeof lat === 'number' && typeof lng === 'number') ? [lat, lng] : null,
  };

  const [
    { data: ccRows },
    { data: libRows },
    { data: roomRows },
    { data: toiletRows },
    { data: fcompRows },
    { data: officRows },
    { data: kegRows },
    { data: bstatRows },
    { data: classesRows },
    { data: rombelRows },
    { data: uksRows },
  ] = await Promise.all([
    supabase.from('class_conditions').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('library').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('teacher_room').select('*').eq('school_id', schoolId),
    supabase.from('toilets').select('*').eq('school_id', schoolId),
    supabase.from('furniture_computer').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('official_residences').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('kegiatan').select('kegiatan,lokal').eq('school_id', schoolId),
    supabase.from('building_status').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('classes_sd').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('rombel').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('uks').select('*').eq('school_id', schoolId).limit(1),
  ]);

  // class_condition
  const cc = one(ccRows) || {};
  const class_condition = {
    classrooms_good: int(cc.classrooms_good, 0),
    classrooms_moderate_damage: int(cc.classrooms_moderate_damage, 0),
    classrooms_heavy_damage: int(cc.classrooms_heavy_damage, 0),
    total_room: int(cc.total_room, 0),
    lacking_rkb: int(cc.lacking_rkb, 0),
    total_mh: int(cc.classrooms_moderate_damage, 0) + int(cc.classrooms_heavy_damage, 0),
  };

  // library
  const lib = one(libRows) || {};
  const library = {
    good: int(lib.good, 0),
    moderate_damage: int(lib.moderate_damage, 0),
    heavy_damage: int(lib.heavy_damage, 0),
    total_mh: int(lib.moderate_damage, 0) + int(lib.heavy_damage, 0),
    total_all: lib.total != null
      ? int(lib.total, 0)
      : int(lib.good, 0) + int(lib.moderate_damage, 0) + int(lib.heavy_damage, 0),
  };

  // rooms (kepsek/ruang guru/tata usaha)
  const rooms = {
    kepsek_room:         { ...EMPTY_BLOCK },
    teacher_room:        { ...EMPTY_BLOCK },
    administration_room: { ...EMPTY_BLOCK },
  };
  (roomRows || []).forEach((r) => {
    const k = mapRoomKey(r.room_type);
    if (!k) return;
    const good = int(r.good, 0);
    const mod  = int(r.moderate_damage, 0);
    const heavy= int(r.heavy_damage, 0);
    rooms[k] = {
      good,
      moderate_damage: mod,
      heavy_damage: heavy,
      total_mh: r.total_mh != null ? int(r.total_mh) : (mod + heavy),
      total_all: r.total_all != null ? int(r.total_all) : (good + mod + heavy),
    };
  });

  // toilets (detail + overall)
  const { toilets, toilets_overall } = normalizeToilets(toiletRows);

  // furniture_computer (alias supaya tidak 0)
  const fcomp = normalizeFurnitureComputer(one(fcompRows) || {});

  // residences
  const offic = one(officRows) || {};
  const official_residences = {
    total: int(offic.total, 0),
    good: int(offic.good, 0),
    moderate_damage: int(offic.moderate_damage, 0),
    heavy_damage: int(offic.heavy_damage, 0),
  };

  // kegiatan
  const pembangunanRKB = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('pembangunan'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);
  const rehabRKB = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('rehab'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);

  // facilities
  const bstatRaw = one(bstatRows) || {};
  const bstat = normalizeBuildingStatus(bstatRaw);
  const facilities = {
    land_area: pickNum(bstatRaw, ['land_area','luas_tanah'], null),
    building_area: pickNum(bstatRaw, ['building_area','luas_bangunan'], null),
    yard_area: pickNum(bstatRaw, ['yard_area','luas_halaman'], null),
  };

  // classes (L/P)
  const cls = one(classesRows) || {};
  const classes = {
    '1_L': int(cls.g1_male, 0), '1_P': int(cls.g1_female, 0),
    '2_L': int(cls.g2_male, 0), '2_P': int(cls.g2_female, 0),
    '3_L': int(cls.g3_male, 0), '3_P': int(cls.g3_female, 0),
    '4_L': int(cls.g4_male, 0), '4_P': int(cls.g4_female, 0),
    '5_L': int(cls.g5_male, 0), '5_P': int(cls.g5_female, 0),
    '6_L': int(cls.g6_male, 0), '6_P': int(cls.g6_female, 0),
  };

  // rombel
  const rb = one(rombelRows) || {};
  const rombel = {
    '1': int(rb.r1, 0), '2': int(rb.r2, 0), '3': int(rb.r3, 0),
    '4': int(rb.r4, 0), '5': int(rb.r5, 0), '6': int(rb.r6, 0),
    total: int(rb.total, 0),
  };

  // uks
  const u = one(uksRows) || {};
  const uks_room = {
    total: int(u.total_all ?? u.total, 0),
    good: int(u.good, 0),
    moderate_damage: int(u.moderate_damage, 0),
    heavy_damage: int(u.heavy_damage, 0),
  };

  return {
    ...base,
    class_condition,
    library,
    ...rooms,
    ...toilets,
    toilets_overall,         // keseluruhan
    furniture_computer: fcomp,
    official_residences,
    pembangunanRKB,
    rehabRKB,
    facilities,
    classes,
    rombel,
    uks_room,
    building_status: bstat,
  };
}

// =================== PAUD ===================
export async function getPaudDetailByNpsn(npsn) {
  const { data: school } = await supabase
    .from('schools')
    .select('id,name,npsn,address,village,kecamatan,student_count,st_male,st_female,lat,lng,latitude,longitude')
    .eq('npsn', npsn)
    .maybeSingle();
  if (!school) return null;

  const schoolId = school.id;
  const lat = school.lat != null ? Number(school.lat) : (school.latitude != null ? Number(school.latitude) : null);
  const lng = school.lng != null ? Number(school.lng) : (school.longitude != null ? Number(school.longitude) : null);

  const base = {
    id: schoolId,
    name: school.name || '-',
    npsn: school.npsn || '-',
    address: school.address || '-',
    village: school.village || '-',
    kecamatan: school.kecamatan || '-',
    student_count: int(school.student_count, (int(school.st_male,0)+int(school.st_female,0))),
    coordinates: (typeof lat === 'number' && typeof lng === 'number') ? [lat, lng] : null,
  };

  const [
    { data: ccRows },
    { data: libRows },
    { data: toiletRows },
    { data: fcompRows },
    { data: teacherRows },
    { data: rgksRows },
    { data: officRows },
    { data: kegRows },
    { data: bstatRows },
    { data: apeRows },
    { data: uksRows },
    { data: playgroundRows },
    { data: rombelRows },
  ] = await Promise.all([
    supabase.from('class_conditions').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('library').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('toilets').select('*').eq('school_id', schoolId),
    supabase.from('furniture_computer').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('teacher').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('rgks').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('official_residences').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('kegiatan').select('kegiatan,lokal').eq('school_id', schoolId),
    supabase.from('building_status').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('ape').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('uks').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('playground_area').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('rombel').select('*').eq('school_id', schoolId).limit(1),
  ]);

  // class_condition → PAUD hanya butuh: heavy, moderate, lacking_rkb
  const cc = one(ccRows) || {};
  const class_condition = {
    heavy_damage: int(cc.classrooms_heavy_damage ?? cc.heavy_damage, 0),
    moderate_damage: int(cc.classrooms_moderate_damage ?? cc.moderate_damage, 0),
    lacking_rkb: int(cc.lacking_rkb, 0),
  };

  // student_data (komponen PAUD butuh nested)
  const student_data = {
    male_students: int(school.st_male, 0),
    female_students: int(school.st_female, 0),
  };

  // library (jika ada)
  const lib = one(libRows) || {};
  const library = {
    good: int(lib.good, 0),
    moderate_damage: int(lib.moderate_damage, 0),
    heavy_damage: int(lib.heavy_damage, 0),
    total_mh: int(lib.moderate_damage, 0) + int(lib.heavy_damage, 0),
    total_all: lib.total != null
      ? int(lib.total, 0)
      : int(lib.good, 0) + int(lib.moderate_damage, 0) + int(lib.heavy_damage, 0),
  };

  // toilets
  const { toilets, toilets_overall } = normalizeToilets(toiletRows);

  // furniture_computer (alias lengkap)
  const fcomp = normalizeFurnitureComputer(one(fcompRows) || {});

  // teacher (jumlah guru, kekurangan, tendik) — opsional
  const t = one(teacherRows) || {};
  const teacher = {
    teachers: int(t.teachers ?? t.jumlah_guru, 0),
    n_teachers: int(t.n_teachers ?? t.kekurangan_guru, 0),
    tendik: int(t.tendik ?? t.tenaga_kependidikan, 0),
  };

  // RGKS (opsional)
  const rg = one(rgksRows) || {};
  const rgks = {
    n_available: truthy(rg.n_available) ? rg.n_available : (truthy(rg.available) ? rg.available : 'Tidak Ada'),
    good: int(rg.good, 0),
    moderate_damage: int(rg.moderate_damage, 0),
    heavy_damage: int(rg.heavy_damage, 0),
  };

  // residences
  const offic = one(officRows) || {};
  const official_residences = {
    total: int(offic.total, 0),
    good: int(offic.good, 0),
    moderate_damage: int(offic.moderate_damage, 0),
    heavy_damage: int(offic.heavy_damage, 0),
  };

  // kegiatan
  const pembangunanRKB = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('pembangunan'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);
  const rehabRuangKelas = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('rehab'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);

  // building_status
  const bstatRaw = one(bstatRows) || {};
  const bstat = normalizeBuildingStatus(bstatRaw);

  // APE
  const ape = one(apeRows) || {};
  const apeOut = {
    luar:  { available: ape.luar_available ?? ape.luar ?? '-',  condition: ape.luar_condition ?? '-' },
    dalam: { available: ape.dalam_available ?? ape.dalam ?? '-', condition: ape.dalam_condition ?? '-' },
  };

  // UKS
  const u = one(uksRows) || {};
  const uks = { n_available: truthy(u.n_available) ? u.n_available : (truthy(u.available) ? u.available : 'Tidak Ada') };

  // Playground area
  const play = one(playgroundRows) || {};
  const playground_area = { n_available: truthy(play.n_available) ? play.n_available : (truthy(play.available) ? play.available : '-') };

  // Rombel
  const rb = one(rombelRows) || {};
  const rombel = { kb: int(rb.kb ?? rb.total ?? 0, 0) };

  return {
    ...base,
    class_condition,
    student_data,
    library,
    toilets_overall,
    ...toilets,
    furniture_computer: fcomp,
    teacher,
    rgks,
    official_residences,
    pembangunanRKB,
    rehabRuangKelas,
    building_status: bstat,
    ape: apeOut,
    uks,
    playground_area,
    rombel,
  };
}

// =================== PKBM ===================
export async function getPkbmDetailByNpsn(npsn) {
  const { data: school } = await supabase
    .from('schools')
    .select('id,name,npsn,address,village,kecamatan,student_count,st_male,st_female,lat,lng,latitude,longitude')
    .eq('npsn', npsn)
    .maybeSingle();
  if (!school) return null;

  const schoolId = school.id;
  const lat = school.lat != null ? Number(school.lat) : (school.latitude != null ? Number(school.latitude) : null);
  const lng = school.lng != null ? Number(school.lng) : (school.longitude != null ? Number(school.longitude) : null);

  const base = {
    id: schoolId,
    name: school.name || '-',
    npsn: school.npsn || '-',
    address: school.address || '-',
    village: school.village || '-',
    kecamatan: school.kecamatan || '-',
    student_count: int(school.student_count, (int(school.st_male,0)+int(school.st_female,0))),
    st_male: int(school.st_male, 0),
    st_female: int(school.st_female, 0),
    coordinates: (typeof lat === 'number' && typeof lng === 'number') ? [lat, lng] : null,
  };

  const [
    { data: ccRows },
    { data: libRows },
    { data: toiletRows },
    { data: fcompRows },
    { data: teacherRows },
    { data: officRows },
    { data: kegRows },
    { data: bstatRows },
    { data: uksRows },
  ] = await Promise.all([
    supabase.from('class_conditions').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('library').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('toilets').select('*').eq('school_id', schoolId),
    supabase.from('furniture_computer').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('teacher').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('official_residences').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('kegiatan').select('kegiatan,lokal').eq('school_id', schoolId),
    supabase.from('building_status').select('*').eq('school_id', schoolId).limit(1),
    supabase.from('uks').select('*').eq('school_id', schoolId).limit(1),
  ]);

  // class_condition untuk PKBM memakai field SD/SMP style
  const cc = one(ccRows) || {};
  const class_condition = {
    classrooms_good: int(cc.classrooms_good, 0),
    classrooms_moderate_damage: int(cc.classrooms_moderate_damage, 0),
    classrooms_heavy_damage: int(cc.classrooms_heavy_damage, 0),
    total_room: int(cc.total_room, 0),
    lacking_rkb: int(cc.lacking_rkb, 0),
    total_mh: int(cc.classrooms_moderate_damage, 0) + int(cc.classrooms_heavy_damage, 0),
  };

  // library
  const lib = one(libRows) || {};
  const library = {
    good: int(lib.good, 0),
    moderate_damage: int(lib.moderate_damage, 0),
    heavy_damage: int(lib.heavy_damage, 0),
    total_mh: int(lib.moderate_damage, 0) + int(lib.heavy_damage, 0),
    total_all: lib.total != null
      ? int(lib.total, 0)
      : int(lib.good, 0) + int(lib.moderate_damage, 0) + int(lib.heavy_damage, 0),
  };

  // toilets
  const { toilets, toilets_overall } = normalizeToilets(toiletRows);

  // furniture_computer (alias)
  const fcomp = normalizeFurnitureComputer(one(fcompRows) || {});

  // teacher
  const t = one(teacherRows) || {};
  const teacher = {
    teachers: int(t.teachers ?? t.jumlah_guru, 0),
    n_teachers: int(t.n_teachers ?? t.kekurangan_guru, 0),
    tendik: int(t.tendik ?? t.tenaga_kependidikan, 0),
  };

  // residences
  const offic = one(officRows) || {};
  const official_residences = {
    total: int(offic.total, 0),
    good: int(offic.good, 0),
    moderate_damage: int(offic.moderate_damage, 0),
    heavy_damage: int(offic.heavy_damage, 0),
  };

  // kegiatan
  const pembangunanRKB = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('pembangunan'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);
  const rehabRuangKelas = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('rehab'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);

  // building_status
  const bstatRaw = one(bstatRows) || {};
  const bstat = normalizeBuildingStatus(bstatRaw);

  // UKS
  const u = one(uksRows) || {};
  const uks = { n_available: truthy(u.n_available) ? u.n_available : (truthy(u.available) ? u.available : 'Tidak Tersedia') };

  // facilities (opsional dari building_status)
  const facilities = {
    land_area: pickNum(bstatRaw, ['land_area','luas_tanah'], null),
    building_area: pickNum(bstatRaw, ['building_area','luas_bangunan'], null),
    yard_area: pickNum(bstatRaw, ['yard_area','luas_halaman'], null),
  };

  return {
    ...base,
    class_condition,
    library,
    ...toilets,
    toilets_overall,
    furniture_computer: fcomp,
    teacher,
    official_residences,
    pembangunanRKB,
    rehabRuangKelas,
    building_status: bstat,
    facilities,
  };
}
