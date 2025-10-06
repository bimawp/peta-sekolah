// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Biar kelihatan jelas di dev kalau env belum di-set
  // (tidak akan crash app, tapi fetch akan gagal dan kita tangani di API)
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum terpasang.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // aman untuk dashboard publik
  },
});
