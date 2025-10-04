// src/services/api/schoolApi.js

import { supabase } from '../../utils/supabase.js';

/**
 * FUNGSI UNTUK STATISTIK KARTU DASHBOARD (DIKEMBALIKAN)
 * Ini adalah fungsi yang hilang dan menyebabkan error pada dashboardSlice.
 */
export const getDashboardStats = async () => {
    try {
      // Pastikan fungsi 'get_dashboard_stats' ada di database Supabase Anda
      const { data, error } = await supabase.rpc('get_dashboard_stats');
      if (error) throw new Error(`Database RPC error: ${error.message}`);
      return data[0];
    } catch (error) {
      console.error('Error dalam getDashboardStats:', error);
      throw error;
    }
};

/**
 * FUNGSI UTAMA UNTUK HALAMAN PETA/DASBOR (VERSI FINAL & STABIL)
 * Mengambil data sekolah beserta info kondisi kelas yang dibutuhkan chart.
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
        console.error("Supabase query error:", error);
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
      .select(`*, class_conditions(*), rehab_activities(*), construction_activities(*)`)
      .eq('npsn', npsn)
      .single();
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    console.error('Error dalam getSchoolById:', error.message);
    throw error;
  }
};

/**
 * FUNGSI INI DIKEMBALIKAN untuk kompatibilitas dengan schoolSlice.js
 * Ini akan mencegah error 'getAllSchools is not exported' di masa depan.
 */
export const getAllSchools = getSchoolsForDashboard;