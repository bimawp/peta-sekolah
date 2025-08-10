import { configureStore } from '@reduxjs/toolkit';
// import slices di sini misal
// import authReducer from './slices/authSlice';

const store = configureStore({
  reducer: {
    // auth: authReducer,
    // tambahkan reducer lain di sini
  },
});

export default store;
