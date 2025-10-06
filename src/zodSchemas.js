import { z } from 'zod'


export const School = z.object({
id: z.number(),
name: z.string(),
npsn: z.string().nullish(),
address: z.string().nullish(),
village: z.string().nullish(),
type: z.string().nullish(),
level: z.string().nullish(),
st_male: z.number().nullish(),
st_female: z.number().nullish(),
student_count: z.number().nullish(),
latitude: z.number().or(z.string()).nullish(),
longitude: z.number().or(z.string()).nullish(),
kecamatan: z.string().nullish(),
updated_at: z.string().nullish()
})


export const Schools = z.array(School)