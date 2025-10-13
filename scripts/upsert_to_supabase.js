// scripts/upsert_to_supabase.js
// Versi perbaikan: ENV guard, coalescePatch untuk schools,
// normalisasi NPSN, upsert kegiatan (delete+insert aggregated),
// path JSON fleksibel (merged > per-jenjang).

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// -----------------------------
// Util path
// -----------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..'); // proyek root
const pubDir = path.join(root, 'public');
const mergedDir = path.join(pubDir, 'merged');

// -----------------------------
// ENV guard
// -----------------------------
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

if (!SUPABASE_URL || !/^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL)) {
  throw new Error(`SUPABASE_URL invalid: "${SUPABASE_URL}"`);
}
if (!SUPABASE_SERVICE_ROLE || SUPABASE_SERVICE_ROLE.length < 40) {
  throw new Error('SUPABASE_SERVICE_ROLE missing/too short');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false },
});

// -----------------------------
// Helpers
// -----------------------------
const int = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const normNpsn = (x) => String(x ?? '').replace(/\D/g, '').trim();

const coalescePatch = (obj) => {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') out[k] = v;
  }
  return out;
};

const fileExists = (p) => {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
};

const loadJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// -----------------------------
// Load schools JSON
// -----------------------------
function loadSchoolsData() {
  // prioritas merged
  const merged = path.join(mergedDir, 'schools_all.json');

  if (fileExists(merged)) {
    const j = loadJson(merged);
    if (Array.isArray(j)) return j;
  }

  // fallback per-jenjang
  const tryFiles = [
    path.join(pubDir, 'smp', 'data', 'smp.json'),
    path.join(pubDir, 'sd', 'data', 'sd_new.json'),
    path.join(pubDir, 'paud', 'data', 'paud.json'),
    path.join(pubDir, 'pkbm', 'data', 'pkbm.json'),
  ];
  const rows = [];
  for (const f of tryFiles) {
    if (fileExists(f)) {
      const j = loadJson(f);
      if (Array.isArray(j)) rows.push(...j);
    }
  }
  return rows;
}

// -----------------------------
// Load kegiatan JSON
// -----------------------------
function loadKegiatanData() {
  // prioritas merged
  const merged = path.join(mergedDir, 'kegiatan_all.json');
  if (fileExists(merged)) {
    const j = loadJson(merged);
    return j;
  }

  // fallback: hanya SMP terlebih dulu (tambahkan sd/paud/pkbm jika mau)
  const smp = path.join(pubDir, 'smp', 'data', 'data_kegiatan.json');
  if (fileExists(smp)) return loadJson(smp);

  // tidak ada
  return [];
}

// -----------------------------
// Upsert SCHOOLS (safe update)
// -----------------------------
async function upsertSchools(rows) {
  // Kita hanya UPDATE kalau ada patch bermakna; untuk INSERT anyar,
  // diasumsikan schools sudah pernah diisi (oleh skrip sebelumnya).
  // Kalau kamu tetap mau INSERT kalau belum ada, aktifkan blok CREATE di bawah.
  let ok = 0, fail = 0, created = 0;

  for (const row of rows) {
    const npsn =
      normNpsn(row.npsn ?? row.NPSN ?? row.npsn_txt ?? row.npsn_str ?? '');

    if (!npsn) continue;

    // cari school by npsn
    const { data: existing, error: e0 } = await supabase
      .from('schools')
      .select('id')
      .eq('npsn', npsn)
      .maybeSingle();

    if (e0) { fail++; continue; }

    // siapkan patch: JANGAN menimpa null
    const patch = coalescePatch({
      // nama/alamat
      name: row.name ?? row.nama ?? row.Nama,
      address: row.address ?? row.alamat ?? row.Address,
      village: row.village ?? row.desa ?? row.Village,
      kecamatan: row.kecamatan ?? row.Kecamatan,
      // siswa
      student_count: (row.student_count ?? row.students ?? row.siswa ?? row.St) != null
        ? int(row.student_count ?? row.students ?? row.siswa ?? row.St, 0)
        : undefined,
      // koordinat
      lat: row.lat != null ? Number(row.lat) : (row.latitude != null ? Number(row.latitude) : undefined),
      lng: row.lng != null ? Number(row.lng) : (row.longitude != null ? Number(row.longitude) : undefined),
      // type/level/jenjang kalau tersedia
      type: row.type ?? row.jenis ?? undefined,
      level: row.level ?? row.jenjang ?? row.level_txt ?? undefined,
    });

    if (existing?.id) {
      if (Object.keys(patch).length) {
        const { error: e1 } = await supabase
          .from('schools')
          .update(patch)
          .eq('id', existing.id);
        if (e1) fail++; else ok++;
      }
    } else {
      // OPTIONAL: aktifkan kalau ingin membuat sekolah baru saat tidak ada
      /*
      const base = coalescePatch({
        npsn, name: row.name ?? row.nama ?? 'Tanpa Nama',
        address: row.address ?? row.alamat,
        village: row.village ?? row.desa,
        kecamatan: row.kecamatan ?? row.Kecamatan,
        student_count: (row.student_count ?? row.students ?? row.siswa ?? row.St) != null
          ? int(row.student_count ?? row.students ?? row.siswa ?? row.St, 0)
          : undefined,
        lat: row.lat ?? row.latitude,
        lng: row.lng ?? row.longitude,
        level: row.level ?? row.jenjang,
        type: row.type,
      });
      const { error: e2 } = await supabase.from('schools').insert(base);
      if (e2) fail++; else created++;
      */
    }
  }

  console.log(`Upsert schools OK: ${ok}  (created: ${created}, fail: ${fail})`);
}

