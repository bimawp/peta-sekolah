import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import budgetReducer from './slices/budgetSlice';
import counterReducer from './slices/counterSlice';
import facilityReducer from './slices/facilitySlice';
import schoolReducer from './slices/schoolSlice';
import uiReducer from './slices/uiSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    budget: budgetReducer,
    counter: counterReducer,
    facility: facilityReducer,
    school: schoolReducer,
    ui: uiReducer,
  },
});

export default store;
