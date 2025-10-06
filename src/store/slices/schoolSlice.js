// src/store/slices/schoolSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAllSchools } from '../../services/api/schoolApi';

export const fetchAllSchools = createAsyncThunk(
  'schools/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const rows = await getAllSchools();
      // filter koordinat valid (angka)
      return rows.filter(r => typeof r.latitude === 'number' && typeof r.longitude === 'number');
    } catch (err) {
      return rejectWithValue(err?.message || 'Gagal memuat data sekolah');
    }
  }
);

const initialSchoolsState = {
  items: [],
  status: 'idle', // idle | loading | succeeded | failed
  error: null
};

const schoolSlice = createSlice({
  name: 'schools',
  initialState: initialSchoolsState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllSchools.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchAllSchools.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchAllSchools.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
      });
  }
});

export default schoolSlice.reducer;
