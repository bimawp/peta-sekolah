// scripts/ingest_class_conditions_from_remote_json.mjs
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.resolve(process.cwd(), '.env') })
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  dotenv.config({ path: path.resolve(__dirname, '../.env') })
}

const svcKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_TOKEN || ''

if (!process.env.SUPABASE_URL || !svcKey) {
  console.error('[ENV ERROR] SUPABASE_URL / SERVICE ROLE KEY belum terbaca.')
  process.exit(1)
}
console.log('[ENV OK] Loaded SUPABASE_URL:', process.env.SUPABASE_URL)

import { createClient } from '@supabase/supabase-js'
import { fetch } from 'undici'
import fs from 'node:fs/promises'

const supabase = createClient(process.env.SUPABASE_URL, svcKey, { auth: { persistSession: false } })

// ------- CLI mode: --merge (default) | --replace -------
const MODE = process.argv.includes('--replace') ? 'replace' : 'merge'
console.log(`[MODE] Upsert mode = ${MODE.toUpperCase()}`)

// ------- Sumber -------
const SOURCES = [
  { jenjang: 'PAUD', name: 'paud', url: 'https://peta-sekolah.vercel.app/paud/data/paud.json' },
  { jenjang: 'SD',   name: 'sd',   url: 'https://peta-sekolah.vercel.app/sd/data/sd_new.json' },
  { jenjang: 'SMP',  name: 'smp',  url: 'https://peta-sekolah.vercel.app/smp/data/smp.json' },
  { jenjang: 'PKBM', name: 'pkbm', url: 'https://peta-sekolah.vercel.app/pkbm/data/pkbm.json' },
]

// ------- Utils -------
async function tryParseJSON(text){ try { return JSON.parse(text) } catch { return null } }

function coerceToArray(json){
  if(!json) return []
  if(Array.isArray(json)) return json
  if(Array.isArray(json.data)) return json.data
  if(Array.isArray(json.features)) return json.features.map(f=>f?.properties ?? f).filter(Boolean)
  if(Array.isArray(json.records)) return json.records
  if(Array.isArray(json.items)) return json.items
  if(typeof json === 'object'){
    const vals = Object.values(json).filter(Boolean)
    if(vals.length && vals.every(v => Array.isArray(v))) return vals.flat()
    const mostlyObjects = vals.filter(v => v && typeof v === 'object').length >= Math.ceil(vals.length*0.6)
    if(mostlyObjects) return vals
  }
  return []
}

async function fetchJSON(url, localName){
  try{
    const res = await fetch(url, {
      headers: { 'accept':'application/json,*/*;q=0.8', 'user-agent':'IngestScript/1.1' }
    })
    const text = await res.text()
    const json = await tryParseJSON(text)
    if(!json){
      console.warn(`[WARN] Respon bukan JSON dari ${url}. Preview: ${text.slice(0,200).replace(/\s+/g,' ')}…`)
      return { array: [], raw: null }
    }
    return { array: coerceToArray(json), raw: json }
  }catch(e){
    console.warn(`[WARN] Gagal fetch ${url}: ${e.message}`)
  }
  try{
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const p = path.resolve(__dirname, `../data/${localName}.json`)
    const text = await fs.readFile(p, 'utf-8')
    const json = await tryParseJSON(text)
    if(!json) throw new Error('file lokal bukan JSON valid')
    console.log(`[INFO] Pakai file lokal data/${localName}.json`)
    return { array: coerceToArray(json), raw: json }
  }catch{
    return { array: [], raw: null }
  }
}

function numDeep(v, def = 0) {
  if (v == null) return def
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d\-.,]/g, '').replace(/\./g, '').replace(',', '.')
    const n = Number.parseFloat(cleaned)
    return Number.isFinite(n) ? n : def
  }
  if (typeof v === 'object') {
    const keys = ['value','jumlah','total','count','val','num','n']
    for (const k of keys) {
      if (v[k] != null) return numDeep(v[k], def)
    }
  }
  return def
}
function pick(obj, keys, def = 0) {
  if (!obj) return def
  for (const k of keys) {
    if (obj[k] != null) return numDeep(obj[k], def)
    const alt = Object.keys(obj).find(kk => kk.toLowerCase() === k.toLowerCase())
    if (alt) return numDeep(obj[alt], def)
  }
  return def
}

