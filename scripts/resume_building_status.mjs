import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ---- setup path
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const root       = path.resolve(__dirname, '..');
const dataDir    = path.join(root, 'public', 'data');

// ---- env guard
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !/^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL)) throw new Error(`SUPABASE_URL invalid: "${SUPABASE_URL}"`);
if (!SERVICE_ROLE || SERVICE_ROLE.length < 40) throw new Error('SUPABASE_SERVICE_ROLE missing/too short');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// ---- utils
const exists = (p)=>{ try { fs.accessSync(p, fs.constants.R_OK); return true; } catch { return false; } };
const load   = (p)=> JSON.parse(fs.readFileSync(p,'utf8'));
const normNpsn = (x)=> String(x ?? '').replace(/\D/g,'').trim();
const chunk  = (arr,size=100)=> { const out=[]; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size)); return out; };

async function getSchoolIdsByNpsn(npsnList){
  const uniq = Array.from(new Set(npsnList.filter(Boolean)));
  const out = new Map();
  for (let i=0;i<uniq.length;i+=500){
    const part = uniq.slice(i,i+500);
    const { data, error } = await supabase.from('schools').select('id,npsn').in('npsn', part);
    if (error) throw error;
    for (const r of (data||[])) out.set(r.npsn, r.id);
  }
  return out;
}

function mapPaudBuildingStatus(obj){
  if (!obj?.building_status) return null;
  const t = obj.building_status.tanah || {};
  const g = obj.building_status.gedung || {};
  return {
    tanah_yayasan: String(t.yayasan ?? ''),
    tanah_hibah: String(t.hibah ?? ''),
    tanah_pribadi: String(t.pribadi ?? ''),
    land_available: t.land_available != null ? Number(t.land_available) : null,
    gedung_yayasan: String(g.yayasan ?? ''),
    gedung_hibah: String(g.hibah ?? ''),
    gedung_sewa: String(g.sewa ?? ''),
    gedung_menumpang: String(g.menumpang ?? ''),
  };
}

async function withRetry(fn, retries=3, baseMs=800){
  let last;
  for (let i=0;i<=retries;i++){
    try { return await fn(); }
    catch (e) {
      last = e;
      if (i===retries) throw e;
      const wait = baseMs * Math.pow(2, i);
      console.warn(`Retry in ${wait}ms due to: ${e.message||e}`);
      await new Promise(r=>setTimeout(r, wait));
    }
  }
  throw last;
}

async function main(){
  console.log('== resume_building_status.mjs ==');
  const paudPath = path.join(dataDir, 'paud.json');
  if (!exists(paudPath)) { console.log('public/data/paud.json not found'); return; }

  const raw = load(paudPath);
  const rows = [];
  for (const [kec, arr] of Object.entries(raw)){
    if (!Array.isArray(arr)) continue;
    for (const r of arr){
      const npsn = normNpsn(r.npsn);
      if (!npsn) continue;
      const bs = mapPaudBuildingStatus(r);
      if (bs) rows.push({ npsn, ...bs });
    }
  }
  console.log('PAUD building_status candidate rows:', rows.length);
  if (!rows.length) return;

  const idMap = await getSchoolIdsByNpsn(rows.map(r=>r.npsn));
  const toWrite = rows.map(r => ({ school_id: idMap.get(r.npsn), ...r })).filter(r=>r.school_id);

  // delete IN (...) sekali, lalu insert per chunk kecil (100) + retry
  const ids = Array.from(new Set(toWrite.map(r=>r.school_id)));
  for (let i=0;i<ids.length;i+=700){
    const part = ids.slice(i,i+700);
    await withRetry(()=>supabase.from('building_status').delete().in('school_id', part));
  }
  let written = 0;
  for (const part of chunk(toWrite, 100)){
    await withRetry(()=>supabase.from('building_status').insert(
      part.map(({npsn, ...cols})=>cols) // buang npsn field bayangan
    ));
    written += part.length;
  }
  console.log('Inserted building_status rows:', written, '(schools:', ids.length, ')');
  console.log('DONE resume_building_status.mjs');
}

main().catch(e=>{ console.error(e); process.exit(1); });
