import { supabase } from '../../utils/supabase.js';
// PASTIKAN PATH INI BENAR: menunjuk ke file yang kita perbaiki di Langkah 1
import { analyzeFacilityCondition } from '../../utils/mapUtils.js';

export const getSchoolsByRegion = async (region) => {
  // ... (sisa kode tidak perlu diubah)
  if (!region) {
    throw new Error('Wilayah (region) harus ditentukan.');
  }
  const { data, error } = await supabase.rpc('get_schools_by_region', {
    region_name: region
  });
  if (error) {
    console.error('Error fetching schools by region:', error);
    throw new Error(error.message);
  }
  if (!data) {
    return [];
  }
  return data.map(school => ({
    ...school,
    id: school.id_hasil,
    npsn: school.npsn_hasil,
    name: school.nama_hasil,
    address: school.alamat_hasil,
    village: school.desa_hasil,
    level: school.jenjang_hasil,
    type: school.status_hasil,
    student_count: school.total_siswa_hasil,
    latitude: school.latitude_hasil,
    longitude: school.longitude_hasil,
    condition: analyzeFacilityCondition(school)
  }));
};