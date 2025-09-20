import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// TAMBAHKAN .js DI AKHIR PATH INI
import { getSchoolsByRegion } from '../../services/api/schoolApi.js';

// Thunk untuk mengambil data sekolah berdasarkan wilayah
export const fetchSchoolsByRegion = createAsyncThunk(
  'schools/fetchByRegion',
  async (region, { rejectWithValue }) => {
    try {
      const data = await getSchoolsByRegion(region);
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  data: [],
  filteredData: [],
  status: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
};

const schoolSlice = createSlice({
  name: 'schools',
  initialState,
  reducers: {
    filterSchools: (state, action) => {
      state.filteredData = state.data.filter(school => school.level === action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSchoolsByRegion.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchSchoolsByRegion.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.filteredData = action.payload;
      })
      .addCase(fetchSchoolsByRegion.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      });
  },
});

export const { filterSchools } = schoolSlice.actions;

export default schoolSlice.reducer;