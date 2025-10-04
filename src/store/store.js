// src/store/store.js

import { configureStore } from '@reduxjs/toolkit';
import schoolReducer from './slices/schoolSlice.js';
import filterReducer from './slices/filterSlice.js';
import uiReducer from './slices/uiSlice.js';
import selectedSchoolReducer from './slices/selectedSchoolSlice.js'; // <- Pastikan ini diimpor
import dashboardReducer from './slices/dashboardSlice.js';

export const store = configureStore({
  reducer: {
    schools: schoolReducer,
    filter: filterReducer,
    ui: uiReducer,
    selectedSchool: selectedSchoolReducer, // <- Pastikan ini terdaftar
    dashboard: dashboardReducer,
  },
});