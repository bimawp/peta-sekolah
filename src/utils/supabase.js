// src/utils/supabase.js - VERSI DEBUGGING

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// --- DEBUGGING LOGS ---
console.log("Supabase Client Init:");
console.log("URL:", supabaseUrl ? "Loaded" : "NOT LOADED");
console.log("Key:", supabaseAnonKey ? "Loaded" : "NOT LOADED");
// --------------------

if (!supabaseUrl || !supabaseAnonKey) {
  // Pesan ini akan muncul di halaman error, bukan di konsol, jika gagal
  throw new Error("Variabel Supabase URL atau Anon Key tidak ditemukan. Pastikan file .env sudah benar dan server sudah di-restart.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});