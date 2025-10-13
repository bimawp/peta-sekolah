// scripts/upsert_from_public_all.mjs
// Fast path: BULK load semua jenjang dari public/data/*.json ke Supabase.
// - Kumpulkan semua row per tabel, lalu delete sekali per tabel (school_id IN (...)) atau UPSERT.
// - Insert per-batch untuk menghindari payload terlalu besar (mis. 500/bar).
// - Normalisasi NPSN, coalesce patch (supaya schools tak ketimpa null).
// - Agregasi kegiatan semua jenjang dan UPSERT (delete-then-insert per sekolah, tapi dilakukan sekali).

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const root       = path.resolve(__dirname, '..');
const pubDir     = path.join(root, 'public');
const dataDir    = path.join(pubDir, 'data');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !/^https:\/\/.+\.supabase\.co$/.test(SUPABASE_URL)) throw new Error(`SUPABASE_URL invalid: "${SUPABASE_URL}"`);
if (!SERVICE_ROLE || SERVICE_ROLE.length < 40) throw new Error('SUPABASE_SERVICE_ROLE missing/too short');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// ---------- utils ----------
const exists = (p)=>{ try{ fs.accessSync(p, fs.constants.R_OK); return true; } catch { return false; } };
const load   = (p)=> JSON.parse(fs.readFileSync(p,'utf8'));
const int    = (v,d=0)=>{ const n=Number(v); return Number.isFinite(n)?n:d; };
const normNpsn = (x)=> String(x ?? '').replace(/\D/g,'').trim();
const truthy   = (x)=> x!==undefined && x!==null && x!=='';
const coalescePatch = (obj)=> { const o={}; for (const [k,v] of Object.entries(obj)) if (truthy(v)) o[k]=v; return o; };
const chunk = (arr, size=500)=> { const out=[]; for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i, i+size)); return out; };

// ---------- load JSON ----------
function flattenJenjangDictFile(filePath, jenjang){
  if (!exists(filePath)) return [];
  const j = load(filePath);
  if (!j || typeof j!=='object' || Array.isArray(j)) return [];
  const rows=[];
  for (const [kec, arr] of Object.entries(j)) {
    if (!Array.isArray(arr)) continue;
    for (const it of arr) rows.push({ ...it, _kecamatan_from_key:kec, _jenjang:jenjang });
  }
  return rows;
}
function loadAllSchoolsFromPublic(){
  const SMP  = flattenJenjangDictFile(path.join(dataDir,'smp.json'   ), 'SMP');
  const SD   = flattenJenjangDictFile(path.join(dataDir,'sd_new.json'), 'SD');
  const PAUD = flattenJenjangDictFile(path.join(dataDir,'paud.json'  ), 'PAUD');
  const PKBM = flattenJenjangDictFile(path.join(dataDir,'pkbm.json'  ), 'PKBM');
  const all=[...SMP,...SD,...PAUD,...PKBM];
  console.log('Loaded schools:', {SMP:SMP.length, SD:SD.length, PAUD:PAUD.length, PKBM:PKBM.length, total:all.length});
  return all;
}
function loadAllKegiatan(){
  const files = [
    'data_kegiatan_smp.json',
    'data_kegiatan_sd.json',
    'data_kegiatan_paud.json',
    'data_kegiatan_pkbm.json',
    'data_kegiatan.json', // gabungan sebagian
  ].map(f=>path.join(dataDir,f)).filter(exists);
  console.log('Kegiatan files found:', files.map(p=>path.relative(root,p)));
  const rows=[];
  for (const p of files){
    const j=load(p);
    if (Array.isArray(j)) rows.push(...j);
    else if (j && typeof j==='object'){
      for (const [k,v] of Object.entries(j)){
        if (v?.rehab)       rows.push({ npsn:k, kegiatan:'Rehab',       lokal:v.rehab });
        if (v?.pembangunan) rows.push({ npsn:k, kegiatan:'Pembangunan', lokal:v.pembangunan });
      }
    }
  }
  return rows;
}