// ------- Deep-search detection -------
function hasConditionShape(obj) {
  if (!obj || typeof obj !== 'object') return false
  const keys = Object.keys(obj).map(k => k.toLowerCase())
  const hits = [
    'baik','good','sedang','moderate','berat','heavy',
    'total_room','total','jumlah_ruang','total_kelas',
    'kurang_rkb','kebutuhan_rkb','lacking_rkb','rkb'
  ]
  return hits.some(h => keys.includes(h))
}
function findConditionRoot(obj, maxDepth = 6) {
  const stack = [{ node: obj, depth: 0 }]
  while (stack.length) {
    const { node, depth } = stack.pop()
    if (!node || typeof node !== 'object') continue
    if (hasConditionShape(node)) return node
    if (depth >= maxDepth) continue
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') stack.push({ node: v, depth: depth + 1 })
    }
  }
  return null
}

// ------- Mapper kondisi -------
function mapArrayOfRooms(arr) {
  let baik=0, sedang=0, berat=0
  for (const r of arr) {
    const label = String(r.kondisi ?? r.condition ?? r.status ?? r.kategori ?? '').toLowerCase()
    const val = numDeep(r.jumlah ?? r.total ?? r.count ?? 1, 1) // default 1 ruang per item
    if (/baik|good/.test(label)) baik += val
    else if (/sedang|moderate/.test(label)) sedang += val
    else if (/berat|heavy/.test(label)) berat += val
  }
  return { good: baik, mod: sedang, heavy: berat, kurang: 0, total: baik+sedang+berat }
}

function mapClassConditions(item) {
  const candidates = [
    item.class_condition,
    item.class_conditions,
    item.kondisi_kelas,
    item.kondisi_ruang,
    item.rgks,                 // <— tambahan penting
    item.ruang_kelas,
    item.classrooms,
    item.rooms,
    item.kelas,
    item.raw?.class_condition,
    item.raw?.class_conditions,
    item.raw?.kondisi_kelas,
    item.raw?.kondisi_ruang,
    item.raw?.rgks,            // <— tambahan penting
    item.properties?.class_condition,
    item.properties?.kondisi_kelas,
    item.properties?.rgks,
    item
  ].filter(Boolean)

  // Jika kandidat array of rooms
  for (const c of candidates) {
    if (Array.isArray(c) && c.length && typeof c[0] === 'object' && ('kondisi' in c[0] || 'condition' in c[0] || 'status' in c[0])) {
      return mapArrayOfRooms(c)
    }
  }

  let ccRoot = candidates.find(hasConditionShape)
  if (!ccRoot) ccRoot = findConditionRoot(item, 6) || item

  // CASE: array [{kondisi:'Baik', jumlah:...}, ...]
  if (Array.isArray(ccRoot)) return mapArrayOfRooms(ccRoot)

  // CASE: object { baik/sedang/berat/total/kurang_rkb }
  const good   = pick(ccRoot, ['baik','classrooms_good','jumlah_baik','kondisi_baik','baik_ruang','good'], 0)
  const mod    = pick(ccRoot, ['sedang','rusak_sedang','classrooms_moderate_damage','jumlah_sedang','kondisi_sedang','moderate'], 0)
  const heavy  = pick(ccRoot, ['berat','rusak_berat','classrooms_heavy_damage','jumlah_berat','kondisi_berat','heavy'], 0)
  const kurang = pick(ccRoot, ['kurang_rkb','kebutuhan_rkb','rkb_kurang','lacking_rkb','rkb','kebutuhan'], 0)
  const totalCandidate = pick(ccRoot, ['total_room','total','jumlah_ruang','total_kelas'], null)
  const total = (totalCandidate != null && totalCandidate !== 0) ? totalCandidate : (good + mod + heavy)
  return { good, mod, heavy, kurang, total }
}

function extractNpsn(item) {
  const candidates = [
    item.npsn, item.NPSN, item.kode, item.kode_sekolah,
    item.raw?.npsn, item.raw?.NPSN, item.raw?.kode, item.raw?.kode_sekolah,
    item.properties?.npsn, item.properties?.NPSN,
  ]
  for (const c of candidates) {
    const v = String(c ?? '').trim()
    if (v) return v
  }
  return null
}

// ------- Supabase helpers -------
async function loadNpsnToIdMap(){
  const map=new Map()
  let from=0, step=1000
  while(true){
    const {data,error}=await supabase.from('schools').select('id,npsn').order('id',{ascending:true}).range(from,from+step-1)
    if(error) throw error
    if(!data?.length) break
    for(const r of data) if(r.npsn) map.set(r.npsn, r.id)
    if(data.length<step) break
    from+=step
  }
  return map
}

