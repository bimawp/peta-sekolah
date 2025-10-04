// src/store/slices/selectedSchoolSlice.js

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getSchoolById } from '../../services/api/schoolApi.js';

const initialState = {
  data: null,
  status: 'idle',
  error: null,
};

export const fetchSchoolByNpsn = createAsyncThunk(
  'selectedSchool/fetchByNpsn',
  async (npsn, { rejectWithValue }) => {
    if (!npsn) return rejectWithValue('NPSN tidak valid.');
    try {
      const schoolData = await getSchoolById(npsn);
      return schoolData;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const selectedSchoolSlice = createSlice({
  name: 'selectedSchool',
  initialState,
  reducers: {
    clearSelectedSchool: (state) => {
      state.data = null;
      state.status = 'idle';
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchoolByNpsn.pending, (state) => {
        state.status = 'loading';
        state.data = null;
      })
      .addCase(fetchSchoolByNpsn.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchSchoolByNpsn.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { clearSelectedSchool } = selectedSchoolSlice.actions;
export const selectSelectedSchool = (state) => state.selectedSchool.data;
export const selectSelectedSchoolStatus = (state) => state.selectedSchool.status;
export default selectedSchoolSlice.reducer;