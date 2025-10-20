// scripts/seed_all_from_json.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// ─────────────────────────────────────────────────────────────
// ENV
// ─────────────────────────────────────────────────────────────
dotenv.config({ path: path.join(projectRoot, '.env.local') });
dotenv.config({ path: path.join(projectRoot, '.env') });

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Wajib set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY di .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ─────────────────────────────────────────────────────────────
// SOURCES: remote (vercel) & lokal
// ─────────────────────────────────────────────────────────────
const REMOTE = {
  SD:   'https://peta-sekolah.vercel.app/sd/data/sd_new.json',
  PAUD: 'https://peta-sekolah.vercel.app/paud/data/paud.json',
  SMP:  'https://peta-sekolah.vercel.app/smp/data/smp.json',
  PKBM: 'https://peta-sekolah.vercel.app/pkbm/data/pkbm.json',

  KEG_SD:    'https://peta-sekolah.vercel.app/sd/data/data_kegiatan.json',
  KEG_SD_2:  'https://peta-sekolah.vercel.app/smp/data/data_kegiatan.json', // sengaja kasih alias kedua
  KEG_PAUD:  'https://peta-sekolah.vercel.app/paud/data/data_kegiatan.json',
  KEG_SMP:   'https://peta-sekolah.vercel.app/smp/data/data_kegiatan.json',
  KEG_PKBM:  'https://peta-sekolah.vercel.app/pkbm/data/data_kegiatan.json',

  GJ_KAB: 'https://peta-sekolah.vercel.app/data/kecamatan.geojson',
  GJ_DESA:'https://peta-sekolah.vercel.app/data/desa.geojson',
};

const LOCAL = {
  SD:   'public/data/sd_new.json',
  PAUD: 'public/data/paud.json',
  SMP:  'public/data/smp.json',
  PKBM: 'public/data/pkbm.json',

  KEG_SD:    'public/data/data_kegiatan_sd.json',
  KEG_SD_2:  'public/data/data_kegiatan_anggaran_sd.json',
  KEG_PAUD:  'public/data/data_kegiatan_paud.json',
  KEG_SMP:   'public/data/data_kegiatan.json', // kalau kamu taruh kegiatan smp gabung di sini
  KEG_PKBM:  'public/data/data_kegiatan_pkbm.json',

  GJ_KAB: 'public/data/kecamatan.geojson',
  GJ_DESA:'public/data/desa.geojson',
};

// ─────────────────────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────────────────────
const num = (v, d = 0) => {
  if (v == null || v === '' || v === 'NaN') return d;
  const n = Number(String(v).replaceAll(',', ''));
  return Number.isNaN(n) ? d : n;
};
const str = (v, d = null) => (v == null || v === '' ? d : String(v));
const isObj = (o) => o && typeof o === 'object' && !Array.isArray(o);

function pickNpsn(row) {
  const keys = Object.keys(row || {});
  const k = keys.find(k => /^(npsn|NPSN|kode|school_npsn)$/i.test(k));
  return k ? String(row[k]).trim() : '';
}

async function fetchOrRead(src, sourceMode) {
  if (sourceMode === 'remote') {
    const url = REMOTE[src];
    if (!url) throw new Error(`REMOTE source tidak dikenal: ${src}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Gagal fetch ${url}: ${res.status}`);
    return await res.text();
  } else {
    const file = LOCAL[src];
    if (!file) throw new Error(`LOCAL source tidak dikenal: ${src}`);
    const p = path.resolve(projectRoot, file);
    if (!fs.existsSync(p)) throw new Error(`File lokal tidak ditemukan: ${p}`);
    return fs.readFileSync(p, 'utf-8');
  }
}

function parseJsonOrNdjson(txt) {
  try { return JSON.parse(txt); } catch {
    const lines = txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const arr = [];
    for (const line of lines) { try { arr.push(JSON.parse(line)); } catch {} }
    if (arr.length) return arr;
    throw new Error('Bukan JSON valid atau NDJSON.');
  }
}

