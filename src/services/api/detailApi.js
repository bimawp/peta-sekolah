// src/services/api/detailApi.js
// SUPABASE ONLY + fleksibel baca tabel untuk SD & SMP
import supabase from '../supabaseClient';

const int = (v, d = 0) => {
  if (v === null || v === undefined) return d;
  const n = Number(v);
  return Number.isNaN(n) ? d : n;
};
const one = (arr) => (Array.isArray(arr) && arr.length ? arr[0] : null);

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

// =================== SMP ===================
export async function getSmpDetailByNpsn(npsn) {
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
  const toilets = emptyToilets();
  let tGood = 0, tMod = 0, tHeavy = 0, tTotalSeen = 0;
  (toiletRows || []).forEach((r) => {
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

  // furniture_computer
  const fcomp = one(fcompRows) || {};
  const furniture_computer = {
    tables: int(fcomp.tables, 0),
    chairs: int(fcomp.chairs, 0),
    boards: int(fcomp.boards, 0),
    computer: int(fcomp.computer, 0),
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
  const rehabRKB = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('rehab'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);

  // facilities
  const bstat = one(bstatRows) || {};
  const facilities = {
    land_area: int(bstat.land_area, null),
    building_area: int(bstat.building_area, null),
    yard_area: int(bstat.yard_area, null),
  };

  return {
    ...base,
    class_condition,
    library,
    ...labs,
    ...rooms,
    ...toilets,
    toilets_overall,          // <- NEW fallback
    furniture_computer,
    official_residences,
    pembangunanRKB,
    rehabRKB,
    facilities,
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
  const toilets = emptyToilets();
  let tGood = 0, tMod = 0, tHeavy = 0, tTotalSeen = 0;
  (toiletRows || []).forEach((r) => {
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

  // furniture_computer
  const fcomp = one(fcompRows) || {};
  const furniture_computer = {
    tables: int(fcomp.tables, 0),
    chairs: int(fcomp.chairs, 0),
    boards: int(fcomp.boards, 0),
    computer: int(fcomp.computer, 0),
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
  const rehabRKB = (kegRows || [])
    .filter((r) => String(r.kegiatan || '').toLowerCase().includes('rehab'))
    .reduce((acc, r) => acc + int(r.lokal, 0), 0);

  // facilities
  const bstat = one(bstatRows) || {};
  const facilities = {
    land_area: int(bstat.land_area, null),
    building_area: int(bstat.building_area, null),
    yard_area: int(bstat.yard_area, null),
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
    toilets_overall,         // <- NEW fallback
    furniture_computer,
    official_residences,
    pembangunanRKB,
    rehabRKB,
    facilities,
    classes,
    rombel,
    uks_room,
  };
}
