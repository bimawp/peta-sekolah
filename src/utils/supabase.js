import { createClient } from "@supabase/supabase-js";

// Ganti process.env.REACT_APP_ menjadi import.meta.env.VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variabel Supabase URL atau Anon Key tidak ditemukan di file .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);