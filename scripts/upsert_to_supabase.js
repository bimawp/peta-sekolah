// scripts/upsert_to_supabase.js
// Baca public/merged/*.json → upsert ke Supabase.
// - Upsert schools by npsn
// - Map kegiatan by npsn → school_id (lookup id dulu), lalu insert/update kegiatan
// NOTE: butuh kredensial server (service key) agar aman dari RLS.

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE; // pakai service role key
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Harus set env SUPABASE_URL dan SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// lokasi file hasil merge
const SCHOOLS_FILE = path.join(__dirname, '..', 'public', 'merged', 'schools_all.json');
const KEGIATAN_FILE = path.join(__dirname, '..', 'public', 'merged', 'kegiatan_all.json');

// helper
function chunk(arr, size = 500) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function toEnumJenjang(j) {
  const v = (j || '').toUpperCase();
  if (['PAUD','SD','SMP','PKBM'].includes(v)) return v;
  return null;
}
function cleanStr(x) {
  if (x === null || x === undefined) return null;
  const s = String(x).trim();
  return s === '' ? null : s;
}

// 1) UPSERT SCHOOLS
async function upsertSchools(rows) {
  // siapkan payload sesuai schema public.schools
  const payload = rows
    .filter(r => r.npsn && r.name)
    .map(r => ({
      npsn: cleanStr(r.npsn),
      name: cleanStr(r.name),
      address: cleanStr(r.address),
      village: cleanStr(r.desa),
      kecamatan: cleanStr(r.kecamatan),
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      // kolom jenjang kamu bertipe USER-DEFINED (jenjang_t). Supabase/pg akan cast dari text bila cocok.
      jenjang: toEnumJenjang(r.jenjang)
    }));

  const batches = chunk(payload, 500);
  let inserted = 0;

  for (const b of batches) {
    // Upsert via unique constraint npsn (pastikan schools.npsn UNIQUE)
    const { data, error } = await sb
      .from('schools')
      .upsert(b, { onConflict: 'npsn' }) // pakai constraint unik
      .select('id, npsn');

    if (error) {
      console.error('Upsert schools error:', error);
      throw error;
    }
    inserted += (data?.length || 0);
  }
  return inserted;
}

// 2) BUILD MAP NPSN -> school_id
async function getSchoolIdMap(npsnList) {
  const ids = new Map();
  const batches = chunk([...new Set(npsnList)], 1000);
  for (const b of batches) {
    const { data, error } = await sb
      .from('schools')
      .select('id,npsn')
      .in('npsn', b);
    if (error) throw error;
    for (const r of (data || [])) ids.set(r.npsn, r.id);
  }
  return ids;
}

// 3) UPSERT KEGIATAN (by school_id + kegiatan)
async function upsertKegiatan(rows, schoolIdByNpsn) {
  const ready = rows
    .map(r => ({
      school_id: schoolIdByNpsn.get(r.npsn) || null,
      kegiatan : r.kegiatan,        // 'Rehab' | 'Pembangunan'
      lokal    : Number.isFinite(r.lokal) ? r.lokal : 0
    }))
    .filter(x => x.school_id && x.kegiatan);

  // di tabel kamu "kegiatan" punyanya (id, school_id, kegiatan, lokal, ...)
  // bikin upsert berdasarkan (school_id, kegiatan) → perlu unique index (kalau belum ada, buat di DB):
  // CREATE UNIQUE INDEX IF NOT EXISTS ux_kegiatan_school_kegiatan ON public.kegiatan (school_id, kegiatan);

  const batches = chunk(ready, 500);
  let upserted = 0;
  for (const b of batches) {
    const { data, error } = await sb
      .from('kegiatan')
      .upsert(b, { onConflict: 'school_id,kegiatan' })
      .select('id');

    if (error) {
      console.error('Upsert kegiatan error:', error);
      throw error;
    }
    upserted += (data?.length || 0);
  }
  return upserted;
}

(async () => {
  // load file lokal
  const schoolsAll = JSON.parse(fs.readFileSync(SCHOOLS_FILE, 'utf8'));
  const kegiatanAll = JSON.parse(fs.readFileSync(KEGIATAN_FILE, 'utf8'));

  console.log('Sekolah (uniq NPSN) to upsert:', schoolsAll.length);
  const up1 = await upsertSchools(schoolsAll);
  console.log('Upsert schools OK:', up1);

  // build map NPSN->id (untuk kegiatan)
  const npsnList = kegiatanAll.map(x => x.npsn).filter(Boolean);
  const idMap = await getSchoolIdMap(npsnList);
  console.log('Known school_id for kegiatan:', idMap.size);

  const up2 = await upsertKegiatan(kegiatanAll, idMap);
  console.log('Upsert kegiatan OK:', up2);

  console.log('DONE upsert_to_supabase.');
})();
