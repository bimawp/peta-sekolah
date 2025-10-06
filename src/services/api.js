// src/services/api.js
// Env Vite wajib:
// VITE_SUPABASE_URL=https://xxxx.supabase.co
// VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function requireEnv() {
  if (!SB_URL || !SB_KEY) {
    throw new Error('Supabase ENV missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }
}
function baseHeaders() {
  return {
    apikey: SB_KEY,
    Authorization: `Bearer ${SB_KEY}`,
    Prefer: 'count=exact',
  };
}

// --- Helper paging via Range header (untuk >1000 rows) ---
async function fetchAll(url) {
  requireEnv();
  const headers = baseHeaders();
  const page = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const res = await fetch(url, { headers: { ...headers, Range: `${from}-${from + page - 1}` } });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status}: ${t}`);
    }
    const chunk = await res.json();
    out.push(...chunk);

    const cr = res.headers.get('content-range'); // contoh: "0-999/4351"
    const total = cr && Number(cr.split('/')[1]);
    from += chunk.length;
    if (!chunk.length || (total && from >= total)) break;
  }
  return out;
}

/* =========================
 *  PUBLIC API (VIEW)
 * ========================= */

export async function fetchAllSchools() {
  const url = `${SB_URL}/rest/v1/schools_api?select=*`;
  return await fetchAll(url);
}

export async function fetchAllKegiatan() {
  const url = `${SB_URL}/rest/v1/kegiatan_api?select=*`;
  const rows = await fetchAll(url);
  return rows.map(r => ({
    npsn: String(r.npsn || '').trim(),
    kegiatan: r.kegiatan || '',
    lokal: Number(r.lokal || 0),
  }));
}

export async function fetchSchools() {
  const [schools, kegiatan] = await Promise.all([fetchAllSchools(), fetchAllKegiatan()]);
  const rehabMap = new Map();
  const bangunMap = new Map();
  for (const r of kegiatan) {
    const n = r.npsn;
    const v = r.lokal;
    const k = String(r.kegiatan || '').toLowerCase();
    if (k.startsWith('rehab')) rehabMap.set(n, (rehabMap.get(n) || 0) + v);
    else if (k.startsWith('pembangun')) bangunMap.set(n, (bangunMap.get(n) || 0) + v);
  }

  return schools.map(s => {
    const npsn = String(s.npsn || '').trim();
    const cc = s.class_condition || {};
    const coords = Array.isArray(s.coordinates) ? s.coordinates.map(Number) : [0, 0];
    const jenjangRaw = (s.jenjang || s.level || '').toString().toUpperCase();
    const jenjang = ['PAUD', 'SD', 'SMP', 'PKBM'].includes(jenjangRaw) ? jenjangRaw : (s.jenjang || 'Lainnya');

    return {
      jenjang,
      npsn,
      namaSekolah: s.name,
      tipeSekolah: s.type || s.status || '-',
      desa: s.village || '-',
      kecamatan: s.kecamatan || '-',
      student_count: Number(s.student_count || 0),
      coordinates: coords,
      kondisiKelas: {
        baik: Number(cc.classrooms_good || 0),
        rusakSedang: Number(cc.classrooms_moderate_damage || 0),
        rusakBerat: Number(cc.classrooms_heavy_damage || 0),
      },
      kurangRKB: Number(cc.lacking_rkb || 0),
      rehabRuangKelas: Number(rehabMap.get(npsn) || 0),
      pembangunanRKB: Number(bangunMap.get(npsn) || 0),
      originalData: {
        name: s.name,
        kecamatan: s.kecamatan,
        village: s.village,
        level: jenjang,
        class_condition: cc,
      }
    };
  });
}

export async function fetchSchoolsWithFallback() {
  try { return await fetchSchools(); }
  catch (e) {
    console.warn('[DataContract] API Supabase gagal:', e?.message);
    throw e;
  }
}

/* =========================
 *  RPC (server-side filtering)
 * ========================= */

async function postRPC(fn, body) {
  requireEnv();
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      ...baseHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${fn} HTTP ${res.status}: ${t}`);
  }
  return res.json();
}

export async function fetchKegiatanRPC(filters = {}) {
  const body = {
    p_level: filters.level ?? null,
    p_kecamatan: filters.kecamatan ?? null,
    p_village: filters.village ?? null,
  };
  return await postRPC('kegiatan_api_rpc', body); // [{npsn,kegiatan,lokal}]
}

export async function fetchSchoolsRPC(filters = {}) {
  const body = {
    p_level: filters.level ?? null,
    p_kecamatan: filters.kecamatan ?? null,
    p_village: filters.village ?? null,
  };
  const [schools, kegiatan] = await Promise.all([
    postRPC('schools_api_rpc', body),
    fetchKegiatanRPC(filters),
  ]);

  const rehabMap = new Map();
  const bangunMap = new Map();
  for (const r of kegiatan) {
    const n = String(r.npsn || '').trim();
    const v = Number(r.lokal || 0);
    const k = String(r.kegiatan || '').toLowerCase();
    if (k.startsWith('rehab')) rehabMap.set(n, (rehabMap.get(n) || 0) + v);
    else if (k.startsWith('pembangun')) bangunMap.set(n, (bangunMap.get(n) || 0) + v);
  }

  return schools.map(s => {
    const npsn = String(s.npsn || '').trim();
    const cc = s.class_condition || {};
    const coords = Array.isArray(s.coordinates) ? s.coordinates.map(Number) : [0, 0];
    const jenjangRaw = (s.jenjang || s.level || '').toString().toUpperCase();
    const jenjang = ['PAUD', 'SD', 'SMP', 'PKBM'].includes(jenjangRaw) ? jenjangRaw : (s.jenjang || 'Lainnya');

    return {
      jenjang,
      npsn,
      namaSekolah: s.name,
      tipeSekolah: s.type || s.status || '-',
      desa: s.village || '-',
      kecamatan: s.kecamatan || '-',
      student_count: Number(s.student_count || 0),
      coordinates: coords,
      kondisiKelas: {
        baik: Number(cc.classrooms_good || 0),
        rusakSedang: Number(cc.classrooms_moderate_damage || 0),
        rusakBerat: Number(cc.classrooms_heavy_damage || 0),
      },
      kurangRKB: Number(cc.lacking_rkb || 0),
      rehabRuangKelas: Number(rehabMap.get(npsn) || 0),
      pembangunanRKB: Number(bangunMap.get(npsn) || 0),
      originalData: {
        name: s.name,
        kecamatan: s.kecamatan,
        village: s.village,
        level: jenjang,
        class_condition: cc,
      }
    };
  });
}
