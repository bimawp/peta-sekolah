// src/workers/mergeSchools.worker.js
/* eslint-disable no-restricted-globals */

const isValidCoordinate = (lat, lng) =>
  lat != null && lng != null &&
  typeof lat === 'number' && !Number.isNaN(lat) && lat >= -90 && lat <= 90 &&
  typeof lng === 'number' && !Number.isNaN(lng) && lng >= -180 && lng <= 180 &&
  (lat !== 0 || lng !== 0);

function processSchoolData(input, jenjang, outArr) {
  if (!input) return;

  const processSingle = (school, kecamatanName) => {
    if (!school || typeof school !== 'object') return;

    // === TIDAK MENGUBAH ITUNGAN DATA ===
    let student_count = 0;
    let kondisiKelas = {};

    if (jenjang === 'PAUD') {
      student_count = (school.student_data?.male_students || 0) + (school.student_data?.female_students || 0);
      kondisiKelas = {
        baik: parseInt(school.class_condition?.good) || 0,
        rusakSedang: parseInt(school.class_condition?.moderate_damage) || 0,
        rusakBerat: parseInt(school.class_condition?.heavy_damage) || 0,
      };
    } else {
      student_count = parseInt(school.student_count) || 0;
      kondisiKelas = {
        baik: parseInt(school.class_condition?.classrooms_good) || 0,
        rusakSedang: parseInt(school.class_condition?.classrooms_moderate_damage) || 0,
        rusakBerat: parseInt(school.class_condition?.classrooms_heavy_damage) || 0,
      };
    }

    const rawCoords = school.coordinates;
    if (!Array.isArray(rawCoords) || rawCoords.length !== 2) return;
    const lat = parseFloat(rawCoords[0]);
    const lng = parseFloat(rawCoords[1]);
    if (!isValidCoordinate(lat, lng)) return;

    outArr.push({
      jenjang,
      npsn: school.npsn || `${jenjang}-${Math.random()}`,
      namaSekolah: school.name || school.namaSekolah || 'Tidak diketahui',
      tipeSekolah: school.type || school.status || '-',
      desa: school.village || '-',
      kecamatan: kecamatanName,
      student_count,
      coordinates: [lat, lng],
      kondisiKelas,
      kurangRKB: parseInt(school.class_condition?.lacking_rkb) || 0,
      originalData: school
    });
  };

  if (Array.isArray(input)) {
    input.forEach(s => processSingle(s, s?.kecamatan || '-'));
  } else if (typeof input === 'object') {
    Object.entries(input).forEach(([kec, arr]) => {
      if (Array.isArray(arr)) arr.forEach(s => processSingle(s, kec));
    });
  }
}

self.onmessage = (e) => {
  const { paud, sd, smp, pkbm } = e.data || {};
  const combinedSchoolData = [];
  processSchoolData(paud, 'PAUD', combinedSchoolData);
  processSchoolData(sd, 'SD', combinedSchoolData);
  processSchoolData(smp, 'SMP', combinedSchoolData);
  processSchoolData(pkbm, 'PKBM', combinedSchoolData);
  postMessage({ combinedSchoolData });
};
