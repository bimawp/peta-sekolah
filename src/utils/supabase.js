import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// --- TAMBAHAN UNTUK DEBUGGING ---
// Pesan ini akan muncul di terminal tempat Anda menjalankan 'npm start'
console.log('Membaca Supabase URL:', supabaseUrl ? 'Berhasil' : 'GAGAL');
console.log('Membaca Supabase Key:', supabaseAnonKey ? 'Berhasil' : 'GAGAL');
// ---------------------------------

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variabel Supabase URL atau Anon Key tidak ditemukan di file .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);