// ---------- DB helpers ----------
async function getSchoolIdsByNpsn(npsnList){
  const uniq = Array.from(new Set(npsnList.filter(Boolean)));
  const out = new Map();
  // Supabase filter `in` limit: chunk
  for (const part of chunk(uniq, 500)) {
    const { data, error } = await supabase.from('schools').select('id,npsn').in('npsn', part);
    if (error) throw error;
    for (const r of (data||[])) out.set(r.npsn, r.id);
  }
  return out;
}
async function bulkUpdateSchools(patchesByNpsn){
  // ambil dulu id
  const npsns = Array.from(patchesByNpsn.keys());
  const ids = await getSchoolIdsByNpsn(npsns);
  let ok=0;
  for (const part of chunk(npsns, 500)){
    const payload=[];
    for (const npsn of part){
      const id = ids.get(npsn);
      if (!id) continue;
      const patch = coalescePatch(patchesByNpsn.get(npsn));
      if (Object.keys(patch).length) payload.push({ id, ...patch });
    }
    if (!payload.length) continue;
    const { error } = await supabase.from('schools').upsert(payload, { onConflict:'id' });
    if (error) throw error;
    ok += payload.length;
  }
  console.log('Schools updated:', ok);
}

// Generic: replace rows for a set of school_ids (delete IN (...) once, then bulk insert)
async function bulkReplace(table, rows, key = 'school_id'){
  if (!rows.length) return;
  const ids = Array.from(new Set(rows.map(r=>r[key]).filter(Boolean)));
  // delete once per table
  for (const part of chunk(ids, 1000)){
    const { error: eDel } = await supabase.from(table).delete().in(key, part);
    if (eDel) throw eDel;
  }
  // insert in chunks
  for (const part of chunk(rows, 500)){
    const { error: eIns } = await supabase.from(table).insert(part);
    if (eIns) throw eIns;
  }
  console.log(`Replaced ${rows.length} rows into ${table} (schools: ${ids.length})`);
}

// Generic: upsert rows with onConflict (no delete)
async function bulkUpsert(table, rows, onConflict){
  if (!rows.length) return;
  for (const part of chunk(rows, 500)){
    const { error } = await supabase.from(table).upsert(part, { onConflict });
    if (error) throw error;
  }
  console.log(`Upserted ${rows.length} rows into ${table} (conflict: ${onConflict})`);
}

