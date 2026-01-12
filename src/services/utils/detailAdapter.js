// src/services/utils/detailAdapter.js
const toNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const zeroBox = () => ({ good: 0, moderate_damage: 0, heavy_damage: 0, total_mh: 0, total_all: 0 });

export function adaptViewToSmpDetail(v) {
  if (!v) return null;

  const lat = toNum(v.lat);
  const lng = toNum(v.lng);
  const coordinates = Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null; // komponenmu pakai [lat, lng] untuk URL

  // class_condition dari JSON view
  const cc = v.class_conditions || {};
  const class_condition = {
    classrooms_good:            toNum(cc.good),
    classrooms_moderate_damage: toNum(cc.moderate),
    classrooms_heavy_damage:    toNum(cc.heavy),
    total_room:                 toNum(cc.total_room),
    lacking_rkb:                toNum(cc.lacking_rkb),
  };

  // library
  const lib = v.library || {};
  const library = {
    good:            toNum(lib.good),
    moderate_damage: toNum(lib.moderate),
    heavy_damage:    toNum(lib.heavy),
    total_mh:        toNum(lib.moderate) + toNum(lib.heavy),
    total_all:       toNum(lib.total) || (toNum(lib.good) + toNum(lib.moderate) + toNum(lib.heavy)),
  };

  // toilets (view cuma total; komponenmu minta per gender → isi default 0 agar aman)
  const teachers_toilet = { male: zeroBox(), female: zeroBox() };
  const students_toilet = { male: zeroBox(), female: zeroBox() };

  // furniture komputer, rumah dinas → default 0
  const furniture_computer  = { tables: 0, chairs: 0, boards: 0, computer: 0 };
  const official_residences = { total: 0, good: 0, moderate_damage: 0, heavy_damage: 0 };

  // labs & rooms default 0 box
  const laboratory_comp    = zeroBox();
  const laboratory_langua  = zeroBox();
  const laboratory_ipa     = zeroBox();
  const laboratory_fisika  = zeroBox();
  const laboratory_biologi = zeroBox();

  const kepsek_room         = zeroBox();
  const teacher_room        = zeroBox();
  const administration_room = zeroBox();

  return {
    // header
    name: v.name || '-',
    npsn: v.npsn || '-',
    address: v.address || '-',
    village: v.village || '-',
    kecamatan: v.kecamatan || '-',
    student_count: toNum(v.student_count),
    coordinates,

    // kondisi kelas
    class_condition,

    // perpustakaan
    library,

    // toilets
    teachers_toilet,
    students_toilet,

    // labs
    laboratory_comp,
    laboratory_langua,
    laboratory_ipa,
    laboratory_fisika,
    laboratory_biologi,

    // rooms
    kepsek_room,
    teacher_room,
    administration_room,

    // furniture & komputer
    furniture_computer,

    // rumah dinas
    official_residences,

    // flag opsional yang dipakai bar chart di komponenmu
    pembangunanRKB: 0,
  };
}
