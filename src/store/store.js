import { configureStore } from '@reduxjs/toolkit';

// Tambahkan ekstensi .js pada semua import di bawah ini
import uiSlice from './slices/uiSlice.js';
import filterSlice from './slices/filterSlice.js';
import budgetSlice from './slices/budgetSlice.js';
import schoolReducer from './slices/schoolSlice.js'; 

export const store = configureStore({
  reducer: {
    // Kunci 'schools' di sini sudah cocok dengan useSelector(state => state.schools)
    schools: schoolReducer,
    ui: uiSlice,
    filters: filterSlice,
    budget: budgetSlice,
  },
});

export default store;