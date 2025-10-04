// src/index.jsx - GANTI SELURUH ISI FILE DENGAN INI

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store'; // Pastikan path ini benar
import { AuthProvider } from './contexts/AuthContext';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Provider ini akan membuat Redux 'store' tersedia 
      untuk semua komponen di dalam aplikasi Anda 
    */}
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);