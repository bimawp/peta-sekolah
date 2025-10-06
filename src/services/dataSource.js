// src/services/dataSource.js
import {
  fetchAllSchools,
  fetchAllKegiatan,
  fetchSchools,      // <- sekarang tersedia
  fetchSchoolsRPC,
} from './api';

// Dipakai beberapa halaman untuk dataset “full” dari view
export async function loadSchoolDataset() {
  return await fetchSchools(); // sudah ter-paginate & sudah digabung kegiatan
}

// Dipakai SchoolDetailPage.jsx (RPC + pagination >1000)
export async function loadSchoolDatasetRPC(filters = {}) {
  return await fetchSchoolsRPC(filters);
}

// Kompat untuk HydratedDataProvider.jsx
export async function fetchAllData() {
  const [schoolsRaw, kegiatanRaw] = await Promise.all([
    fetchAllSchools(),
    fetchAllKegiatan(),
  ]);

  const rehabMap = new Map();
  const bangunMap = new Map();
  for (const r of kegiatanRaw) {
    const n = String(r.npsn || '').trim();
    const v = Number(r.lokal || 0);
    const k = String(r.kegiatan || '').toLowerCase();
    if (k.startsWith('rehab')) rehabMap.set(n, (rehabMap.get(n) || 0) + v);
    else if (k.startsWith('pembangun')) bangunMap.set(n, (bangunMap.get(n) || 0) + v);
  }

  const schools = (schoolsRaw || []).map(s => {
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

  return { schools, schoolsRaw, kegiatanRaw };
}
