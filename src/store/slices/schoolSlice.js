// src/store/slices/schoolSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import schoolApi from '../../services/api/schoolApi';

// Async thunk untuk fetch sekolah berdasarkan provinsi
export const fetchSchoolsByProvince = createAsyncThunk(
  'schools/fetchByProvince',
  async (provinceId, thunkAPI) => {
    try {
      const response = await schoolApi.getSchoolsByProvince(provinceId);
      return response;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

const schoolSlice = createSlice({
  name: 'schools',
  initialState: {
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchoolsByProvince.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSchoolsByProvince.fulfilled, (state, action) => {
        state.loading = false;
        state.list = action.payload;
      })
      .addCase(fetchSchoolsByProvince.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Failed to fetch schools';
      });
  },
});

export default schoolSlice.reducer;