function normalizeToArray(json) {
  if (Array.isArray(json)) return json;

  // GeoJSON FeatureCollection
  if (json && json.type === 'FeatureCollection' && Array.isArray(json.features)) {
    return json.features.map(f => f?.properties || f).filter(Boolean);
  }

  // Kamus per kecamatan: { "Banjarwangi": [ {...}, ... ] }
  if (isObj(json)) {
    const vals = Object.values(json);
    if (vals.length && vals.every(v => Array.isArray(v))) return vals.flat();

    for (const key of ['data','rows','items','records','features','payload','result']) {
      if (Array.isArray(json[key])) return json[key];
    }

    if (vals.length) return vals; // fallback values()
  }

  throw new Error('Tidak bisa dinormalisasi ke array.');
}

async function loadArray(srcKey, sourceMode) {
  const txt  = await fetchOrRead(srcKey, sourceMode);
  const json = parseJsonOrNdjson(txt);
  const arr  = normalizeToArray(json).filter(r => r && typeof r === 'object');
  return arr;
}

async function upsertOne(table, match, payload) {
  const { data: ex, error: e1 } = await supabase.from(table).select('id').match(match).limit(1).maybeSingle();
  if (e1) throw e1;
  if (ex?.id) {
    const { error: e2 } = await supabase.from(table).update(payload).eq('id', ex.id);
    if (e2) throw e2;
    return ex.id;
  } else {
    const { data: ins, error: e3 } = await supabase.from(table).insert([{ ...match, ...payload }]).select('id').single();
    if (e3) throw e3;
    return ins.id;
  }
}

async function getSchoolIdByNpsn(npsn) {
  const { data: sch, error } = await supabase.from('schools').select('id').eq('npsn', npsn).maybeSingle();
  if (error) throw error;
  return sch?.id ?? null;
}

// ─────────────────────────────────────────────────────────────
// Upserters umum
// ─────────────────────────────────────────────────────────────
async function upsertBuildingStatus(school_id, s = {}) {
  const land_area     = s?.facilities?.land_area ?? s?.building_status?.land_area ?? s?.land_area;
  const building_area = s?.facilities?.building_area ?? s?.building_status?.building_area ?? s?.building_area;
  const yard_area     = s?.facilities?.yard_area ?? s?.building_status?.yard_area ?? s?.yard_area;

  await upsertOne('building_status', { school_id }, {
    land_area: land_area === undefined ? null : num(land_area, null),
    building_area: building_area === undefined ? null : num(building_area, null),
    yard_area: yard_area === undefined ? null : num(yard_area, null),

    tanah_yayasan: str(s?.building_status?.tanah?.yayasan ?? s?.tanah_yayasan, null),
    tanah_hibah:   str(s?.building_status?.tanah?.hibah ?? s?.tanah_hibah, null),
    tanah_pribadi: str(s?.building_status?.tanah?.pribadi ?? s?.tanah_pribadi, null),

    gedung_yayasan:   str(s?.building_status?.gedung?.yayasan ?? s?.gedung_yayasan, null),
    gedung_hibah:     str(s?.building_status?.gedung?.hibah ?? s?.gedung_hibah, null),
    gedung_sewa:      str(s?.building_status?.gedung?.sewa ?? s?.gedung_sewa, null),
    gedung_menumpang: str(s?.building_status?.gedung?.menumpang ?? s?.gedung_menumpang, null),
  });
}

async function upsertClassConditions(school_id, cc = {}) {
  const good  = num(cc?.classrooms_good);
  const mod   = num(cc?.classrooms_moderate_damage);
  const heavy = num(cc?.classrooms_heavy_damage);
  const total_room = num(cc?.total_room, good + mod + heavy);
  if ([good,mod,heavy,total_room].some(v => v !== 0)) {
    await upsertOne('class_conditions', { school_id }, {
      classrooms_good: good,
      classrooms_moderate_damage: mod,
      classrooms_heavy_damage: heavy,
      total_room,
      lacking_rkb: num(cc?.lacking_rkb),
      total_mh: mod + heavy,
    });
  }
}

