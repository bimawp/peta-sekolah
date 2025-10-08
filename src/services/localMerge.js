// src/services/localMerge.js
// Ambil & gabungkan sekolah + kegiatan dari JSON di /public

const JENJANG_SOURCES = {
  PAud: { // casing bebas, kita pakai label di output saja
    sekolah: '/paud/data/paud.json',
    kegiatan: '/paud/data/data_kegiatan.json',
    label: 'PAUD',
  },
  SD: {
    sekolah: '/sd/data/sd_new.json',
    kegiatan: '/sd/data/data_kegiatan.json',
    label: 'SD',
  },
  SMP: {
    sekolah: '/smp/data/smp.json',
    kegiatan: '/smp/data/data_kegiatan.json',
    label: 'SMP',
  },
  PKBM: {
    sekolah: '/pkbm/data/pkbm.json',
    kegiatan: '/pkbm/data/data_kegiatan.json',
    label: 'PKBM',
  },
};

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Fetch ${url} -> ${r.status}`);
  return r.json();
}

function isValidCoord(lat, lng) {
  const a = Number(lat), b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && a >= -90 && a <= 90 && b >= -180 && b <= 180;
}

export async function loadAllFromPublic(filters = {}) {
  // 1) load semua jenjang
  const entries = await Promise.all(
    Object.values(JENJANG_SOURCES).map(async ({ sekolah, kegiatan, label }) => {
      const [sekolahArr, kegArr] = await Promise.all([
        fetchJson(sekolah), // sudah normalisasi dari script
        fetchJson(kegiatan).catch(() => []), // kalau kosong, jadi []
      ]);

      // bentuk item sekolah standar untuk halamanmu
      const schools = (sekolahArr || []).map((s) => ({
        id: s.npsn || s.id || `${label}:${s.name}`,
        npsn: s.npsn || null,
        name: s.name || '',
        address: s.address || '',
        jenjang: label,
        kecamatan: s.kecamatan || '',
        desa: s.village || '',
        lat: s.lat ?? s.latitude ?? null,
        lng: s.lng ?? s.longitude ?? null,
        coordinates: (isValidCoord(s.lat ?? s.latitude, s.lng ?? s.longitude))
          ? [Number(s.lng ?? s.longitude), Number(s.lat ?? s.latitude)]
          : null,
        student_count: s.student_count ?? null,
        st_male: s.st_male ?? null,
        st_female: s.st_female ?? null,
      }));

      // index kegiatan by npsn
      const kegByNpsn = new Map();
      (kegArr || []).forEach((k) => {
        const key = String(k.npsn ?? '').trim();
        if (!key) return;
        const val = kegByNpsn.get(key) || [];
        val.push({ kegiatan: k.kegiatan, lokal: Number(k.lokal || 0) || 0 });
        kegByNpsn.set(key, val);
      });

      // merge kegiatan ke sekolah
      const merged = schools.map((s) => {
        const ks = s.npsn ? (kegByNpsn.get(String(s.npsn).trim()) || []) : [];
        return { ...s, kegiatan: ks };
      });

      return merged;
    })
  );

  // 2) gabung & de-dupe by npsn (kalau ada)
  const flat = entries.flat();
  const byNpsn = new Map();
  const out = [];
  for (const s of flat) {
    const key = s.npsn ? String(s.npsn).trim() : null;
    if (key) {
      if (!byNpsn.has(key)) byNpsn.set(key, s);
    } else {
      out.push(s); // tak punya npsn, tetap masuk
    }
  }
  out.push(...byNpsn.values()); // semua unik npsn

  // 3) filter di sisi client (sesuai filter dropdown)
  let filtered = out;
  if (filters.level && filters.level !== 'Semua Jenjang') {
    filtered = filtered.filter((d) => d.jenjang === filters.level);
  }
  if (filters.kecamatan && filters.kecamatan !== 'Semua Kecamatan') {
    filtered = filtered.filter((d) => d.kecamatan === filters.kecamatan);
  }
  if (filters.village && filters.village !== 'Semua Desa') {
    filtered = filtered.filter((d) => d.desa === filters.village);
  }

  return filtered;
}
