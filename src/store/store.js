// src/store/store.js - FIXED

import { configureStore } from '@reduxjs/toolkit';
// Tambahkan ekstensi .js pada setiap import slice
import schoolReducer from './slices/schoolSlice.js';
import budgetReducer from './slices/budgetSlice.js';
import facilityReducer from './slices/facilitySlice.js';
import uiReducer from './slices/uiSlice.js';
import filterReducer from './slices/filterSlice.js'; // <-- IMPOR BARU

const store = configureStore({
  reducer: {
    // Reducer auth sudah dihapus
    school: schoolReducer,
    filters: filterReducer,
    budget: budgetReducer,
    facility: facilityReducer,
    ui: uiReducer,
  },
});

export default store;