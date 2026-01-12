// src/store/slices/selectedSchoolSlice.js
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getSchoolById } from '../../services/api/schoolApi';

export const fetchSelectedSchool = createAsyncThunk(
  'selectedSchool/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      return await getSchoolById(id);
    } catch (err) {
      return rejectWithValue(err?.message || 'Gagal memuat detail sekolah');
    }
  }
);

const initialSelectedState = {
  data: null,
  status: 'idle',
  error: null
};

const selectedSchoolSlice = createSlice({
  name: 'selectedSchool',
  initialState: initialSelectedState,
  reducers: {
    clearSelected(state) {
      state.data = null;
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSelectedSchool.pending, (state) => { state.status = 'loading'; })
      .addCase(fetchSelectedSchool.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchSelectedSchool.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || action.error?.message;
      });
  }
});

export const { clearSelected } = selectedSchoolSlice.actions;
export default selectedSchoolSlice.reducer;
