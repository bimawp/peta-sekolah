// src/services/api/schoolApi.js
import { supabase } from '../supabaseClient'; // path benar dari folder api/ naik 1

const PAGE_SIZE = 1000;

/**
 * Ambil SEMUA sekolah via pagination .range()
 * —hindari limit default 1000 baris dari Supabase/PostgREST.
 */
export async function getAllSchools() {
  let from = 0;
  let all = [];

  for (;;) {
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('schools')
      .select('id,name,address,latitude,longitude,type,level,kecamatan,student_count,st_male,st_female')
      .order('id', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const chunk = data || [];
    all = all.concat(chunk);

    if (chunk.length < PAGE_SIZE) break; // sudah habis
    from += PAGE_SIZE;
  }

  return all;
}

/** Ambil 1 sekolah by id (untuk panel/tooltip/halaman detail) */
export async function getSchoolById(id) {
  const { data, error } = await supabase
    .from('schools')
    .select('id,name,address,latitude,longitude,type,level,kecamatan,student_count,st_male,st_female,updated_at')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Statistik untuk dashboard (total sekolah, total siswa, breakdown, dll)
 * Menggunakan pagination juga + hitung 'exact' untuk totalSchools.
 */
export async function getDashboardStats() {
  let from = 0;
  let totalSchools = 0;
  let levels = {};
  let types = {};
  let kecamatan = {};
  let totalStudents = 0;
  let male = 0;
  let female = 0;

  for (;;) {
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from('schools')
      .select('id,level,type,kecamatan,student_count,st_male,st_female', { count: from === 0 ? 'exact' : null })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) throw error;
    if (from === 0 && typeof count === 'number') totalSchools = count;

    const chunk = data || [];
    for (const row of chunk) {
      const lv = row.level ?? 'Tidak Diketahui';
      const tp = row.type ?? 'Tidak Diketahui';
      const kc = row.kecamatan ?? 'Tidak Diketahui';
      levels[lv] = (levels[lv] || 0) + 1;
      types[tp] = (types[tp] || 0) + 1;
      kecamatan[kc] = (kecamatan[kc] || 0) + 1;

      const st = Number(row.student_count) || 0;
      const m = Number(row.st_male) || 0;
      const f = Number(row.st_female) || 0;
      totalStudents += st;
      male += m;
      female += f;
    }

    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const kecamatanTop = Object.entries(kecamatan)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  return {
    totalSchools,
    totalStudents,
    gender: { male, female },
    levels,
    types,
    kecamatanTop
  };
}