// MERGE: insert baru, atau update yang ada — tanpa menghapus baris lain
async function upsertMerge(rows){
  const batchSize=500
  for(let i=0;i<rows.length;i+=batchSize){
    const chunk = rows.slice(i,i+batchSize).map(r=>({
      school_id:r.school_id,
      classrooms_good:r.good,
      classrooms_moderate_damage:r.mod,
      classrooms_heavy_damage:r.heavy,
      total_room:r.total,
      lacking_rkb:r.kurang,
      updated_at:new Date().toISOString(),
    }))
    const { error } = await supabase
      .from('class_conditions')
      .upsert(chunk, { onConflict: 'school_id' })
    if(error) throw error
    process.stdout.write(`• UPSERT (merge): ${Math.min(i+batchSize, rows.length)}/${rows.length}\r`)
  }
  console.log('\nSelesai upsert (merge) class_conditions')
}

// REPLACE: hapus lalu insert ulang untuk school_id yang ada di batch (gunakan kalau sumber lengkap)
async function upsertReplace(rows){
  if(!rows.length) return
  const schoolIds=[...new Set(rows.map(r=>r.school_id))]
  const { error:delErr } = await supabase.from('class_conditions').delete().in('school_id', schoolIds)
  if(delErr) throw delErr

  const batchSize=500
  for(let i=0;i<rows.length;i+=batchSize){
    const chunk = rows.slice(i,i+batchSize).map(r=>({
      school_id:r.school_id,
      classrooms_good:r.good,
      classrooms_moderate_damage:r.mod,
      classrooms_heavy_damage:r.heavy,
      total_room:r.total,
      lacking_rkb:r.kurang,
      updated_at:new Date().toISOString(),
    }))
    const { error } = await supabase.from('class_conditions').insert(chunk)
    if(error) throw error
    process.stdout.write(`• Insert (replace): ${Math.min(i+batchSize, rows.length)}/${rows.length}\r`)
  }
  console.log('\nSelesai insert (replace) class_conditions')
}

// ------- MAIN -------
async function main(){
  const npsnMap = await loadNpsnToIdMap()
  const rows=[]

  for(const src of SOURCES){
    const { array } = await fetchJSON(src.url, src.name)
    console.log(`[INFO] ${src.jenjang}: fetched ${array.length} record`)
    if(!array?.length){
      console.warn(`[WARN] Tidak ada data terpakai dari ${src.url}.`)
      continue
    }
    let usedHere=0
    for(const it of array){
      const npsn=extractNpsn(it); if(!npsn) continue
      const school_id = npsnMap.get(npsn); if(!school_id) continue
      const cc = mapClassConditions(it)

      // skip baris nol total dan nol kurang_rkb (agar tidak menimpa data lama)
      if ((cc.good + cc.mod + cc.heavy) === 0 && cc.kurang === 0) {
        if (!globalThis.__dbg0) globalThis.__dbg0 = 0
        if (globalThis.__dbg0 < 3) {
          console.warn('[DBG] Lewati karena nol total & kurang_rkb | NPSN:', npsn, '| keys:', Object.keys(it))
          globalThis.__dbg0++
        }
        continue
      }

      rows.push({ school_id, good: cc.good, mod: cc.mod, heavy: cc.heavy, total: cc.total, kurang: cc.kurang })
      usedHere++
    }
    console.log(`[INFO] ${src.jenjang}: terpakai ${usedHere} baris (kumulatif ${rows.length})`)
  }

  if(!rows.length) throw new Error('Tidak ada baris class_conditions yang bisa diinsert.')

  console.log(`Total class_conditions siap di-upsert: ${rows.length}`)
  if (MODE === 'replace') {
    await upsertReplace(rows)
  } else {
    await upsertMerge(rows)
  }

  // Validasi agregat
  const { data, error } = await supabase
    .from('class_conditions')
    .select('classrooms_good,classrooms_moderate_damage,classrooms_heavy_damage,lacking_rkb')
  if(error) throw error
  const sum = data.reduce((a,r)=>({
    good: a.good + (r.classrooms_good||0),
    mod:  a.mod  + (r.classrooms_moderate_damage||0),
    heavy:a.heavy+ (r.classrooms_heavy_damage||0),
    kurang:a.kurang + (r.lacking_rkb||0)
  }), {good:0,mod:0,heavy:0,kurang:0})
  const total = sum.good + sum.mod + sum.heavy
  console.log('Ringkasan setelah upsert:', {
    baik:sum.good, rusak_sedang:sum.mod, rusak_berat:sum.heavy, kurang_rkb:sum.kurang, total_kelas:total
  })
  console.log('✅ Selesai.')
}

main().catch(e=>{ console.error('ERROR:', e); process.exit(1) })
