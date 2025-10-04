// src/services/api/schoolApi.js - GANTI SELURUH ISI FILE DENGAN INI

import { supabase } from '../../utils/supabase.js'; // Pastikan path ini benar

// TAMBAHKAN 'export' DI DEPAN SETIAP FUNGSI

export const getSchoolsByRegion = async (regionBounds = {}) => {
  try {
    const { min_lat, min_lng, max_lat, max_lng } = regionBounds;
    
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
          return functionData;
        }
      } catch (funcErr) {
        console.warn('Fungsi database tidak tersedia, menggunakan query alternatif:', funcErr.message);
      }
    }

    let query = supabase
      .from('schools')
      .select(`id, name, npsn, address, village, type, level, student_count, latitude, longitude`)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (min_lat && min_lng && max_lat && max_lng) {
      query = query
        .gte('latitude', min_lat)
        .lte('latitude', max_lat)
        .gte('longitude', min_lng)
        .lte('longitude', max_lng);
    }

    const { data, error } = await query.order('name');
    if (error) throw new Error(`Database error: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error('Error dalam getSchoolsByRegion:', error);
    throw error;
  }
};

export const getAllSchools = async () => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select(`
        id, name, npsn, address, village, kecamatan, type, level,
        student_count, latitude, longitude,
        class_conditions (
          classrooms_good, classrooms_moderate_damage, classrooms_heavy_damage, lacking_rkb
        )
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('name');
    if (error) throw new Error(`Database error: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error('Error dalam getAllSchools:', error);
    throw error;
  }
};

export const getSchoolById = async (npsn) => {
  try {
    if (!npsn) throw new Error("NPSN dibutuhkan untuk mencari data sekolah.");

    const { data, error } = await supabase
      .from('schools')
      .select(`*, class_conditions(*)`)
      .eq('npsn', npsn)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error(`Sekolah dengan NPSN ${npsn} tidak ditemukan.`);
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error dalam getSchoolById:', error.message);
    throw error;
  }
};

export const searchSchools = async (searchTerm) => {
  try {
    if (!searchTerm || searchTerm.trim().length === 0) return [];
    
    const { data, error } = await supabase
      .from('schools')
      .select(`id, name, npsn, address, village, type, level, latitude, longitude`)
      .or(`name.ilike.%${searchTerm}%,npsn.ilike.%${searchTerm}%,address.ilike.%${searchTerm}%,village.ilike.%${searchTerm}%`)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .order('name')
      .limit(50);
      
    if (error) throw new Error(`Database error: ${error.message}`);
    return data || [];
  } catch (error) {
    console.error('Error dalam searchSchools:', error);
    throw error;
  }
};