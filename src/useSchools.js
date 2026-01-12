import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import { Schools } from './zodSchemas';

export async function fetchSchools(params = {}) {
  const { kecamatan, level, type } = params;

  // 1. Mulai query ke tabel schools
  let q = supabase
    .from('schools')
    .select(
      `
        id,
        name,
        npsn,
        address,
        village_name,
        school_type_id,
        status,
        student_count,
        st_male,
        st_female,
        lat,
        lng,
        location_id,
        meta,
        updated_at
      `,
      { count: 'exact' }
    );

  // 2. HAPUS RANGE/LIMIT
  // Kita tidak menggunakan .range() agar Supabase memberikan semua data yang dia bisa.
  // Catatan: Jika data tetap terpotong di 1000, kamu perlu mengatur "Max Rows" 
  // di Dashboard Supabase (Settings -> API -> Max Rows) ke 5000+.

  // 3. FILTERING (Hanya jika user memilih filter di UI)
  if (kecamatan) {
    q = q.filter('meta->>kecamatan', 'eq', kecamatan);
  }
  
  if (level) {
    q = q.eq('school_type_id', level);
  }

  if (type) {
    q = q.eq('status', type);
  }

  // 4. EKSEKUSI QUERY
  const { data, error, count } = await q;

  if (error) {
    console.error("Supabase Error:", error);
    throw error;
  }

  // 5. VALIDASI DATA DENGAN ZOD
  // Kita gunakan .safeParse agar jika ada 1-2 data sekolah yang formatnya 
  // bermasalah (misal lat/lng kosong), web kamu tidak akan crash/kosong.
  const parsed = Schools.safeParse(data);
  
  if (!parsed.success) {
    // Jika validasi gagal, kita tetap tampilkan data asli dari Supabase
    // supaya angka 4842 tetap tercapai di web kamu.
    console.warn('Zod Validation Warning: Beberapa data tidak sesuai skema.', parsed.error.format());
    return { 
      rows: data || [], 
      total: count || (data?.length ?? 0) 
    };
  }

  return { 
    rows: parsed.data, 
    total: count || parsed.data.length 
  };
}

export function useSchools(params) {
  return useQuery({
    queryKey: ['schools', params],
    queryFn: () => fetchSchools(params),
    staleTime: 1000 * 60 * 10, // Simpan di cache selama 10 menit agar web kencang
  });
}