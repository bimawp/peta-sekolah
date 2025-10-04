// src/store/slices/schoolSlice.js - GANTI SELURUH ISI FILE DENGAN INI

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { getAllSchools } from '../../services/api/schoolApi.js'; // Path sudah benar

const initialState = {
  all: [],
  status: 'idle',
  error: null,
};

export const fetchAllSchools = createAsyncThunk(
  'schools/fetchAllSchools',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAllSchools();
      return response.map(school => {
        const conditions = (Array.isArray(school.class_conditions) && school.class_conditions.length > 0)
          ? school.class_conditions[0]
          : {};

        return {
          id: school.id,
          npsn: school.npsn,
          nama: school.name,
          address: school.address,
          kecamatan: school.kecamatan,
          desa: school.village,
          jenjang: school.level,
          latitude: school.latitude,
          longitude: school.longitude,
          kondisi_ruang_kelas_rusak_berat: conditions.classrooms_heavy_damage || 0,
          kondisi_ruang_kelas_rusak_sedang: conditions.classrooms_moderate_damage || 0,
          kekurangan_rkb: conditions.lacking_rkb || 0,
        };
      });
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const schoolSlice = createSlice({
  name: 'schools',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllSchools.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchAllSchools.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.all = action.payload;
      })
      .addCase(fetchAllSchools.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const selectAllSchools = (state) => state.schools.all;
export const selectSchoolsStatus = (state) => state.schools.status;
const selectFilters = (state) => state.filter;

export const selectFilteredSchools = createSelector(
  [selectAllSchools, selectFilters],
  (schools, filters) => {
    if (!Array.isArray(schools)) return [];
    
    return schools.filter(school => {
      if (filters.jenjang !== 'Semua Jenjang' && school.jenjang !== filters.jenjang) return false;
      if (filters.kecamatan !== 'Semua Kecamatan' && school.kecamatan !== filters.kecamatan) return false;
      if (filters.kecamatan !== 'Semua Kecamatan' && filters.desa !== 'Semua Desa' && school.desa !== filters.desa) return false;
      if (filters.kondisi !== 'Semua Kondisi') {
        if (filters.kondisi === 'Rusak Berat' && school.kondisi_ruang_kelas_rusak_berat === 0) return false;
        if (filters.kondisi === 'Rusak Sedang' && school.kondisi_ruang_kelas_rusak_sedang === 0) return false;
        if (filters.kondisi === 'Kebutuhan RKB' && school.kekurangan_rkb === 0) return false;
      }
      return true;
    });
  }
);

export default schoolSlice.reducer;