// -----------------------------
// Upsert KEGIATAN (aggregated, idempotent)
// -----------------------------
async function upsertKegiatan(rows) {
  // rows bisa array seperti:
  // [{ jenjang:'SMP', npsn:'20209285', kegiatan:'Rehab', lokal:1 }, ...]
  if (!rows || (Array.isArray(rows) && rows.length === 0)) {
    console.log('No kegiatan rows to process.');
    return;
  }

  // Agregasi per NPSN: {rehab, pembangunan}
  const agg = new Map();
  const take = (x) => (x == null ? 0 : int(x, 0));

  if (Array.isArray(rows)) {
    for (const r of rows) {
      const npsn = normNpsn(r.npsn ?? r.NPSN);
      if (!npsn) continue;
      const keg = String(r.kegiatan ?? r.Kegiatan ?? '').toLowerCase();
      const lokal = take(r.lokal ?? r.Lokal ?? r.jumlah);

      const cur = agg.get(npsn) || { rehab: 0, pembangunan: 0 };
      if (keg.includes('rehab')) cur.rehab += lokal;
      else if (keg.includes('bangun') || keg.includes('pembangunan')) cur.pembangunan += lokal;
      agg.set(npsn, cur);
    }
  } else if (rows && typeof rows === 'object') {
    // kalau formatnya object map { npsn: { rehab, pembangunan } }
    for (const [k, v] of Object.entries(rows)) {
      const npsn = normNpsn(k);
      const cur = agg.get(npsn) || { rehab: 0, pembangunan: 0 };
      cur.rehab += take(v?.rehab ?? v?.Rehab);
      cur.pembangunan += take(v?.pembangunan ?? v?.Pembangunan);
      agg.set(npsn, cur);
    }
  }

  let mapped = 0, misses = 0;
  for (const [npsn, val] of agg.entries()) {
    // lookup school_id
    const { data: school } = await supabase
      .from('schools')
      .select('id')
      .eq('npsn', npsn)
      .maybeSingle();

    if (!school?.id) { misses++; continue; }

    // idempotent: hapus existing 2 baris kegiatan untuk sekolah ini, lalu insert yang baru (kalau >0)
    await supabase.from('kegiatan').delete().eq('school_id', school.id);

    const rowsIns = [];
    if (val.rehab > 0) rowsIns.push({ school_id: school.id, kegiatan: 'Rehab',      lokal: int(val.rehab, 0) });
    if (val.pembangunan > 0) rowsIns.push({ school_id: school.id, kegiatan: 'Pembangunan', lokal: int(val.pembangunan, 0) });

    if (rowsIns.length) {
      const { error: eIns } = await supabase.from('kegiatan').insert(rowsIns);
      if (eIns) { console.warn('insert kegiatan error for npsn', npsn, eIns.message); }
      else mapped++;
    }
  }

  console.log(`Upsert kegiatan OK: ${mapped}  (misses: ${misses}, total_npsn: ${agg.size})`);
}

// -----------------------------
// MAIN
// -----------------------------
async function main() {
  console.log('== upsert_to_supabase.js ==');

  // 1) SCHOOLS
  let schoolsRows = [];
  try {
    schoolsRows = loadSchoolsData();
  } catch (e) {
    console.error('Load schools JSON failed:', e.message);
  }
  console.log('Sekolah rows available:', Array.isArray(schoolsRows) ? schoolsRows.length : 0);
  await upsertSchools(schoolsRows);

  // 2) KEGIATAN
  let kegiatanRows = [];
  try {
    kegiatanRows = loadKegiatanData();
  } catch (e) {
    console.error('Load kegiatan JSON failed:', e.message);
  }
  if (Array.isArray(kegiatanRows)) {
    console.log('Kegiatan rows available:', kegiatanRows.length);
  } else {
    console.log('Kegiatan map available keys:', Object.keys(kegiatanRows || {}).length);
  }
  await upsertKegiatan(kegiatanRows);

  console.log('DONE upsert_to_supabase.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
