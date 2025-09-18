// src/store/slices/filterSlice.js - KODE LENGKAP FINAL

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  jenjang: 'semua',
  kecamatan: 'semua',
  status: 'semua',
  searchTerm: '',
};

const filterSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
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
      state.status = 'semua';
      state.searchTerm = '';
    },
  },
});

export const { setJenjang, setKecamatan, setStatus, setSearchTerm, resetFilters } = filterSlice.actions;

export default filterSlice.reducer;