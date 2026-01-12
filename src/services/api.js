// src/services/api.js
import supabase from '@/services/supabaseClient';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function requireEnv() {
  if (!SB_URL || !SB_KEY) throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

async function buildAuthHeaders() {
  requireEnv();
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || SB_KEY;
  return { apikey: SB_KEY, Authorization: `Bearer ${token}` };
}

// Dipakai jika kamu tetap butuh fetch() manual — tapi SchoolDetailPage akan kita pindahkan ke supabase-js.
export async function fetchAll(url) {
  const headers = await buildAuthHeaders();
  const page = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const res = await fetch(url, {
      headers: { ...headers, Range: `${from}-${from + page - 1}`, Prefer: 'count=exact' },
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${t}`);
    }
    const chunk = await res.json();
    out.push(...chunk);
    const cr = res.headers.get('content-range');
    const total = cr && Number(cr.split('/')[1]);
    from += chunk.length;
    if (!chunk.length || (total && from >= total)) break;
  }
  return out;
}
