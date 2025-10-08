// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY?.trim();

// Kunci global untuk singleton
const GLOBAL_KEY = Symbol.for('__ps_supabase_singleton__');
// storageKey unik agar tidak bentrok
const STORAGE_KEY = 'ps-auth-zpdxdwzervdhlpodrmep';

let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: STORAGE_KEY,
      },
    });
  }
  supabase = globalThis[GLOBAL_KEY];
} else {
  console.error('[supabaseClient] ENV belum lengkap. Set VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY');
}

export { supabase };
export default supabase;
