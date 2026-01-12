/**
 * scripts/export-all.js — FIXED
 * Export semua data dari Supabase ke JSON untuk frontend.
 * - Sekolah per jenjang (PAUD, SD, SMP, PKBM)
 * - Kegiatan per jenjang
 * - GeoJSON Kecamatan & Desa (auto-fallback & auto-detect kolom geometri)
 * - Pagination .range() untuk hindari limit 1000
 * - Chunked .in() untuk ambil relasi besar
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

// ---------------------- RUNTIME UTILS ----------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function rel(p) {
  return path.resolve(__dirname, '..', p);
}

function requiredEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `ENV ${name} kosong. Pastikan .env.local berisi SUPABASE_URL dan SUPABASE_SERVICE_ROLE`
    );
  }
  return v;
}

// ---------------------- CONFIG ----------------------
const PAGE_SIZE = 1000;
const IN_CHUNK = 1000;

const OUT = {
  PAUD: { dir: 'public/paud/data', sekolahFile: 'paud.json', kegiatanFile: 'data_kegiatan.json' },
  SD:   { dir: 'public/sd/data',   sekolahFile: 'sd_new.json', kegiatanFile: 'data_kegiatan.json' },
  SMP:  { dir: 'public/smp/data',  sekolahFile: 'smp.json',    kegiatanFile: 'data_kegiatan.json' },
  PKBM: { dir: 'public/pkbm/data', sekolahFile: 'pkbm.json',   kegiatanFile: 'data_kegiatan.json' },
};

// Supabase client (gunakan Service Role agar tidak kena row-level limit saat script)
const SUPABASE_URL  = requiredEnv('SUPABASE_URL');
const SUPABASE_KEY  = requiredEnv('SUPABASE_SERVICE_ROLE');

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ---------------------- FS HELPERS ----------------------
async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}
async function writeJson(filePath, data) {
  const abs = rel(filePath);
  await ensureDir(path.dirname(abs));
  await fs.writeFile(abs, JSON.stringify(data, null, 2), 'utf8');
}

// ---------------------- GENERIC HELPERS ----------------------
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function pagedSelect(selectPageFn) {
  let from = 0;
  let all = [];
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await selectPageFn(from, to);
    if (error) throw error;
    const batch = data || [];
    all = all.concat(batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// ---------------------- DATA FETCHERS ----------------------
async function fetchSchoolsByJenjang(jenjang) {
  // pilih kolom yang dipakai frontend
  const COLS = [
    'id',
    'npsn',
    'name',
    'address',
    'village',
    'kecamatan',
    // gunakan lat/lng (double precision). Jika projectmu pakai latitude/longitude numeric, map-kan di frontend.
    'lat',
    'lng',
    'student_count',
    'st_male',
    'st_female',
  ].join(',');

  return pagedSelect((from, to) =>
    sb.from('schools')
      .select(COLS)
      .eq('jenjang', jenjang)
      .order('name', { ascending: true })
      .range(from, to)
  );
}

async function fetchClassConditionsBySchoolIds(schoolIds) {
  if (!schoolIds.length) return {};
  const out = {};
  for (const ids of chunk(schoolIds, IN_CHUNK)) {
    const { data, error } = await sb
      .from('class_conditions')
      .select(
        'school_id,classrooms_good,classrooms_moderate_damage,classrooms_heavy_damage,total_room,lacking_rkb,total_mh'
      )
      .in('school_id', ids);
    if (error) throw error;
    for (const r of data || []) out[r.school_id] = r;
  }
  return out;
}

async function fetchFurnitureComputerBySchoolIds(schoolIds) {
  if (!schoolIds.length) return {};
  const out = {};
  for (const ids of chunk(schoolIds, IN_CHUNK)) {
    const { data, error } = await sb
      .from('furniture_computer')
      .select('school_id,tables,chairs,boards,computer,n_tables,n_chairs')
      .in('school_id', ids);
    if (error) throw error;
    for (const r of data || []) out[r.school_id] = r;
  }
  return out;
}

async function fetchKegiatanByJenjang(jenjang) {
  // join inner ke schools agar dapat npsn/name; filter di relasi schools.*
  const rows = await pagedSelect((from, to) =>
    sb
      .from('kegiatan')
      .select('school_id,kegiatan,lokal,schools!inner (id,npsn,name,jenjang)')
      .eq('schools.jenjang', jenjang)
      .range(from, to)
  );

  return (rows || []).map((r) => ({
    npsn: r.schools?.npsn ?? null,
    name: r.schools?.name ?? null,
    kegiatan: r.kegiatan,
    lokal: r.lokal ?? 0,
  }));
}

// ---------------------- GEO HELPERS (AUTO-DETECT) ----------------------
const GEOM_CANDIDATES = ['geom', 'geometry', 'the_geom', 'geojson', 'shape', 'geom_wgs84'];

/**
 * Ambil 1 row dan deteksi nama kolom geometri + property yang tersedia.
 * Return { geomCol: string|null, presentProps: string[] }
 */
async function probeTableShape(tableName) {
  const { data, error } = await sb.from(tableName).select('*').limit(1);
  if (error) {
    // kalau table tidak ada pun akan error di sini
    return { error, geomCol: null, presentProps: [] };
  }
  const row = (data && data[0]) || {};
  const keys = Object.keys(row);
  const geomCol = GEOM_CANDIDATES.find((c) => keys.includes(c)) || null;
  return { geomCol, presentProps: keys };
}

/**
 * Export GeoJSON dari kandidat tabel & kolom property.
 * - Mencoba beberapa nama tabel (mis. 'kecamatan' lalu 'kecamatan_shapes')
 * - Mendeteksi kolom geometri.
 * - Mengikutkan hanya property yang benar-benar ada di tabel.
 */
