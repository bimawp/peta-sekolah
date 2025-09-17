// src/store/slices/filterSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  global: {
    region: 'all',
    district: 'all',
    schoolType: 'all',
    year: new Date().getFullYear().toString(),
    status: 'all'
  },
  // ... (tambahkan state filter lainnya dari FilterContext)
  map: {
    jenjang: 'all',
    kecamatan: 'all',
    desa: 'all',
    facility: 'all',
  }
};

const filterSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    // Ganti fungsi-fungsi di Context dengan reducer di sini
    setMapFilter(state, action) {
      // action.payload akan berisi { filterName: 'kecamatan', value: 'Garut Kota' }
      const { filterName, value } = action.payload;
      state.map[filterName] = value;

      // Reset filter desa jika kecamatan berubah
      if (filterName === 'kecamatan') {
        state.map.desa = 'all';
      }
    },
    setGlobalFilter(state, action) {
        state.global = { ...state.global, ...action.payload };
    },
    resetMapFilters(state) {
        state.map = initialState.map;
    },
    // ...tambahkan reducer lain sesuai kebutuhan
  },
});

// Ekspor actions agar bisa digunakan di komponen
export const { setMapFilter, setGlobalFilter, resetMapFilters } = filterSlice.actions;

// Ekspor selector untuk mengambil data dari store dengan mudah
export const selectMapFilters = (state) => state.filters.map;
export const selectGlobalFilters = (state) => state.filters.global;

export default filterSlice.reducer;