// src/services/api/schoolApi.js

import { supabase } from '../../utils/supabase.js';

/**
 * FUNGSI UNTUK STATISTIK DASHBOARD (DIKEMBALIKAN)
 * Ini adalah fungsi yang hilang dan menyebabkan layar putih.
 */
export const getDashboardStats = async () => {
    try {
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw new Error(`Database RPC error: ${error.message}`);
      return data[0];
    } catch (error) {
      console.error('Error dalam getDashboardStats:', error);
      throw error;
    }
};

/**
 * FUNGSI UNTUK DASBOR UTAMA (PETA, CHART, TABEL)
 * Mengambil data sekolah beserta info kondisi kelas yang dibutuhkan.
 */
export const getSchoolsForDashboard = async () => {
  try {
    const { data, error } = await supabase
      .from('schools')
      .select(`
        name, npsn, level, type, village, kecamatan, student_count, latitude, longitude,
        class_conditions ( classrooms_good, classrooms_moderate_damage, classrooms_heavy_damage, lacking_rkb )
      `)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);
      
    if (error) {
        console.error("Supabase query error in getSchoolsForDashboard:", error);
        throw new Error(`Database error: ${error.message}`);
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching dashboard schools:', error);
    throw error;
  }
};

/**
 * FUNGSI UNTUK HALAMAN DETAIL INDIVIDU (SUPER CEPAT)
 */
export const getSchoolById = async (npsn) => {
  try {
    if (!npsn) throw new Error("NPSN dibutuhkan.");
    const { data, error } = await supabase
      .from('schools')
      .select(`*, class_conditions(*)`)
      .eq('npsn', npsn)
      .single();
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error('Error dalam getSchoolById:', error.message);
    throw error;
  }
};