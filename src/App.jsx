// src/App.jsx - VERSI FINAL YANG SUDAH DIGABUNGKAN DAN BENAR

import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FilterProvider } from './contexts/FilterContext';
import AppRoutes from './routes/AppRoutes';
import './App.css';
import './styles/globals.css';

// Komponen AppContent ini sekarang sudah tidak diperlukan lagi,
// kita bisa langsung merender AppRoutes di dalam App.
// Ini membuat kode lebih sederhana.

function App() {
  return (
    // 1. Provider untuk Redux (jika Anda menggunakannya)
    <Provider store={store}>
      {/* 2. BrowserRouter untuk menangani routing di seluruh aplikasi */}
      <BrowserRouter>
        {/* 3. AuthProvider untuk mengelola status login pengguna */}
        <AuthProvider>
          {/* 4. Provider lain seperti Theme dan Filter */}
          <ThemeProvider>
            <FilterProvider>
              {/* 5. AppRoutes akan menangani semua logika halaman/URL */}
              <AppRoutes />
            </FilterProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;