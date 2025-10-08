// scripts/fetch_and_merge.js
// ESM-compatible (package.json punya "type":"module")
// Node >= 18 (punya global fetch)

import fs from 'node:fs/promises';
import path from 'node:path';

const DEBUG = process.env.DEBUG_FETCH === '1';

const SOURCES = {
  PAUD: {
    sekolah: 'https://peta-sekolah.vercel.app/paud/data/paud.json',
    kegiatan: 'https://peta-sekolah.vercel.app/paud/data/data_kegiatan.json',
    outSekolah: 'public/paud/data/paud.json',
    outKegiatan: 'public/paud/data/data_kegiatan.json',
  },
  SD: {
    sekolah: 'https://peta-sekolah.vercel.app/sd/data/sd_new.json',
    kegiatan: 'https://peta-sekolah.vercel.app/sd/data/data_kegiatan.json',
    outSekolah: 'public/sd/data/sd_new.json',
    outKegiatan: 'public/sd/data/data_kegiatan.json',
  },
  SMP: {
    sekolah: 'https://peta-sekolah.vercel.app/smp/data/smp.json',
    kegiatan: 'https://peta-sekolah.vercel.app/smp/data/data_kegiatan.json',
    outSekolah: 'public/smp/data/smp.json',
    outKegiatan: 'public/smp/data/data_kegiatan.json',
  },
  PKBM: {
    sekolah: 'https://peta-sekolah.vercel.app/pkbm/data/pkbm.json',
    kegiatan: 'https://peta-sekolah.vercel.app/pkbm/data/data_kegiatan.json',
    outSekolah: 'public/pkbm/data/pkbm.json',
    outKegiatan: 'public/pkbm/data/data_kegiatan.json',
  },
};

const GEO = {
  kecamatan: 'https://peta-sekolah.vercel.app/data/kecamatan.geojson',
  desa: 'https://peta-sekolah.vercel.app/data/desa.geojson',
  outKecamatan: 'public/data/kecamatan.geojson',
  outDesa: 'public/data/desa.geojson',
};

function dbg(...a) {
  if (DEBUG) console.log(...a);
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Fetch ${url} -> HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  const txt = await res.text();
  dbg('[DEBUG] fetchJson first 200 chars:', txt.slice(0, 200));
  try {
    return JSON.parse(txt);
  } catch (e) {
    throw new Error(`Invalid JSON from ${url}: ${e.message}`);
  }
}

function toStr(x) {
  if (x === null || x === undefined) return '';
  return String(x).trim();
}
function toNum(x) {
  if (x === null || x === undefined || x === '') return null;
  const n = Number(String(x).replace(/,/g, '.'));
  return Number.isFinite(n) ? n : null;
}
function truthy(x) {
  return x !== null && x !== undefined && String(x).trim() !== '';
}

function normalizeSekolahRow(raw, ctx = {}) {
  const npsn = toStr(raw.npsn);
  const name = toStr(raw.name || raw['Nama Sekolah'] || raw['Nama sekolah']);
  const address = toStr(raw.address || raw['Alamat'] || raw['addres'] || raw['alamat']);
  const village = toStr(raw.village || raw['Desa'] || raw['desa']);
  const kecamatan = toStr(raw.kecamatan || raw['Kecamatan'] || raw['kec'] || ctx.kecamatan || '');

  const lat = toNum(raw.lat ?? raw.latitude ?? raw['Lat']);
  const lng = toNum(raw.lng ?? raw.longitude ?? raw['Lng']);

  const st_male = toNum(raw.st_male);
  const st_female = toNum(raw.st_female);
  const student_count =
    toNum(raw.student_count) ??
    (truthy(st_male) && truthy(st_female) ? st_male + st_female : null);

  return {
    npsn,
    name,
    address,
    village,
    kecamatan,
    lat,
    lng,
    st_male: st_male ?? null,
    st_female: st_female ?? null,
    student_count: student_count ?? null,
  };
}

function parseSekolahPayload(payload) {
  // Bentuk 1: { "KecamatanA": [ ... ], "KecamatanB": [ ... ] }
  // Bentuk 2: [ { ... }, { ... } ]
  const out = [];
  if (Array.isArray(payload)) {
    for (const row of payload) out.push(normalizeSekolahRow(row));
  } else if (payload && typeof payload === 'object') {
    const kecs = Object.keys(payload); // ← ambil semua kecamatan
    dbg('[DEBUG] [SEKOLAH] object keys count:', kecs.length);
    for (const k of kecs) {
      const arr = Array.isArray(payload[k]) ? payload[k] : [];
      for (const row of arr) out.push(normalizeSekolahRow(row, { kecamatan: k }));
    }
  }
  return out;
}

