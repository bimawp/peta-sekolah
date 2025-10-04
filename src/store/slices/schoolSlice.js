// src/store/slices/schoolSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// [PERBAIKAN]: Impor fungsi yang dibutuhkan secara langsung (named import).
import { getAllSchools } from '../../services/api/schoolApi'; 
import { calculateTotals } from '../../services/utils/calculationUtils';

// Async thunk untuk mengambil semua data sekolah
export const fetchAllSchools = createAsyncThunk(
  'schools/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      // Panggil fungsi yang sudah diimpor
      const schools = await getAllSchools(); 
      if (!Array.isArray(schools)) {
        throw new Error('Data sekolah yang diterima bukan array.');
      }
      return schools;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  all: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  totals: {
    totalSchools: 0,
    totalStudents: 0,
    classroomTotals: {
      total: 0,
      good: 0,
      moderateDamage: 0,
      heavyDamage: 0,
      lacking: 0
    },
    byLevel: {}
  }
};

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
        // Hitung total setelah data berhasil diambil
        state.totals = calculateTotals(action.payload);
      })
      .addCase(fetchAllSchools.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  }
});

// Selectors
export const selectAllSchools = (state) => state.schools.all;
export const selectSchoolsStatus = (state) => state.schools.status;
export const selectSchoolTotals = (state) => state.schools.totals;

// Selector kompleks untuk memfilter sekolah berdasarkan filter aktif
export const selectFilteredSchools = (state) => {
  const { all } = state.schools;
  const { jenjang, kecamatan, desa, kondisi } = state.filter;

  if (!Array.isArray(all)) return [];

  return all.filter(school => {
    // Filter Jenjang
    if (jenjang !== 'Semua Jenjang' && school.level !== jenjang) {
      return false;
    }
    // Filter Kecamatan
    if (kecamatan !== 'Semua Kecamatan' && school.kecamatan !== kecamatan) {
      return false;
    }
    // Filter Desa
    if (desa !== 'Semua Desa' && school.village !== desa) {
      return false;
    }
    // Filter Kondisi Kelas
    if (kondisi !== 'Semua Kondisi') {
      const conditions = school.class_conditions?.[0] || {};
      if (kondisi === 'Baik' && (conditions.classrooms_good || 0) === 0) return false;
      if (kondisi === 'Rusak Sedang' && (conditions.classrooms_moderate_damage || 0) === 0) return false;
      if (kondisi === 'Rusak Berat' && (conditions.classrooms_heavy_damage || 0) === 0) return false;
      if (kondisi === 'Kurang RKB' && (conditions.lacking_rkb || 0) === 0) return false;
    }
    return true;
  });
};

export default schoolSlice.reducer;