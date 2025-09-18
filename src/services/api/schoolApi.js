// src/services/api/schoolApi.js - KODE LENGKAP PERBAIKAN

// Ubah baris ini:
// import supabase from '../../utils/supabase.js';

// Menjadi baris ini:
import { supabase } from '../../utils/supabase.js';

export const getSchools = async () => {
  const { data, error } = await supabase.from('schools').select('*');

  if (error) {
    throw new Error(error.message);
  }

  return data;
};