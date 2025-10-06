// src/services/api.js
// Pastikan ENV Vite ada:
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/* ========= Util ========= */
function requireEnv() {
  if (!SB_URL || !SB_KEY) {
    throw new Error('Supabase ENV missing: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }
}
function baseHeaders() {
  return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` };
}

/* ========= GET pagination untuk table/view ========= */
async function fetchAll(url) {
  requireEnv();
  const headers = baseHeaders();
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

    const cr = res.headers.get('content-range'); // "0-999/4842"
    const total = cr && Number(cr.split('/')[1]);
    from += chunk.length;
    if (!chunk.length || (total && from >= total)) break;
  }
  return out;
}

/* ========= POST RPC sekali tembak ========= */
async function postRPC(fn, body) {
  requireEnv();
  const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...baseHeaders(), 'Content-Type': 'application/json', Prefer: 'count=exact' },
    body: JSON.stringify(body || {}),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`${fn} HTTP ${res.status}: ${t}`);
  }
  return res.json();
}

/* ========= POST RPC dengan pagination (>1000) ========= */
async function fetchAllRPC(fn, body = {}) {
  requireEnv();
  const page = 1000;
  let from = 0;
  const out = [];
  for (;;) {
    const res = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        ...baseHeaders(),
        'Content-Type': 'application/json',
        Prefer: 'count=exact',
        Range: `${from}-${from + page - 1}`, // kunci lewati limit 1000
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`${fn} HTTP ${res.status}: ${t}`);
    }
    const chunk = await res.json();
    out.push(...chunk);

    const cr = res.headers.get('content-range'); // "0-999/4842"
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
  // asumsi ada view/tabel schools_api yang dipakai front-end
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

/**
 * fetchSchools
 * - Versi “non-RPC” agar kompatibel dengan import existing di dataSource.js
 * - Menggabungkan data sekolah + agregat kegiatan (rehab/pembangunan) seperti struktur yang dipakai UI
 */
export async function fetchSchools(filters = {}) {
  const [schoolsRaw, kegiatanRaw] = await Promise.all([
    fetchAllSchools(),   // sudah >1000 via Range loop
    fetchAllKegiatan(),
  ]);

  // (opsional) filter client-side bila ada filters
  const passFilter = (s) => {
    if (filters.level && String(s.level || s.jenjang || '').toUpperCase() !== String(filters.level).toUpperCase()) return false;
    if (filters.kecamatan && String(s.kecamatan || '').toUpperCase() !== String(filters.kecamatan).toUpperCase()) return false;
    if (filters.village && String(s.village || '').toUpperCase() !== String(filters.village).toUpperCase()) return false;
    return true;
  };

  const rehabMap = new Map();
  const bangunMap = new Map();
  for (const r of kegiatanRaw) {
    const n = String(r.npsn || '').trim();
    const v = Number(r.lokal || 0);
    const k = String(r.kegiatan || '').toLowerCase();
    if (k.startsWith('rehab')) rehabMap.set(n, (rehabMap.get(n) || 0) + v);
    else if (k.startsWith('pembangun')) bangunMap.set(n, (bangunMap.get(n) || 0) + v);
  }

  const normalized = (schoolsRaw || [])
    .filter(passFilter)
    .map(s => {
      const npsn = String(s.npsn || '').trim();
      const cc = s.class_condition || {};
      const coords = Array.isArray(s.coordinates) ? s.coordinates.map(Number) : [Number(s.longitude)||0, Number(s.latitude)||0];
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

  return normalized;
}

/* =========================
 *  PUBLIC API (RPC)
 * ========================= */

export async function fetchKegiatanRPC(filters = {}) {
  const body = {
    p_level: filters.level ?? null,
    p_kecamatan: filters.kecamatan ?? null,
    p_village: filters.village ?? null,
  };
  const rows = await fetchAllRPC('kegiatan_api_rpc', body);
  return rows.map(r => ({
    npsn: String(r.npsn || '').trim(),
    kegiatan: r.kegiatan || '',
    lokal: Number(r.lokal || 0),
  }));
}

export async function fetchSchoolsRPC(filters = {}) {
  const body = {
    p_level: filters.level ?? null,
    p_kecamatan: filters.kecamatan ?? null,
    p_village: filters.village ?? null,
  };

  const [schools, kegiatan] = await Promise.all([
    fetchAllRPC('schools_api_rpc', body), // >1000 aman
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

  return (schools || []).map(s => {
    const npsn = String(s.npsn || '').trim();
    const cc = s.class_condition || {};
    const coords = Array.isArray(s.coordinates) ? s.coordinates.map(Number) : [Number(s.longitude)||0, Number(s.latitude)||0];
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