function normalizeKegiatanRow(raw, jenjang) {
  const kegRaw =
    toStr(raw.Kegiatan) ||
    toStr(raw.kegiatan) ||
    toStr(raw['Jenis Kegiatan']) ||
    toStr(raw['jenis_kegiatan']);
  let kegiatan = '';
  if (/pembangunan/i.test(kegRaw)) kegiatan = 'Pembangunan';
  else if (/rehab/i.test(kegRaw)) kegiatan = 'Rehab';

  const npsn = toStr(raw.npsn);
  const lokal =
    toNum(raw.Lokal) ??
    toNum(raw.lokal) ??
    toNum(raw['Jumlah Lokal']) ??
    toNum(raw['jumlah_lokal']) ??
    0;

  return { jenjang, npsn, kegiatan, lokal };
}

function parseKegiatanPayload(payload, jenjang) {
  const out = [];
  if (Array.isArray(payload)) {
    for (const row of payload) {
      const norm = normalizeKegiatanRow(row, jenjang);
      if (norm.npsn && norm.kegiatan) out.push(norm);
    }
  } else if (payload && typeof payload === 'object') {
    const keys = Object.keys(payload); // object-indexed array
    for (const k of keys) {
      const row = payload[k];
      if (row && typeof row === 'object') {
        const norm = normalizeKegiatanRow(row, jenjang);
        if (norm.npsn && norm.kegiatan) out.push(norm);
      }
    }
  }
  return out;
}

async function ensureDir(p) {
  await fs.mkdir(path.dirname(p), { recursive: true });
}

async function writeJson(p, data) {
  await ensureDir(p);
  await fs.writeFile(p, JSON.stringify(data, null, 2), 'utf8');
}

function dedupByNpsn(arr) {
  const map = new Map();
  for (const r of arr) {
    if (!r.npsn) continue;
    if (!map.has(r.npsn)) map.set(r.npsn, r);
  }
  return [...map.values()];
}

async function main() {
  console.log('== Fetching SEKOLAH ==');

  const allSekolah = { PAUD: [], SD: [], SMP: [], PKBM: [] };

  for (const jenjang of Object.keys(SOURCES)) {
    const url = SOURCES[jenjang].sekolah;
    const payload = await fetchJson(url);
    if (DEBUG) {
      console.log(`[DEBUG] [${jenjang}] typeof payload:`, typeof payload);
      if (payload && typeof payload === 'object') {
        const keys = Object.keys(payload);
        console.log(`[DEBUG] [${jenjang}] keys (count=${keys.length}):`, keys.slice(0, 50));
      }
    }
    const rows = parseSekolahPayload(payload);
    allSekolah[jenjang] = rows;
    console.log(`  ${jenjang}: +${rows.length} rows`);
    await writeJson(SOURCES[jenjang].outSekolah, rows);
  }

  const combined = dedupByNpsn(
    [...allSekolah.PAUD, ...allSekolah.SD, ...allSekolah.SMP, ...allSekolah.PKBM]
  );
  const totalByJenjang = Object.fromEntries(
    Object.entries(allSekolah).map(([k, v]) => [k, v.length])
  );
  console.log('  TOTAL sekolah (uniq NPSN):', combined.length, totalByJenjang);

  console.log('== Fetching KEGIATAN ==');
  const allKeg = { PAUD: [], SD: [], SMP: [], PKBM: [] };

  for (const jenjang of Object.keys(SOURCES)) {
    const url = SOURCES[jenjang].kegiatan;
    const payload = await fetchJson(url);
    if (DEBUG) {
      console.log(`[DEBUG] [KEG ${jenjang}] typeof payload:`, typeof payload);
      if (payload && typeof payload === 'object') {
        const keys = Object.keys(payload);
        console.log(`[DEBUG] [KEG ${jenjang}] keys (count=${keys.length}):`, keys.slice(0, 50));
      }
    }
    const rows = parseKegiatanPayload(payload, jenjang);
    allKeg[jenjang] = rows;
    console.log(`  ${jenjang}: +${rows.length} kegiatan rows`);
    await writeJson(SOURCES[jenjang].outKegiatan, rows);
  }

  const combinedKeg = dedupByNpsn(
    [...allKeg.PAUD, ...allKeg.SD, ...allKeg.SMP, ...allKeg.PKBM]
  );
  const kegAgg = combinedKeg.reduce(
    (acc, r) => {
      if (r.kegiatan === 'Rehab') acc.Rehab += 1;
      else if (r.kegiatan === 'Pembangunan') acc.Pembangunan += 1;
      return acc;
    },
    { Rehab: 0, Pembangunan: 0 }
  );
  console.log('  TOTAL kegiatan uniq:', combinedKeg.length, kegAgg);

  console.log('== Fetching GEO ==');
  {
    const geok = await fetchJson(GEO.kecamatan);
    await writeJson(GEO.outKecamatan, geok);
    console.log('  kecamatan.geojson saved');
  }
  {
    const geod = await fetchJson(GEO.desa);
    await writeJson(GEO.outDesa, geod);
    console.log('  desa.geojson saved');
  }

  console.log('DONE fetch_and_merge.');
}

// Jalankan
main().catch((e) => {
  console.error('ERROR:', e?.stack || e);
  process.exitCode = 1;
});