// ---------- Mappers ----------
function mapClassConditions(obj){
  const c=obj.class_condition; if (!c) return null;
  return {
    classrooms_good:int(c.classrooms_good,0),
    classrooms_moderate_damage:int(c.classrooms_moderate_damage,0),
    classrooms_heavy_damage:int(c.classrooms_heavy_damage,0),
    total_room:int(c.total_room,0),
    lacking_rkb:int(c.lacking_rkb,0),
  };
}
function mapLibrary(obj){
  const lib=obj.library; if (!lib) return null;
  const good=int(lib.good,0), mod=int(lib.moderate_damage,0), heavy=int(lib.heavy_damage,0);
  return { good, moderate_damage:mod, heavy_damage:heavy, total: lib.total!=null?int(lib.total,0):good+mod+heavy };
}
function mapLabs(obj){
  const pairs=[['Komputer','laboratory_comp'],['Bahasa','laboratory_langua'],['IPA','laboratory_ipa'],['Fisika','laboratory_fisika'],['Biologi','laboratory_biologi']];
  const out=[];
  for (const [label,key] of pairs){
    const o=obj[key]; if (!o) continue;
    const good=int(o.good,0), mod=int(o.moderate_damage,0), heavy=int(o.heavy_damage,0);
    out.push({ lab_type:label, good, moderate_damage:mod, heavy_damage:heavy, total_all: o.total_all!=null?int(o.total_all,0):good+mod+heavy, total_mh:o.total_mh!=null?int(o.total_mh,0):mod+heavy });
  }
  return out;
}
function mapTeacherRooms(obj){
  const pairs=[['Kepala Sekolah','kepsek_room'],['Guru','teacher_room'],['Tata Usaha','administration_room']];
  const out=[];
  for (const [label,key] of pairs){
    const o=obj[key]; if (!o) continue;
    const good=int(o.good,0), mod=int(o.moderate_damage,0), heavy=int(o.heavy_damage,0);
    out.push({ room_type:label, good, moderate_damage:mod, heavy_damage:heavy, total_all:o.total_all!=null?int(o.total_all,0):good+mod+heavy, total_mh:o.total_mh!=null?int(o.total_mh,0):mod+heavy });
  }
  return out;
}
function mapToilets(obj, jenjang){
  const out=[];
  if (jenjang==='SMP'){
    const pairs=[['Guru',obj.teachers_toilet],['Siswa',obj.students_toilet]];
    for (const [type,val] of pairs){
      if (!val) continue;
      const overall = val._overall || { good:int(val.male?.good,0)+int(val.female?.good,0), moderate_damage:int(val.male?.moderate_damage,0)+int(val.female?.moderate_damage,0), heavy_damage:int(val.male?.heavy_damage,0)+int(val.female?.heavy_damage,0), total:int(val.male?.total_mh,0)+int(val.female?.total_mh,0) };
      out.push({
        type,
        male:int(val.male?.total_all,0),
        female:int(val.female?.total_all,0),
        good:int(overall.good,0),
        moderate_damage:int(overall.moderate_damage,0),
        heavy_damage:int(overall.heavy_damage,0),
        total:int(overall.total,0),
      });
    }
  } else {
    const t=obj.toilets;
    if (t){
      const good=int(t.good,0), mod=int(t.moderate_damage,0), heavy=int(t.heavy_damage,0);
      out.push({ type:'Siswa', male:0, female:0, good, moderate_damage:mod, heavy_damage:heavy, total: t.total!=null?int(t.total,0):good+mod+heavy });
    }
  }
  return out;
}
function mapFurniture(obj, jenjang){
  if (jenjang==='SMP'){
    const fc=obj.furniture_computer; if (!fc) return null;
    return { tables:int(fc.tables,0), chairs:int(fc.chairs,0), boards:int(fc.boards,0), computer:int(fc.computer,0) };
  } else if (jenjang==='SD'){
    const f=obj.furniture; if (!f) return null;
    return { tables:int(f.tables?.total,0), chairs:int(f.chairs?.total,0), boards:0, computer:0 };
  }
  return null;
}
function mapOfficialResidences(obj){
  const o=obj.official_residences; if (!o) return null;
  return { total:int(o.total,0), good:int(o.good,0), moderate_damage:int(o.moderate_damage,0), heavy_damage:int(o.heavy_damage,0) };
}
function mapPaudExtras(obj){
  const out={};
  if (obj.ape){
    out.ape=[];
    for (const [loc,v] of Object.entries(obj.ape)){
      out.ape.push({ location:loc, available:String(v?.available??''), n_available:String(v?.n_available??''), condition:String(v?.condition??'') });
    }
  }
  if (obj.playground_area){
    out.playground_area={ available:String(obj.playground_area.available??''), n_available:String(obj.playground_area.n_available??'') };
  }
  if (obj.uks){
    out.uks={ available:String(obj.uks.available??''), n_available:String(obj.uks.n_available??'') };
  }
  if (obj.building_status){
    const t=obj.building_status.tanah||{}, g=obj.building_status.gedung||{};
    out.building_status={
      tanah_yayasan:String(t.yayasan??''), tanah_hibah:String(t.hibah??''), tanah_pribadi:String(t.pribadi??''),
      land_available: t.land_available!=null?Number(t.land_available):null,
      gedung_yayasan:String(g.yayasan??''), gedung_hibah:String(g.hibah??''), gedung_sewa:String(g.sewa??''), gedung_menumpang:String(g.menumpang??'')
    };
  }
  return out;
}

