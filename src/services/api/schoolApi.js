// src/services/api/schoolApi.js

import { supabase } from '../../utils/supabase.js';

/**
 * Mengambil data sekolah berdasarkan region bounds
 * @param {Object} regionBounds - Object berisi min_lat, min_lng, max_lat, max_lng
 * @returns {Promise<Array>} - Array berisi data sekolah
 */
export const getSchoolsByRegion = async (regionBounds = {}) => {
  try {
    const { min_lat, min_lng, max_lat, max_lng } = regionBounds;
    
    // Jika ada bounds, coba gunakan fungsi database dulu
    if (min_lat && min_lng && max_lat && max_lng) {
      try {
        const { data: functionData, error: functionError } = await supabase
          .rpc('get_schools_by_region', {
            min_lat,
            min_lng,
            max_lat,
            max_lng
          });

        if (!functionError && functionData) {
          console.log(`Berhasil memuat ${functionData.length} sekolah menggunakan fungsi database`);
          return functionData;
        }
      } catch (funcErr) {
        console.warn('Fungsi database tidak tersedia, menggunakan query alternatif:', funcErr.message);
      }
    }

    // Fallback: gunakan query biasa jika fungsi tidak tersedia
    let query = supabase
      .from('schools')
      .select(`
        id,
        name,
        npsn,
        address,
        village,
        type,
        level,
        st_male,
        st_female,
        student_count,
        latitude,
        longitude
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Jika ada bounds, terapkan filter
    if (min_lat && min_lng && max_lat && max_lng) {
      query = query
        .gte('latitude', min_lat)
        .lte('latitude', max_lat)
        .gte('longitude', min_lng)
        .lte('longitude', max_lng);
    }

    const { data, error } = await query.order('name');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`Berhasil memuat ${data?.length || 0} sekolah menggunakan query alternatif`);
    return data || [];

  } catch (error) {
    console.error('Error dalam getSchoolsByRegion:', error);
    throw error;
  }
};

/**
 * Mengambil semua data sekolah
 * @returns {Promise<Array>} - Array berisi semua data sekolah
 */
export const getAllSchools = async () => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select(`
        id,
        name,
        npsn,
        address,
        village,
        type,
        level,
        st_male,
        st_female,
        student_count,
        latitude,
        longitude
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('name');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error dalam getAllSchools:', error);
    throw error;
  }
};

/**
 * Mengambil data sekolah berdasarkan ID
 * @param {number} schoolId - ID sekolah
 * @returns {Promise<Object>} - Data sekolah lengkap dengan relasi
 */
export const getSchoolById = async (schoolId) => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select(`
        *,
        class_conditions (*),
        furniture (*),
        furniture_computer (*),
        laboratory (*),
        library (*),
        teacher_room (*),
        toilets (*),
        building_status (*),
        rombel (*),
        kepsek (*),
        ape (*),
        playground_area (*),
        uks (*),
        official_residences (*)
      `)
      .eq('id', schoolId)
      .single();

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error dalam getSchoolById:', error);
    throw error;
  }
};

/**
 * Mencari sekolah berdasarkan nama atau NPSN
 * @param {string} searchTerm - Term pencarian
 * @returns {Promise<Array>} - Array berisi hasil pencarian
 */
export const searchSchools = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const { data, error } = await supabase
      .from('schools')
      .select(`
        id,
        name,
        npsn,
        address,
        village,
        type,
        level,
        latitude,
        longitude
      `)
      .or(`name.ilike.%${searchTerm}%,npsn.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,village.ilike.%${searchTerm}%`)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('name')
      .limit(50); // Batasi hasil untuk performa

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error dalam searchSchools:', error);
    throw error;
  }
};