async function upsertLibrary(school_id, lib = {}) {
  const total = num(lib?.total ?? lib?.library_total ?? (num(lib?.good)+num(lib?.moderate_damage)+num(lib?.heavy_damage)));
  await upsertOne('library', { school_id }, {
    total,
    good: num(lib?.good ?? lib?.library_good),
    moderate_damage: num(lib?.moderate_damage ?? lib?.library_moderate),
    heavy_damage: num(lib?.heavy_damage ?? lib?.library_heavy),
  });
}

async function upsertToiletsOverall(school_id, t = {}) {
  const total = num(t?.total ?? t?.toilet_total ?? (num(t?.good)+num(t?.moderate_damage)+num(t?.heavy_damage)));
  await upsertOne('toilets', { school_id, type: 'Siswa' }, {
    male: 0, female: 0,
    good: num(t?.good ?? t?.toilet_good),
    moderate_damage: num(t?.moderate_damage ?? t?.toilet_moderate),
    heavy_damage: num(t?.heavy_damage ?? t?.toilet_heavy),
    total,
  });
}

async function upsertFurnitureComputer(school_id, f = {}) {
  const src = f?.furniture_computer || f?.furniture || f;
  await upsertOne('furniture_computer', { school_id }, {
    tables:   num(src?.tables ?? src?.tables_total ?? src?.meja_total),
    chairs:   num(src?.chairs ?? src?.chairs_total ?? src?.kursi_total),
    boards:   num(src?.boards ?? src?.boards_total ?? 0),
    computer: num(src?.computer ?? src?.computer_total ?? 0),
    n_tables: src?.n_tables != null ? num(src?.n_tables) : null,
    n_chairs: src?.n_chairs != null ? num(src?.n_chairs) : null,
  });
}

// ─────────────────────────────────────────────────────────────
// Per-jenjang
// ─────────────────────────────────────────────────────────────
async function seedSDRecord(row) {
  const npsn = pickNpsn(row);
  if (!npsn) return { skip: true };
  const id = await getSchoolIdByNpsn(npsn);
  if (!id) return { skip: true };

  const classes = row?.classes || {};
  const rombel  = row?.rombel  || {};

  await upsertOne('classes_sd', { school_id: id }, {
    g1_male: num(classes['1_L']), g1_female: num(classes['1_P']),
    g2_male: num(classes['2_L']), g2_female: num(classes['2_P']),
    g3_male: num(classes['3_L']), g3_female: num(classes['3_P']),
    g4_male: num(classes['4_L']), g4_female: num(classes['4_P']),
    g5_male: num(classes['5_L']), g5_female: num(classes['5_P']),
    g6_male: num(classes['6_L']), g6_female: num(classes['6_P']),
  });

  await upsertOne('rombel', { school_id: id }, {
    r1: num(rombel['1']), r2: num(rombel['2']), r3: num(rombel['3']),
    r4: num(rombel['4']), r5: num(rombel['5']), r6: num(rombel['6']),
    total: num(rombel?.total),
  });

  await upsertBuildingStatus(id, row);
  await upsertClassConditions(id, row?.class_condition || row?.class_conditions || {});
  await upsertLibrary(id, row?.library || {});
  await upsertToiletsOverall(id, row?.toilets || {});
  await upsertFurnitureComputer(id, row);

  return { ok: true };
}

async function seedPAUDRecord(row) {
  const npsn = pickNpsn(row);
  if (!npsn) return { skip: true };
  const id = await getSchoolIdByNpsn(npsn);
  if (!id) return { skip: true };

  const rombel = row?.rombel || {};
  await upsertOne('rombel', { school_id: id }, {
    tka: num(rombel?.tka), tkb: num(rombel?.tkb), kb: num(rombel?.kb),
    sps_tpa: num(rombel?.sps_tpa),
  });

  await upsertBuildingStatus(id, row);
  await upsertClassConditions(id, row?.class_condition || row?.class_conditions || {});
  await upsertToiletsOverall(id, row?.toilets || {});
  await upsertFurnitureComputer(id, row?.furniture_computer || row);

  return { ok: true };
}

