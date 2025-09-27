import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  jenjang: 'Semua',
  kecamatan: 'Semua Kecamatan',
  desa: 'Semua Desa',
  kondisi: 'Semua Kondisi',
};

const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      const { filterType, value } = action.payload;
      state[filterType] = value;
      // Reset filter desa jika kecamatan berubah
      if (filterType === 'kecamatan') {
        state.desa = 'Semua Desa';
      }
    },
    resetFilters: () => initialState,
  },
});

export const { setFilter, resetFilters } = filterSlice.actions;
export default filterSlice.reducer;