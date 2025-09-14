// src/utils/supabase.js - VERSI FINAL & TUNGGAL

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variabel Supabase URL atau Anon Key tidak ditemukan di file .env");
}

// Hanya ada satu client ini di seluruh aplikasi.
// Menggunakan default localStorage yang lebih persisten.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // Penting untuk auth callbacks
  },
});