// src/store/slices/filterSlice.js - KODE LENGKAP FINAL

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  jenjang: 'semua',
  kecamatan: 'semua',
  // Menyesuaikan dengan yang ada di FilterPanel, yaitu 'kondisi' bukan 'status'
  kondisi: 'semua', 
  status: 'semua', // Tetap ada jika digunakan di tempat lain
  searchTerm: '',
};

const filterSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    // --- TAMBAHAN BARU ---
    // Reducer untuk mengatur beberapa filter sekaligus
    setFilters: (state, action) => {
      // Menggabungkan filter yang ada dengan payload baru
      return { ...state, ...action.payload };
    },
    // --- Reducer yang sudah ada ---
    setJenjang: (state, action) => {
      state.jenjang = action.payload;
    },
    setKecamatan: (state, action) => {
      state.kecamatan = action.payload;
    },
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    setSearchTerm: (state, action) => {
      state.searchTerm = action.payload;
    },
    resetFilters: (state) => {
      state.jenjang = 'semua';
      state.kecamatan = 'semua';
      state.kondisi = 'semua';
      state.status = 'semua';
      state.searchTerm = '';
    },
  },
});

// Pastikan 'setFilters' diekspor di sini
export const { setFilters, setJenjang, setKecamatan, setStatus, setSearchTerm, resetFilters } = filterSlice.actions;

export default filterSlice.reducer;