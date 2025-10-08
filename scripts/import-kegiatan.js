// ESM - Import out/kegiatan_clean.csv -> public.kegiatan (REPLACE per sekolah)
// - Normalisasi Kegiatan => {Rehab | Pembangunan} sesuai grafik FE & constraint DB
// - Skip baris yang tak bisa dipetakan (hindari constraint error)
// - Diagnostik: unmatched NPSN & kegiatan_unk

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';
import { supabase } from '../services/supabaseClient'; // ✅
;

dotenv.config({ path: '.env.server' });

// Guard ASCII (hindari karakter non-ASCII di ENV)
const asciiOnly = s => typeof s === 'string' && !/[^\x00-\x7F]/.test(s);
const strip = s => String(s ?? '').trim().replace(/^"+|"+$/g, '').replace(/^<+|>+$/g, '');

process.env.SUPABASE_URL = strip(process.env.SUPABASE_URL);
process.env.SUPABASE_SERVICE_ROLE = strip(process.env.SUPABASE_SERVICE_ROLE);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE) {
  throw new Error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE. Cek .env.server.');
}
if (!asciiOnly(process.env.SUPABASE_URL) || !asciiOnly(process.env.SUPABASE_SERVICE_ROLE)) {
  throw new Error('ENV mengandung karakter non-ASCII (mis. panah →). Buat ulang .env.server pakai ASCII.');
}
console.log('[env] url.len=%d key.len=%d',
  process.env.SUPABASE_URL.length,
  process.env.SUPABASE_SERVICE_ROLE.length
);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false }
});

const csvPath = path.resolve('out', 'kegiatan_clean.csv');

// Aturan normalisasi (urutan penting; yang match duluan dipakai)
const RULES = [
  // Rehab cluster
  { re: /(rehab|rehabilitasi|renov|perbaik)/i,                       out: 'Rehab' },

  // Pembangunan cluster (termasuk RKB & pekerjaan fisik baru)
  { re: /(pembangun|rkb|ruang\s*kelas\s*baru|penambahan\s*ruang|unit\s*baru|bangun)/i, out: 'Pembangunan' },

  // Pekerjaan fisik non-ruang kelas: kita kategorikan ke "Pembangunan" agar masuk grafik total intervensi
  { re: /(pemagaran|pagar|penataan\s*halaman|saluran|drainase|plester|pondasi|paving|jalan\s*lingkungan)/i, out: 'Pembangunan' },
];

function normKegiatan(s) {
  const t = String(s || '').trim();
  for (const r of RULES) {
    if (r.re.test(t)) return r.out;
  }
  return ''; // unknown → skip
}

async function fetchSchoolIdMap() {
  const map = new Map();
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase.from('schools').select('id,npsn').range(from, from + page - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const r of data) if (r.npsn) map.set(String(r.npsn).trim(), r.id);
    if (data.length < page) break;
  }
  return map;
}

async function main() {
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(csvPath, 'utf8');
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  console.log('[import] loaded rows:', rows.length);
  if (rows.length === 0) {
    console.error('CSV empty after sanitize. Check out/kegiatan_clean.csv');
    process.exit(1);
  }

  const idMap = await fetchSchoolIdMap();
  console.log('[import] school map size:', idMap.size);

  const unmatched = new Set();
  const unkKegiatan = new Map(); // original string -> count
  const agg = new Map();         // `${sid}|${keg}` -> sum(lokal)
  const affectedSchoolIds = new Set();

  for (const r of rows) {
    const npsn = String(r.npsn || r.NPSN || '').trim();
    const sid = idMap.get(npsn);
    if (!sid) { unmatched.add(npsn); continue; }

    const kegNorm = normKegiatan(r.kegiatan || r.Kegiatan || '');
    if (!kegNorm) {
      const orig = String(r.kegiatan || r.Kegiatan || '').trim() || '(kosong)';
      unkKegiatan.set(orig, (unkKegiatan.get(orig) || 0) + 1);
      continue; // skip agar tidak melanggar constraint
    }

    const lokal = Number(r.lokal ?? r.Lokal ?? 0);
    if (!Number.isFinite(lokal)) continue;

    const key = `${sid}|${kegNorm}`;
    agg.set(key, (agg.get(key) || 0) + lokal);
    affectedSchoolIds.add(sid);
  }

  console.log('[diagnostic] unmatched_npsn=%d (sample up to 10): %o',
    unmatched.size, Array.from(unmatched).slice(0, 10));

  if (unkKegiatan.size) {
    const sample = Array.from(unkKegiatan.entries()).slice(0, 10);
    console.log('[diagnostic] unknown_kegiatan (skipped) = %d (sample up to 10): %o',
      unkKegiatan.size, sample);
  } else {
    console.log('[diagnostic] unknown_kegiatan (skipped) = 0');
  }

  console.log('[import] pairs:', agg.size, 'schools affected:', affectedSchoolIds.size);
  if (agg.size === 0) {
    console.error('No valid (school_id,kegiatan) pairs after normalization. Periksa CSV & aturan RULES.');
    process.exit(1);
  }

  // REPLACE: hapus baris lama untuk sekolah terdampak (batch)
  const affected = Array.from(affectedSchoolIds);
  const CHUNK = 1000;
  for (let i = 0; i < affected.length; i += CHUNK) {
    const part = affected.slice(i, i + CHUNK);
    const { error: delErr } = await supabase.from('kegiatan').delete().in('school_id', part);
    if (delErr) throw delErr;
    console.log(`[import] deleted old rows for ${part.length} schools (${i + part.length}/${affected.length})`);
  }

  // Insert aggregated
  const inserts = [];
  for (const [k, lokal] of agg.entries()) {
    const [sid, keg] = k.split('|');
    inserts.push({ school_id: Number(sid), kegiatan: keg, lokal });
  }
  for (let i = 0; i < inserts.length; i += CHUNK) {
    const part = inserts.slice(i, i + CHUNK);
    const { error } = await supabase.from('kegiatan').insert(part);
    if (error) throw error;
    console.log(`[import] inserted ${i + part.length}/${inserts.length}`);
  }

  console.log('[import] done.');

  // Ringkas akhir untuk verifikasi cepat
  const { data, error: qErr } = await supabase.from('kegiatan').select('kegiatan, lokal');
  if (qErr) {
    console.warn('[summary] skip (error):', qErr.message);
  } else {
    const rehab = data.filter(r => (r.kegiatan || '').toLowerCase().startsWith('rehab'))
                      .reduce((a, b) => a + (b.lokal || 0), 0);
    const pamb  = data.filter(r => (r.kegiatan || '').toLowerCase().startsWith('pembangun'))
                      .reduce((a, b) => a + (b.lokal || 0), 0);
    console.log('[summary] rows=%d total_rehab=%d total_pembangunan=%d',
      data.length, rehab, pamb);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
