// src/App.jsx
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

function App() {
  return (
    // Provider untuk Redux menjadi satu-satunya sumber state global
    <Provider store={store}>
      {/* BrowserRouter untuk menangani routing */}
      <BrowserRouter>
        {/* Context Providers untuk tema, otentikasi, dan filter */}
        <AuthProvider>
          <ThemeProvider>
            <FilterProvider>
              {/* AppRoutes menangani semua logika halaman/rute */}
              <AppRoutes />
            </FilterProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;