import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice.js';
import budgetSlice from './slices/budgetSlice.js';
import counterSlice from './slices/counterSlice.js';
import facilitySlice from './slices/facilitySlice.js';
import schoolSlice from './slices/schoolSlice.js';
import uiSlice from './slices/uiSlice.js';

const store = configureStore({
  reducer: {
    auth: authSlice,
    budget: budgetSlice,
    counter: counterSlice,
    facility: facilitySlice,
    school: schoolSlice,
    ui: uiSlice,
  },
});

export default store;
