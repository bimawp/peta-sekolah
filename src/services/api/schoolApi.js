// src/services/api/schoolApi.js

import { supabase } from '../../utils/supabase.js';

// [PERBAIKAN 1]: Ekspor setiap fungsi secara individual (named export).
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

// [PERBAIKAN 2]: Tetap sediakan alias untuk kompatibilitas.
export const getAllSchools = getSchoolsForDashboard;

// [PERBAIKAN 3]: Ekspor juga objek 'schoolApi' untuk file yang membutuhkannya.
export const schoolApi = {
  getDashboardStats,
  getSchoolsForDashboard,
  getSchoolById,
  getAllSchools
};