async function seedSMPRecord(row) {
  const npsn = pickNpsn(row);
  if (!npsn) return { skip: true };
  const id = await getSchoolIdByNpsn(npsn);
  if (!id) return { skip: true };

  // Catatan: skema kamu tidak punya classes_smp; kita isi komponen umum saja
  await upsertBuildingStatus(id, row);
  await upsertClassConditions(id, row?.class_condition || row?.class_conditions || {});
  await upsertLibrary(id, row?.library || {});
  await upsertToiletsOverall(id, row?.toilets || {});
  await upsertFurnitureComputer(id, row?.furniture_computer || row);

  return { ok: true };
}

async function seedPKBMRecord(row) {
  const npsn = pickNpsn(row);
  if (!npsn) return { skip: true };
  const id = await getSchoolIdByNpsn(npsn);
  if (!id) return { skip: true };

  await upsertBuildingStatus(id, row);
  await upsertClassConditions(id, row?.class_condition || row?.class_conditions || {});
  await upsertToiletsOverall(id, row?.toilets || {});
  await upsertFurnitureComputer(id, row?.furniture_computer || row);

  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
function normKegiatanName(v){
  const s = String(v||'').toLowerCase();
  if (s.includes('rehab')) return 'Rehab';
  if (s.includes('bangun')) return 'Pembangunan';
  return null;
}

async function seedKegiatanFromArray(arr){
  let ok=0, skip=0, fail=0;
  for (const r of arr) {
    try{
      const npsn = pickNpsn(r);
      if (!npsn) { skip++; continue; }
      const keg   = normKegiatanName(r?.Kegiatan || r?.kegiatan);
      const lokal = num(r?.Lokal ?? r?.lokal);
      if (!keg || !lokal) { skip++; continue; }
      const id = await getSchoolIdByNpsn(npsn);
      if (!id) { skip++; continue; }
      await upsertOne('kegiatan', { school_id: id, kegiatan: keg }, { lokal });
      ok++;
    }catch(e){ fail++; console.error('[kegiatan][err]', e.message || e); }
  }
  return {ok,skip,fail};
}

// ─────────────────────────────────────────────────────────────
// Kecamatan GeoJSON → tabel kecamatan (+ map schools.kecamatan_id)
// ─────────────────────────────────────────────────────────────
async function seedKecamatanFromGeoArray(arr) {
  let ok=0, skip=0, fail=0;
  for (const p of arr) {
    try {
      const nameKey = Object.keys(p).find(k => /^kecamatan$/i.test(k)) || 'name';
      const name = String(p[nameKey] ?? p.name ?? '').trim();
      if (!name) { skip++; continue; }
      await upsertOne('kecamatan', { name }, {});
      ok++;
    } catch(e) { fail++; console.error('[kecamatan][err]', e.message || e); }
  }
  return {ok,skip,fail};
}

async function syncSchoolsKecamatanId() {
  // **opsional**: isi schools.kecamatan_id berdasarkan kecamatan name exact match
  const { data: kc } = await supabase.from('kecamatan').select('id,name');
  if (!kc?.length) return { updated: 0 };

  let updated = 0;
  for (const row of kc) {
    const { error } = await supabase
      .from('schools')
      .update({ kecamatan_id: row.id })
      .eq('kecamatan', row.name);
    if (!error) updated++;
  }
  return { updated };
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
  const sourceMode = (process.argv.find(a => a.startsWith('--source='))?.split('=')[1] || 'remote').toLowerCase();
  // flags opsional: --only=sd|paud|smp|pkbm|kegiatan|geo
  const only = (process.argv.find(a => a.startsWith('--only='))?.split('=')[1] || '').toLowerCase();

  // test koneksi
  const { error: pingErr } = await supabase.from('schools').select('id').limit(1);
  if (pingErr) { console.error('Gagal akses tabel schools:', pingErr); process.exit(1); }

  // GEO (kecamatan)
  if (!only || only === 'geo') {
    try {
      const gj = await fetchOrRead('GJ_KAB', sourceMode);
      const json = JSON.parse(gj);
      const features = Array.isArray(json?.features) ? json.features.map(f => f.properties || f) : [];
      const { ok, skip, fail } = await seedKecamatanFromGeoArray(features);
      console.log(`[KECAMATAN] OK=${ok} SKIP=${skip} FAIL=${fail}`);
      const synced = await syncSchoolsKecamatanId();
      console.log(`[KECAMATAN] schools.kecamatan_id updated for ~${synced.updated} names (best-effort)`);
    } catch(e) {
      console.warn('[KECAMATAN] dilewati:', e.message);
    }
  }

  // SD
  if (!only || only === 'sd') {
    let sdOk=0, sdSkip=0, sdFail=0;
    try {
      const sd = await loadArray('SD', sourceMode);
      for (const row of sd) {
        try { const r = await seedSDRecord(row); if (r?.ok) sdOk++; else sdSkip++; }
        catch(e){ sdFail++; console.error('[SD][err]', e.message || e); }
      }
      console.log(`[SD] OK=${sdOk} SKIP=${sdSkip} FAIL=${sdFail}`);
    } catch(e) {
      console.warn('[SD] dilewati:', e.message);
    }
  }

  // PAUD
  if (!only || only === 'paud') {
    let pOk=0, pSkip=0, pFail=0;
    try {
      const paud = await loadArray('PAUD', sourceMode);
      for (const row of paud) {
        try { const r = await seedPAUDRecord(row); if (r?.ok) pOk++; else pSkip++; }
        catch(e){ pFail++; console.error('[PAUD][err]', e.message || e); }
      }
      console.log(`[PAUD] OK=${pOk} SKIP=${pSkip} FAIL=${pFail}`);
    } catch(e) {
      console.warn('[PAUD] dilewati:', e.message);
    }
  }

  // SMP
  if (!only || only === 'smp') {
    let sOk=0, sSkip=0, sFail=0;
    try {
      const smp = await loadArray('SMP', sourceMode);
      for (const row of smp) {
        try { const r = await seedSMPRecord(row); if (r?.ok) sOk++; else sSkip++; }
        catch(e){ sFail++; console.error('[SMP][err]', e.message || e); }
      }
      console.log(`[SMP] OK=${sOk} SKIP=${sSkip} FAIL=${sFail}`);
    } catch(e) {
      console.warn('[SMP] dilewati:', e.message);
    }
  }

  // PKBM
  if (!only || only === 'pkbm') {
    let kOk=0, kSkip=0, kFail=0;
    try {
      const pkbm = await loadArray('PKBM', sourceMode);
      for (const row of pkbm) {
        try { const r = await seedPKBMRecord(row); if (r?.ok) kOk++; else kSkip++; }
        catch(e){ kFail++; console.error('[PKBM][err]', e.message || e); }
      }
      console.log(`[PKBM] OK=${kOk} SKIP=${kSkip} FAIL=${kFail}`);
    } catch(e) {
      console.warn('[PKBM] dilewati:', e.message);
    }
  }

  // KEGIATAN
  if (!only || only === 'kegiatan') {
    let kgOk=0, kgSkip=0, kgFail=0;
    const KEG_KEYS = ['KEG_SD','KEG_SD_2','KEG_PAUD','KEG_SMP','KEG_PKBM'];
    for (const key of KEG_KEYS) {
      try {
        const arr = await loadArray(key, sourceMode);
        const { ok, skip, fail } = await seedKegiatanFromArray(arr);
        kgOk+=ok; kgSkip+=skip; kgFail+=fail;
        console.log(`[KEGIATAN][${key}] OK=${ok} SKIP=${skip} FAIL=${fail}`);
      } catch(e) {
        console.warn(`[KEGIATAN][${key}] dilewati:`, e.message);
      }
    }
    console.log(`[KEGIATAN][TOTAL] OK=${kgOk} SKIP=${kgSkip} FAIL=${kgFail}`);
  }

  console.log('SEED SELESAI ✅');
}

main().catch(e => { console.error(e); process.exit(1); });
