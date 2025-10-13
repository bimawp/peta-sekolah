// src/services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnon);

export default supabase;
export { supabase };

try {
  console.log('[Supabase] URL =', supabaseUrl);
  console.log('[Supabase] anonKey.length =', typeof supabaseAnon === 'string' ? supabaseAnon.length : 'N/A');
} catch {}

if (typeof window !== 'undefined') {
  window.__sb = supabase;
  window.__sbUrl = supabaseUrl;
}
