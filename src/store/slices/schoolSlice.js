// src/store/slices/schoolSlice.js

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
// PERBAIKAN: Menggunakan fungsi yang benar, yang sudah kita optimalkan
import { getSchoolsForDashboard } from '../../services/api/schoolApi.js'; 

const initialState = {
  all: [],
  status: 'idle',
  error: null,
};

// fetchAllSchools sekarang menggunakan getSchoolsForDashboard
export const fetchAllSchools = createAsyncThunk(
  'schools/fetchAllSchools',
  async (_, { rejectWithValue }) => {
    try {
      // PERBAIKAN: Memanggil fungsi yang benar dan efisien
      const response = await getSchoolsForDashboard(); 

      // Proses mapping data seperti biasa
      return response.map(school => {
        const conditions = school.class_conditions?.[0] || {};
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

export const selectSchoolsByKecamatan = createSelector(
    [selectAllSchools],
    (schools) => {
        if (!Array.isArray(schools) || schools.length === 0) return [];
        
        const aggregation = schools.reduce((acc, school) => {
            if (!school.kecamatan || !school.latitude || !school.longitude) return acc;

            if (!acc[school.kecamatan]) {
                acc[school.kecamatan] = {
                    nama: school.kecamatan,
                    totalSekolah: 0,
                    jenjang: { PAUD: 0, SD: 0, SMP: 0, PKBM: 0 },
                    latitudes: [],
                    longitudes: [],
                };
            }
            
            acc[school.kecamatan].totalSekolah++;
            const jenjang = school.jenjang?.toUpperCase() || 'LAINNYA';
            if (acc[school.kecamatan].jenjang[jenjang] !== undefined) {
                acc[school.kecamatan].jenjang[jenjang]++;
            }
            acc[school.kecamatan].latitudes.push(school.latitude);
            acc[school.kecamatan].longitudes.push(school.longitude);
            
            return acc;
        }, {});
        
        return Object.values(aggregation).map(kec => {
            const avgLat = kec.latitudes.reduce((a, b) => a + b, 0) / kec.latitudes.length;
            const avgLng = kec.longitudes.reduce((a, b) => a + b, 0) / kec.longitudes.length;
            return {
                ...kec,
                position: [avgLat, avgLng],
            };
        });
    }
);

export default schoolSlice.reducer;