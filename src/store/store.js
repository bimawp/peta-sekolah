// src/store/store.js - PERBAIKAN KRITIS

import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';
import filterReducer from './slices/filterSlice';
import schoolReducer from './slices/schoolSlice'; // <-- BARIS INI DIPASTIKAN ADA & AKTIF
import budgetReducer from './slices/budgetSlice';
import facilityReducer from './slices/facilitySlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    filter: filterReducer,
    // [PERBAIKAN]: Menambahkan kembali reducer 'schools' yang hilang.
    // Ini memastikan state 'schools' ada di dalam Redux store.
    schools: schoolReducer, 
    budget: budgetReducer,
    facility: facilityReducer,
    ui: uiReducer,
  },
});