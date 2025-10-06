const fs = require('fs/promises');
const path = require('path');

const DATA_DIRS = [
  path.resolve(__dirname, '../public/data'),
  path.resolve(__dirname, '../data'),
];

const OUT_DIR = path.resolve(__dirname, '../out');

async function readJSON(candidateRelPath) {
  for (const base of DATA_DIRS) {
    const full = path.join(base, candidateRelPath);
    try {
      const buf = await fs.readFile(full, 'utf-8');
      return JSON.parse(buf);
    } catch (_) {}
  }
  return null;
}

const isValidCoordinate = (lat, lng) =>
  lat != null && lng != null &&
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
  !(Number(lat) === 0 && Number(lng) === 0);

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function csvRow(cols) { return cols.map(csvEscape).join(',') + '\n'; }

function pushSchoolRows(acc, data, jenjang) {
  if (!data) return;
  const handleOne = (school, kecamatanName) => {
    if (!school || typeof school !== 'object') return;

    let st_male = 0, st_female = 0, student_count = 0;
    let good = 0, mod = 0, heavy = 0, lacking = 0;

    if (jenjang === 'PAUD') {
      st_male = Number(school.student_data?.male_students || 0);
      st_female = Number(school.student_data?.female_students || 0);
      student_count = st_male + st_female;
      good  = Number(school.class_condition?.good || 0);
      mod   = Number(school.class_condition?.moderate_damage || 0);
      heavy = Number(school.class_condition?.heavy_damage || 0);
      lacking = Number(school.class_condition?.lacking_rkb || 0);
    } else {
      student_count = Number(school.student_count || 0);
      good  = Number(school.class_condition?.classrooms_good || 0);
      mod   = Number(school.class_condition?.classrooms_moderate_damage || 0);
      heavy = Number(school.class_condition?.classrooms_heavy_damage || 0);
      lacking = Number(school.class_condition?.lacking_rkb || 0);
    }

    const coords = Array.isArray(school.coordinates) ? school.coordinates : [];
    const lat = Number(coords[0]);
    const lng = Number(coords[1]);
    if (!isValidCoordinate(lat, lng)) return;

    const npsn = school.npsn ?? '';
    const name = school.name ?? school.namaSekolah ?? 'Tidak diketahui';
    const type = school.type ?? school.status ?? '';
    const village = school.village ?? '';
    const kecamatan = school.kecamatan ?? kecamatanName ?? '';

    acc.schools.push({
      name, npsn, address: '', village, type, level: jenjang,
      st_male, st_female, student_count,
      latitude: lat, longitude: lng, kecamatan
    });

    acc.classConditions.push({
      npsn,
      classrooms_good: good,
      classrooms_moderate_damage: mod,
      classrooms_heavy_damage: heavy,
      lacking_rkb: lacking
    });
  };

  if (Array.isArray(data)) {
    data.forEach(s => handleOne(s, s?.kecamatan || ''));
  } else if (data && typeof data === 'object') {
    for (const [kec, arr] of Object.entries(data)) {
      if (Array.isArray(arr)) arr.forEach(s => handleOne(s, kec));
    }
  }
}

function pushKegiatanRows(arr, kegiatanArray) {
  if (!Array.isArray(kegiatanArray)) return;
  for (const k of kegiatanArray) {
    const npsn = k?.npsn;
    if (!npsn) continue;
    const kegiatan = k?.Kegiatan || '';
    const lokal = Number(k?.Lokal || 0);
    arr.push({ npsn: String(npsn), kegiatan, lokal });
  }
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  const paud = await readJSON('paud.json');
  const sd   = await readJSON('sd_new.json');
  const smp  = await readJSON('smp.json');
  const pkbm = await readJSON('pkbm.json');

  const kegPaud = await readJSON('data_kegiatan_paud.json') || [];
  const kegSd   = await readJSON('data_kegiatan_sd.json') || [];
  const kegSmp  = await readJSON('data_kegiatan_smp.json') || [];
  const kegPkbm = await readJSON('data_kegiatan_pkbm.json') || [];

  const acc = { schools: [], classConditions: [] };
  pushSchoolRows(acc, paud, 'PAUD');
  pushSchoolRows(acc, sd,   'SD');
  pushSchoolRows(acc, smp,  'SMP');
  pushSchoolRows(acc, pkbm, 'PKBM');

  const kegiatanAll = [];
  pushKegiatanRows(kegiatanAll, kegPaud);
  pushKegiatanRows(kegiatanAll, kegSd);
  pushKegiatanRows(kegiatanAll, kegSmp);
  pushKegiatanRows(kegiatanAll, kegPkbm);

  let csv = '';
  csv += csvRow(['name','npsn','address','village','type','level','st_male','st_female','student_count','latitude','longitude','kecamatan']);
  for (const s of acc.schools) {
    csv += csvRow([s.name,s.npsn,s.address,s.village,s.type,s.level,s.st_male,s.st_female,s.student_count,s.latitude,s.longitude,s.kecamatan]);
  }
  await fs.writeFile(path.join(OUT_DIR,'schools.csv'), csv, 'utf-8');

  csv = '';
  csv += csvRow(['npsn','classrooms_good','classrooms_moderate_damage','classrooms_heavy_damage','lacking_rkb']);
  for (const c of acc.classConditions) {
    csv += csvRow([c.npsn,c.classrooms_good,c.classrooms_moderate_damage,c.classrooms_heavy_damage,c.lacking_rkb]);
  }
  await fs.writeFile(path.join(OUT_DIR,'class_conditions_temp.csv'), csv, 'utf-8');

  csv = '';
  csv += csvRow(['npsn','kegiatan','lokal']);
  for (const k of kegiatanAll) {
    csv += csvRow([k.npsn,k.kegiatan,k.lokal]);
  }
  await fs.writeFile(path.join(OUT_DIR,'kegiatan_temp.csv'), csv, 'utf-8');

  console.log('✅ CSV generated in /out: schools.csv, class_conditions_temp.csv, kegiatan_temp.csv');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
