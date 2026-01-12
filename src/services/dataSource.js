// src/services/dataSource.js
import {
  fetchAllSchools,
  fetchAllKegiatanBySchoolIds,
  fetchClassConditionsBySchoolIds,
  loadSchoolDatasetRPC as _loadSchoolDatasetRPC,
} from '@/services/api/schoolApi';

const ensureArray = (x) => (Array.isArray(x) ? x : (x ? [x] : []));

export function indexBy(arr, key) {
  const a = ensureArray(arr);
  return a.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item?.[key];
    if (k !== undefined && k !== null) acc[k] = item;
    return acc;
  }, {});
}

export function groupBy(arr, key) {
  const a = ensureArray(arr);
  return a.reduce((acc, item) => {
    const k = typeof key === 'function' ? key(item) : item?.[key];
    if (k === undefined || k === null) return acc;
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

/**
 * Ambil semua data untuk HydratedDataProvider
 */
export async function fetchAllData({ schoolIds = null } = {}) {
  const allSchools = await fetchAllSchools();
  const schools = schoolIds?.length
    ? allSchools.filter((s) => schoolIds.includes(s.id))
    : allSchools;

  const ids = schools.map((s) => s.id);

  const [kegiatan, classConditions] = await Promise.all([
    fetchAllKegiatanBySchoolIds(
      ids,
      'id,school_id,kegiatan,lokal,created_at,updated_at'
    ),
    fetchClassConditionsBySchoolIds(
      ids,
      'id,school_id,kelas,kondisi,jumlah,created_at,updated_at'
    ),
  ]);

  const kegiatanArr = ensureArray(kegiatan);
  const ccArr = ensureArray(classConditions);

  return {
    schools,
    schoolsById: indexBy(schools, 'id'),
    kegiatan: kegiatanArr,
    kegiatanBySchoolId: groupBy(kegiatanArr, 'school_id'),
    classConditions: ccArr,
    classConditionsBySchoolId: groupBy(ccArr, 'school_id'),
    meta: {
      totalSchools: schools.length,
      totalKegiatan: kegiatanArr.length,
      totalClassConditions: ccArr.length,
      fetchedAt: new Date().toISOString(),
    },
  };
}

/** Re-export supaya bisa:
 *   import { loadSchoolDatasetRPC } from '@/services/dataSource'
 */
export const loadSchoolDatasetRPC = _loadSchoolDatasetRPC;
