// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import schoolReducer from './slices/schoolSlice';

export const store = configureStore({
  reducer: {
    schools: schoolReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export default store;