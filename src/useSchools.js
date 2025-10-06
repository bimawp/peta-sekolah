import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabaseClient'
import { Schools } from './zodSchemas'


export function fetchSchools(params = {}) {
const { kecamatan, level, type, limit = 500, offset = 0 } = params
let q = supabase
.from('schools')
.select(
`id,name,npsn,address,village,type,level,st_male,st_female,student_count,latitude,longitude,kecamatan,updated_at`,
{ count: 'exact' }
)
.range(offset, offset + limit - 1)
if (kecamatan) q = q.eq('kecamatan', kecamatan)
if (level) q = q.eq('level', level)
if (type) q = q.eq('type', type)
return q.then(({ data, error }) => {
if (error) throw error
const parsed = Schools.safeParse(data)
if (!parsed.success) {
throw new Error('Schema validation failed: ' + parsed.error.message)
}
return { rows: parsed.data, total: data?.length ?? 0 }
})
}


export function useSchools(params) {
return useQuery({ queryKey: ['schools', params], queryFn: () => fetchSchools(params) })
}