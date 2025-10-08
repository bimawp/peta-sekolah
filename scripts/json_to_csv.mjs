// scripts/json_to_csv.mjs
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = process.cwd();

const MERGED_DIR = path.join(ROOT, 'public', 'data', 'merged');

// Sumber lokal
const LOCAL_SOURCES = {
  PAUD: path.join(ROOT, 'public', 'paud', 'data', 'paud.json'),
  SD: path.join(ROOT, 'public', 'sd', 'data', 'sd_new.json'),
  SMP: path.join(ROOT, 'public', 'smp', 'data', 'smp.json'),
  PKBM: path.join(ROOT, 'public', 'pkbm', 'data', 'pkbm.json'),
};

const LOCAL_KEGIATAN = {
  PAUD: path.join(ROOT, 'public', 'paud', 'data', 'data_kegiatan.json'),
  SD: path.join(ROOT, 'public', 'sd', 'data', 'data_kegiatan.json'),
  SMP: path.join(ROOT, 'public', 'smp', 'data', 'data_kegiatan.json'),
  PKBM: path.join(ROOT, 'public', 'pkbm', 'data', 'data_kegiatan.json'),
};

// Sumber remote (fallback)
const REMOTE_SOURCES = {
  PAUD: 'https://peta-sekolah.vercel.app/paud/data/paud.json',
  SD: 'https://peta-sekolah.vercel.app/sd/data/sd_new.json',
  SMP: 'https://peta-sekolah.vercel.app/smp/data/smp.json',
  PKBM: 'https://peta-sekolah.vercel.app/pkbm/data/pkbm.json',
};

const REMOTE_KEGIATAN = {
  PAUD: 'https://peta-sekolah.vercel.app/paud/data/data_kegiatan.json',
  SD: 'https://peta-sekolah.vercel.app/sd/data/data_kegiatan.json',
  SMP: 'https://peta-sekolah.vercel.app/smp/data/data_kegiatan.json',
  PKBM: 'https://peta-sekolah.vercel.app/pkbm/data/data_kegiatan.json',
};

function csvEscape(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function writeCsv(filePath, rows, headers) {
  const lines = [];
  lines.push(headers.join(','));
  for (const r of rows) lines.push(headers.map(h => csvEscape(r[h])).join(','));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, lines.join('\n'), 'utf8');
  console.log(`✓ Wrote ${rows.length} rows → ${filePath}`);
}

function normalizeSekolahPayload(obj, jenjangLabel) {
  // Sumber berbentuk: { "Kecamatan A": [ {..}, ... ], "Kecamatan B": [ ... ] }
  // Flatten ke array dan tambahkan jenjang + kecamatan
  const out = [];
  for (const [kec, arr] of Object.entries(obj || {})) {
    if (!Array.isArray(arr)) continue;
    for (const it of arr) {
      out.push({
        npsn: String(it.npsn ?? '').trim(),
        name: it.name ?? '',
        address: it.address ?? it.alamat ?? '',
        village: it.village ?? it.desa ?? '',
        kecamatan: kec,
        lat: it.lat ?? it.latitude ?? '',
        lng: it.lng ?? it.longitude ?? '',
        jenjang: jenjangLabel,
        student_count: it.student_count ?? it.siswa ?? '',
        st_male: it.st_male ?? it.laki ?? '',
        st_female: it.st_female ?? it.perempuan ?? '',
      });
    }
  }
  return out;
}

function normalizeKegiatanPayload(arrLike) {
  // Sumber kegiatan berupa array of rows (kadang object-keyed index)
  // Normalisasi ke {npsn, kegiatan, lokal}
  const items = Array.isArray(arrLike)
    ? arrLike
    : (arrLike ? Object.values(arrLike) : []);

  const out = [];
  for (const it of items) {
    const npsn = String(it.npsn ?? it.NPSN ?? '').trim();
    const kegiatan =
      it.kegiatan ??
      it.Kegiatan ??
      it['Kegiatan '] ??
      it['Jenis Kegiatan'] ??
      '';
    const lokal = it.lokal ?? it.Lokal ?? it['Jumlah Lokal'] ?? '';
    if (!npsn && !kegiatan && !lokal) continue;
    out.push({ npsn, kegiatan, lokal });
  }
  return out;
}

async function loadSekolahMerged() {
  const mergedPath = path.join(MERGED_DIR, 'schools.json');
  if (await exists(mergedPath)) {
    console.log('Found merged schools.json, using it.');
    return readJson(mergedPath);
  }

  // Coba gabung dari lokal
  const jenjangs = ['PAUD', 'SD', 'SMP', 'PKBM'];
  const merged = [];
  for (const j of jenjangs) {
    if (await exists(LOCAL_SOURCES[j])) {
      const obj = await readJson(LOCAL_SOURCES[j]);
      merged.push(...normalizeSekolahPayload(obj, j));
    }
  }

  // Kalau lokal kosong, fallback fetch remote
  if (merged.length === 0) {
    console.log('Local JSON not found, fetching from remote URLs...');
    for (const j of jenjangs) {
      const url = REMOTE_SOURCES[j];
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
      const obj = await res.json();
      merged.push(...normalizeSekolahPayload(obj, j));
    }
  }

  // Simpan untuk next run
  await writeJson(mergedPath, merged);
  console.log(`Built merged schools.json with ${merged.length} rows`);
  return merged;
}

async function loadKegiatanMerged() {
  const mergedPath = path.join(MERGED_DIR, 'kegiatan.json');
  if (await exists(mergedPath)) {
    console.log('Found merged kegiatan.json, using it.');
    return readJson(mergedPath);
  }

  const jenjangs = ['PAUD', 'SD', 'SMP', 'PKBM'];
  let merged = [];

  // Coba lokal dulu
  for (const j of jenjangs) {
    if (await exists(LOCAL_KEGIATAN[j])) {
      const obj = await readJson(LOCAL_KEGIATAN[j]);
      merged = merged.concat(normalizeKegiatanPayload(obj));
    }
  }

  // Kalau kosong, fetch remote
  if (merged.length === 0) {
    console.log('Local kegiatan JSON not found, fetching from remote URLs...');
    for (const j of jenjangs) {
      const url = REMOTE_KEGIATAN[j];
      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`Skip fetch ${url}: ${res.status}`);
        continue;
      }
      const obj = await res.json();
      merged = merged.concat(normalizeKegiatanPayload(obj));
    }
  }

  await writeJson(mergedPath, merged);
  console.log(`Built merged kegiatan.json with ${merged.length} rows`);
  return merged;
}

async function convertSchools() {
  const rows = await loadSekolahMerged();

  // Buang duplikat NPSN (ambil entry pertama)
  const seen = new Set();
  const unique = [];
  for (const r of rows) {
    const key = (r.npsn || '').trim();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
  }

  // Header minimal buat import
  const headers = [
    'npsn',
    'name',
    'address',
    'village',
    'kecamatan',
    'lat',
    'lng',
    'jenjang',
    'student_count',
    'st_male',
    'st_female'
  ];

  const outFile = path.join(MERGED_DIR, 'schools.csv');
  await writeCsv(outFile, unique, headers);
}

async function convertKegiatan() {
  const rows = await loadKegiatanMerged();
  const headers = ['npsn', 'kegiatan', 'lokal'];
  const outFile = path.join(MERGED_DIR, 'kegiatan.csv');
  await writeCsv(outFile, rows, headers);
}

async function main() {
  await fs.mkdir(MERGED_DIR, { recursive: true });
  await convertSchools();
  await convertKegiatan();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