async function exportGeoJSONFlexible({ tableCandidates, desiredProps, outPath, label }) {
  for (const tableName of tableCandidates) {
    const probe = await probeTableShape(tableName);
    if (probe.error) {
      // Tabel tidak ada / tidak bisa diakses: lanjut ke kandidat berikutnya
      continue;
    }
    if (!probe.geomCol) {
      // Tabel ada tapi tidak memiliki kolom geometri
      continue;
    }

    const propCols = desiredProps.filter((p) => probe.presentProps.includes(p));
    const selectCols = [...propCols, probe.geomCol].join(',');

    const { data, error } = await sb.from(tableName).select(selectCols);
    if (error) {
      console.warn(`[${label}] Gagal ambil data dari ${tableName}:`, error.message);
      continue;
    }

    const features = (data || []).map((row) => {
      const { [probe.geomCol]: geometry, ...props } = row;
      return { type: 'Feature', geometry, properties: props };
    });

    const fc = { type: 'FeatureCollection', features };
    await writeJson(outPath, fc);
    console.log(`✅ wrote ${outPath} (table=${tableName}, features=${features.length})`);
    return true;
  }

  console.warn(
    `⚠️  Lewati ekspor ${label}: tidak ditemukan tabel dengan kolom geometri di kandidat: ${tableCandidates.join(
      ', '
    )}`
  );
  return false;
}

// ---------------------- BUILDERS ----------------------
async function buildDatasetForJenjang(jenjang) {
  const schools = await fetchSchoolsByJenjang(jenjang);
  const schoolIds = schools.map((s) => s.id);

  const [ccMap, fcMap] = await Promise.all([
    fetchClassConditionsBySchoolIds(schoolIds),
    fetchFurnitureComputerBySchoolIds(schoolIds),
  ]);

  // bentuk baris sesuai kebutuhan frontend
  return schools.map((s) => {
    const fc = fcMap[s.id] || {};
    const cc = ccMap[s.id] || {};

    return {
      // identitas
      npsn: s.npsn ?? null,
      name: s.name ?? null,
      address: s.address ?? null,
      village: s.village ?? null,
      kecamatan: s.kecamatan ?? null,

      // koordinat (pakai lat/lng double precision)
      lat: s.lat ?? null,
      lng: s.lng ?? null,

      // siswa
      student_count: s.student_count ?? 0,
      st_male: s.st_male ?? 0,
      st_female: s.st_female ?? 0,

      // furniture_computer ringkas
      tables: fc.tables ?? 0,
      chairs: fc.chairs ?? 0,
      boards: fc.boards ?? 0,
      computer: fc.computer ?? 0,
      n_tables: fc.n_tables ?? 0,
      n_chairs: fc.n_chairs ?? 0,

      // kondisi kelas
      classrooms_good: cc.classrooms_good ?? 0,
      classrooms_moderate_damage: cc.classrooms_moderate_damage ?? 0,
      classrooms_heavy_damage: cc.classrooms_heavy_damage ?? 0,
      total_room: cc.total_room ?? 0,
      lacking_rkb: cc.lacking_rkb ?? 0,
      total_mh: cc.total_mh ?? 0,
    };
  });
}

// ---------------------- MAIN ----------------------
async function exportJenjang(jenjang) {
  const cfg = OUT[jenjang];
  if (!cfg) throw new Error(`Unknown jenjang: ${jenjang}`);

  // Sekolah
  const sekolahRows = await buildDatasetForJenjang(jenjang);
  const sekolahPath = path.join(cfg.dir, cfg.sekolahFile);
  await writeJson(sekolahPath, sekolahRows);
  console.log(`✅ wrote ${sekolahPath} items=${sekolahRows.length}`);

  // Kegiatan
  const kegiatanRows = await fetchKegiatanByJenjang(jenjang);
  const kegiatanPath = path.join(cfg.dir, cfg.kegiatanFile);
  await writeJson(kegiatanPath, kegiatanRows);
  console.log(`✅ wrote ${kegiatanPath} items=${kegiatanRows.length}`);

  return { sekolah: sekolahRows.length, kegiatan: kegiatanRows.length };
}

async function main() {
  try {
    console.log('Starting export with:', {
      SUPABASE_URL: SUPABASE_URL.replace(/:\/\/([^@/]+)@/, '://****@'), // redact if any
      PAGE_SIZE,
      IN_CHUNK,
    });

    const results = {};
    for (const jenjang of Object.keys(OUT)) {
      results[jenjang] = await exportJenjang(jenjang);
    }

    // ---------- Export GeoJSON (dengan auto-detect & fallback) ----------
    console.log('\nExporting GeoJSON data...');

    // Kecamatan
    await exportGeoJSONFlexible({
      tableCandidates: ['kecamatan', 'kecamatan_shapes', 'kecamatan_geo'],
      desiredProps: ['id', 'name', 'kode'],
      outPath: 'public/data/kecamatan.geojson',
      label: 'Kecamatan GeoJSON',
    });

    // Desa
    await exportGeoJSONFlexible({
      tableCandidates: ['desa', 'desa_shapes', 'desa_geo'],
      desiredProps: ['id', 'name', 'kode', 'kode_kec'],
      outPath: 'public/data/desa.geojson',
      label: 'Desa GeoJSON',
    });

    // ---------- Ringkasan ----------
    const lines = Object.entries(results).map(
      ([k, v]) => `${k}: sekolah=${v.sekolah}, kegiatan=${v.kegiatan}`
    );
    console.log('\nAll done.\n' + lines.join('\n'));
  } catch (err) {
    console.error('❌ Export failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

main();
