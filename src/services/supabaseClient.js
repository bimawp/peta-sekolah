// src/services/supabaseClient.js
// Client utama Supabase untuk seluruh aplikasi

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Biar kelihatan jelas kalau env belum di-set
  console.error('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
export { supabase };

// Log hanya di mode development
if (import.meta.env.DEV) {
  try {
    console.log('[Supabase] URL =', supabaseUrl);
    console.log(
      '[Supabase] anonKey.length =',
      typeof supabaseAnonKey === 'string' ? supabaseAnonKey.length : 'N/A'
    );
  } catch {
    // abaikan
  }
}

// Untuk debugging manual di DevTools
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  window.__sb = supabase;
  window.__sbUrl = supabaseUrl;
}
