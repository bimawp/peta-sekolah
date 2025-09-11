import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variabel Supabase URL atau Anon Key tidak ditemukan di file .env");
}

// UBAH BAGIAN INI
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Tambahkan opsi ini untuk menggunakan sessionStorage
    storage: sessionStorage, 
    // Secara default, autoRefreshToken aktif. Anda bisa mematikannya jika mau,
    // tapi penggunaan sessionStorage saja sudah cukup.
    autoRefreshToken: true,
    persistSession: true, // Pastikan ini tetap true, tapi akan persist di sessionStorage
  },
});