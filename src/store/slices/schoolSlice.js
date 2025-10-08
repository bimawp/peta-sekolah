// src/store/slices/selectedSchoolSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSchoolById } from '@/services/api/schoolApi';

export const fetchSelectedSchool = createAsyncThunk(
  'selectedSchool/fetch',
  async (id, { rejectWithValue }) => {
    try {
      const school = await getSchoolById(id, {
        select:
          'id, name, npsn, address, latitude, longitude, jenjang, kabupaten, kecamatan, desa',
      });
      if (!school) return rejectWithValue('School not found');
      return school;
    } catch (err) {
      return rejectWithValue(err.message || String(err));
    }
  }
);

const selectedSchoolSlice = createSlice({
  name: 'selectedSchool',
  initialState: {
    data: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearSelectedSchool(state) {
      state.data = null;
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSelectedSchool.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSelectedSchool.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchSelectedSchool.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Gagal memuat data sekolah';
      });
  },
});

export const { clearSelectedSchool } = selectedSchoolSlice.actions;
export default selectedSchoolSlice.reducer;
