// supabase/functions/ingest/index.ts
// Endpoint POST untuk ingest data dari sistem lain.
// Auth header: x-ingest-token (secret). Upsert idempotent.
// Payload mendukung bentuk flatten:
// {
//   "schools":[...],
//   "class_conditions":[...],
//   "kegiatan":[...]
// }
// atau combined:
// { "rows":[ { "school":{...}, "class_conditions":{...}, "kegiatan":[...] }, ... ] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type SchoolRow = {
  npsn: string | number
  name: string
  level: string
  kecamatan?: string | null
  village?: string | null
  student_count?: number | null
  latitude?: number | string | null
  longitude?: number | string | null
  type?: string | null
}

type ClassCondRow = {
  npsn: string | number
  classrooms_good?: number | null
  classrooms_moderate_damage?: number | null
  classrooms_heavy_damage?: number | null
  lacking_rkb?: number | null
}

type KegiatanRow = {
  npsn: string | number
  kegiatan: string
  lokal: number
}

type IngestPayload =
  | { schools?: SchoolRow[]; class_conditions?: ClassCondRow[]; kegiatan?: KegiatanRow[] }
  | { rows?: { school: SchoolRow; class_conditions?: ClassCondRow; kegiatan?: KegiatanRow[] }[] }

const ok = (data: unknown, init: number = 200) =>
  new Response(JSON.stringify(data), { status: init, headers: { 'content-type': 'application/json' } })

const bad = (msg: string, init: number = 400) =>
  ok({ error: msg }, init)

function env(name: string): string {
  const v = Deno.env.get(name)
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

function tokenFrom(req: Request): string | null {
  const h = req.headers.get('x-ingest-token')
  return h ? h.trim() : null
}

function s(x: unknown): string { return String(x ?? '').trim() }
function n(x: unknown): number { const v = Number(x ?? 0); return Number.isFinite(v) ? v : 0 }
function f(x: unknown): number | null {
  if (x === null || x === undefined || x === '') return null
  const v = Number(x); return Number.isFinite(v) ? v : null
}

async function upsertSchools(supabase: ReturnType<typeof createClient>, schools: SchoolRow[]) {
  if (!schools?.length) return { map: new Map<string, number>(), count: 0 }

  const rows = schools.map((r) => ({
    npsn: s(r.npsn),
    name: s(r.name),
    level: s(r.level).toUpperCase(), // PAUD/SD/SMP/PKBM
    kecamatan: s(r.kecamatan),
    village: s(r.village),
    student_count: n(r.student_count),
    latitude: f(r.latitude),
    longitude: f(r.longitude),
    type: r.type ?? null,
  }))

  const { data, error } = await supabase
    .from('schools')
    .upsert(rows, { onConflict: 'npsn' })
    .select('id,npsn')

  if (error) throw error

  const map = new Map<string, number>()
  for (const r of data || []) map.set(s(r.npsn), r.id as number)
  return { map, count: data?.length ?? 0 }
}

async function upsertClassConditions(
  supabase: ReturnType<typeof createClient>,
  ccRows: ClassCondRow[],
  m: Map<string, number>
) {
  if (!ccRows?.length) return 0
  const rows = ccRows.map((c) => {
    const id = m.get(s(c.npsn)); if (!id) return null
    return {
      school_id: id,
      classrooms_good: n(c.classrooms_good),
      classrooms_moderate_damage: n(c.classrooms_moderate_damage),
      classrooms_heavy_damage: n(c.classrooms_heavy_damage),
      lacking_rkb: n(c.lacking_rkb),
    }
  }).filter(Boolean) as any[]

  if (!rows.length) return 0
  const { error } = await supabase.from('class_conditions').upsert(rows, { onConflict: 'school_id' })
  if (error) throw error
  return rows.length
}

function sanitizeKegiatan(x: string): 'Rehab' | 'Pembangunan RKB' | null {
  const v = s(x).toLowerCase()
  if (!v) return null
  if (v.startsWith('rehab')) return 'Rehab'
  if (v.startsWith('pembangun')) return 'Pembangunan RKB'
  return null
}

async function upsertKegiatan(
  supabase: ReturnType<typeof createClient>,
  kegRows: KegiatanRow[],
  m: Map<string, number>
) {
  if (!kegRows?.length) return { kept: 0, dropped: 0 }
  const rows:any[] = []; let dropped = 0
  for (const r of kegRows) {
    const id = m.get(s(r.npsn))
    const kegiatan = sanitizeKegiatan(s(r.kegiatan))
    const lokal = n(r.lokal)
    if (!id || !kegiatan) { dropped++; continue }
    rows.push({ school_id: id, kegiatan, lokal })
  }
  if (rows.length) {
    const { error } = await supabase.from('kegiatan').upsert(rows, { onConflict: 'school_id,kegiatan' })
    if (error) throw error
  }
  return { kept: rows.length, dropped }
}

async function handleFlatten(
  supabase: ReturnType<typeof createClient>,
  body: { schools?: SchoolRow[]; class_conditions?: ClassCondRow[]; kegiatan?: KegiatanRow[] }
) {
  const { map } = await upsertSchools(supabase, body.schools ?? [])
  const ccCount = await upsertClassConditions(supabase, body.class_conditions ?? [], map)
  const kRes    = await upsertKegiatan(supabase, body.kegiatan ?? [], map)
  return { schools: (body.schools?.length ?? 0), class_conditions: ccCount, kegiatan: kRes }
}

async function handleCombined(
  supabase: ReturnType<typeof createClient>,
  body: { rows?: { school: SchoolRow; class_conditions?: ClassCondRow; kegiatan?: KegiatanRow[] }[] }
) {
  const rows = body.rows || []
  const schools: SchoolRow[] = []
  const ccs: ClassCondRow[] = []
  const kegs: KegiatanRow[] = []
  for (const r of rows) {
    if (r.school) schools.push(r.school)
    if (r.class_conditions) ccs.push(r.class_conditions)
    if (Array.isArray(r.kegiatan)) kegs.push(...r.kegiatan)
  }
  return await handleFlatten(supabase, { schools, class_conditions: ccs, kegiatan: kegs })
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return bad('Only POST allowed', 405)

    // Token rahasia sederhana
    const token = tokenFrom(req)
    if (!token || token !== env('INGEST_TOKEN')) return bad('Unauthorized', 401)

    const supabase = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE'), {
      auth: { persistSession: false }
    })

    const body = await req.json() as IngestPayload
    const res = 'rows' in body
      ? await handleCombined(supabase, body as any)
      : await handleFlatten(supabase, body as any)

    return ok({ status: 'ok', ...res })
  } catch (e) {
    console.error('[ingest] error', e)
    return bad(`Error: ${e?.message || e}`, 500)
  }
})
