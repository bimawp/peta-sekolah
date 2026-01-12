// ESM - membersihkan CSV kegiatan dari baris rusak (mis. "222") & memastikan header/tipe valid.
import fs from 'node:fs';
import path from 'node:path';

const inPath = path.resolve('out', 'kegiatan_temp.csv');
const outPath = path.resolve('out', 'kegiatan_clean.csv');

if (!fs.existsSync(inPath)) {
  console.error('[sanitize] File not found:', inPath);
  process.exit(1);
}

const raw = fs.readFileSync(inPath, 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\uFEFF/g, '');

const lines = raw.split('\n');
if (lines.length === 0) {
  console.error('[sanitize] CSV empty:', inPath);
  process.exit(1);
}

const header = lines[0].trim();
const cols = header.split(',').map(s => s.trim().toLowerCase());
if (!cols.includes('npsn') || !cols.includes('kegiatan') || !cols.includes('lokal')) {
  console.error('[sanitize] Header invalid. Harus mengandung: npsn,kegiatan,lokal');
  console.error('  Found header:', header);
  process.exit(1);
}

const idxNpsn = cols.indexOf('npsn');
const idxKeg  = cols.indexOf('kegiatan');
const idxLkl  = cols.indexOf('lokal');

const outLines = ['npsn,kegiatan,lokal'];
let kept = 0, dropped = 0;

for (let i = 1; i < lines.length; i++) {
  const line = (lines[i] || '').trim();
  if (!line) { dropped++; continue; }
  const parts = line.split(',').map(s => s.trim());
  if (parts.length < 3) { dropped++; continue; }

  const npsn = parts[idxNpsn] || '';
  const kegiatan = parts[idxKeg] || '';
  const lokalStr = parts[idxLkl] || '';

  if (!/^\d{5,}$/.test(npsn)) { dropped++; continue; }
  const lokal = Number(lokalStr);
  if (!Number.isFinite(lokal)) { dropped++; continue; }

  outLines.push([npsn, kegiatan, String(lokal)].join(','));
  kept++;
}

fs.writeFileSync(outPath, outLines.join('\n'), 'utf8');
console.log(`[sanitize] kept=${kept}, dropped=${dropped}, out=${outPath}`);
if (kept === 0) {
  console.warn('[sanitize] WARNING: no valid rows kept. Cek input CSV.');
}