// ---------- MAIN ----------
async function main(){
  console.log('== upsert_from_public_all.mjs (FAST) ==');

  // 1) load semua sekolah (flatten)
  const all = loadAllSchoolsFromPublic();

  // 2) build patches for schools (update-only)
  const patches = new Map(); // npsn -> patch object
  for (const r of all){
    const npsn = normNpsn(r.npsn); if (!npsn) continue;
    const patch = coalescePatch({
      name: r.name ?? r.nama,
      address: r.address ?? r.alamat,
      village: r.village ?? r.desa,
      kecamatan: r.kecamatan ?? r._kecamatan_from_key,
      student_count: r.student_count!=null ? int(r.student_count,0) : undefined,
      lat: r.coordinates?.[0] ?? r.lat ?? r.latitude,
      lng: r.coordinates?.[1] ?? r.lng ?? r.longitude,
      level: r._jenjang ?? r.jenjang ?? r.level,
      type: r.type ?? r.status,
    });
    if (Object.keys(patch).length) patches.set(npsn, patch);
  }
  await bulkUpdateSchools(patches);

  // 3) Map NPSN -> school_id sekali saja
  const npsnList = Array.from(new Set(all.map(r=>normNpsn(r.npsn)).filter(Boolean)));
  const idMap = await getSchoolIdsByNpsn(npsnList);

  // 4) Kumpulkan SEMUA ROW per tabel (bulk arrays)
  const rows_class = [];
  const rows_library = [];
  const rows_lab = [];
  const rows_tr = [];
  const rows_toilet = [];
  const rows_fc = [];
  const rows_offres = [];
  const rows_ape = [];
  const rows_play = [];
  const rows_uks = [];
  const rows_build = [];

  for (const r of all){
    const npsn = normNpsn(r.npsn);
    const school_id = idMap.get(npsn);
    if (!school_id) continue;
    const jenjang = r._jenjang;

    const c = mapClassConditions(r); if (c) rows_class.push({ school_id, ...c });
    const lib = mapLibrary(r);       if (lib) rows_library.push({ school_id, ...lib });
    const labs = mapLabs(r);         if (labs?.length) rows_lab.push(...labs.map(x=>({ school_id, ...x })));
    const trs = mapTeacherRooms(r);  if (trs?.length) rows_tr.push(...trs.map(x=>({ school_id, ...x })));
    const tts = mapToilets(r, jenjang); if (tts?.length) rows_toilet.push(...tts.map(x=>({ school_id, ...x })));
    const fc  = mapFurniture(r, jenjang); if (fc) rows_fc.push({ school_id, ...fc });
    const ofr = mapOfficialResidences(r); if (ofr) rows_offres.push({ school_id, ...ofr });

    if (jenjang==='PAUD'){
      const ex = mapPaudExtras(r);
      if (ex.ape?.length) rows_ape.push(...ex.ape.map(x=>({ school_id, ...x })));
      if (ex.playground_area) rows_play.push({ school_id, ...ex.playground_area });
      if (ex.uks) rows_uks.push({ school_id, ...ex.uks });
      if (ex.building_status) rows_build.push({ school_id, ...ex.building_status });
    }
  }

  // 5) BULK write (lebih cepat)
  // Gunakan replace (delete IN (...) + insert) supaya idempotent & bersih.
  await bulkReplace('class_conditions', rows_class);
  await bulkReplace('library', rows_library);
  // Laboratory & teacher_room cocok pakai upsert jika ada unique index:
  //   create unique index on laboratory(school_id, lab_type);
  //   create unique index on teacher_room(school_id, room_type);
  // Kalau belum ada, pakai replace juga:
  await bulkReplace('laboratory', rows_lab);
  await bulkReplace('teacher_room', rows_tr);
  await bulkReplace('toilets', rows_toilet);
  await bulkReplace('furniture_computer', rows_fc);
  await bulkReplace('official_residences', rows_offres);
  await bulkReplace('ape', rows_ape);
  await bulkReplace('playground_area', rows_play);
  await bulkReplace('uks', rows_uks);
  await bulkReplace('building_status', rows_build);

  // 6) Kegiatan: agregasi per NPSN → per school_id, delete once via IN, lalu insert bulk
  const kegRaw = loadAllKegiatan();
  console.log('Kegiatan rows loaded:', kegRaw.length);
  // agregasi
  const agg = new Map(); // school_id -> {rehab, pembangunan}
  for (const r of kegRaw){
    const npsn = normNpsn(r.npsn); if (!npsn) continue;
    const sid = idMap.get(npsn); if (!sid) continue;
    const k = String(r.kegiatan ?? r.Kegiatan ?? '').toLowerCase();
    const lokal = int(r.lokal ?? r.Lokal, 0);
    const cur = agg.get(sid) || { rehab:0, pembangunan:0 };
    if (k.includes('rehab')) cur.rehab += lokal;
    else if (k.includes('bangun')) cur.pembangunan += lokal;
    agg.set(sid, cur);
  }
  const kegRows = [];
  for (const [sid, v] of agg.entries()){
    if (v.rehab>0) kegRows.push({ school_id:sid, kegiatan:'Rehab', lokal:v.rehab });
    if (v.pembangunan>0) kegRows.push({ school_id:sid, kegiatan:'Pembangunan', lokal:v.pembangunan });
  }
  // replace kegiatan (delete IN (...) + insert bulk)
  const kegIds = Array.from(agg.keys());
  for (const part of chunk(kegIds, 1000)){
    const { error:eDel } = await supabase.from('kegiatan').delete().in('school_id', part);
    if (eDel) throw eDel;
  }
  for (const part of chunk(kegRows, 500)){
    const { error:eIns } = await supabase.from('kegiatan').insert(part);
    if (eIns) throw eIns;
  }
  console.log(`Replaced kegiatan rows: ${kegRows.length} (schools: ${kegIds.length})`);

  console.log('DONE (FAST).');
}

main().catch(e=>{ console.error(e); process.exit(1); });
