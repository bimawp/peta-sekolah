// src/store/selectors/schoolSelectors.js
import { createSelectorCreator, defaultMemoize } from 'reselect';
import isEqual from 'lodash.isequal';

// Selector dengan deep memoization biar referensi stabil
const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual);

// === Input selectors: sesuaikan dengan struktur state kamu ===
export const selectSchoolState = (s) => s.school || {};
export const selectAllSchools = (s) => selectSchoolState(s).items || [];
export const selectSchoolsStatus = (s) => selectSchoolState(s).status || 'idle';
export const selectSchoolsError  = (s) => selectSchoolState(s).error || null;

export const selectFilters = (s) => s.filter || {};

// === Output selector: LOGIKA FILTER TETAP punyamu ===
// Pastikan TIDAK bikin array/object baru kalau input nggak berubah.
export const selectFilteredSchools = createDeepEqualSelector(
  [selectAllSchools, selectFilters],
  (schools, filters) => {
    if (!Array.isArray(schools) || schools.length === 0) return schools;

    let out = schools;

    // Contoh filter — silakan sesuaikan persis dengan punyamu
    if (filters.keyword && String(filters.keyword).trim()) {
      const kw = String(filters.keyword).trim().toLowerCase();
      out = out.filter((x) =>
        String(x.name ?? '').toLowerCase().includes(kw) ||
        String(x.village ?? '').toLowerCase().includes(kw) ||
        String(x.kecamatan ?? '').toLowerCase().includes(kw)
      );
    }
    if (filters.level && filters.level !== 'ALL') {
      out = out.filter((x) => x.level === filters.level);
    }
    if (filters.type && filters.type !== 'ALL') {
      out = out.filter((x) => x.type === filters.type);
    }

    // Tambahkan filter lainnya PERSIS seperti yang ada di project kamu.
    // Penting: jangan .map/.reduce menciptakan object baru kalau tidak perlu.

    return out;
  }
);
