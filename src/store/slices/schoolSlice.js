// src/store/slices/schoolSlice.js - KODE LENGKAP PERBAIKAN

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// Ubah cara impor dari default menjadi named import, dan tambahkan .js
import { getSchools } from '../../services/api/schoolApi.js';

// fetchSchools sekarang menggunakan createAsyncThunk
export const fetchSchools = createAsyncThunk(
  'schools/fetchSchools',
  async (_, { rejectWithValue }) => {
    try {
      // Panggil fungsi yang sudah diimpor dengan benar
      const response = await getSchools();
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  data: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const schoolSlice = createSlice({
  name: 'school',
  initialState,
  reducers: {
    // Reducer lain bisa ditambahkan di sini jika perlu
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchools.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSchools.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchSchools.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export default schoolSlice.reducer;