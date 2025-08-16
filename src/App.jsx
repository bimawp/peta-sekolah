// Import CSS eksternal
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import React from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FilterProvider } from './contexts/FilterContext';
import AppRoutes from './routes/AppRoutes';
import Layout from './components/common/Layout/Layout';

import './App.css';
import './styles/globals.css';

// Wrapper agar bisa akses location
function AppContent() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLoginPage = location.pathname === '/login';

  // Jika di halaman login, tampilkan AppRoutes tanpa Layout
  if (isLoginPage) {
    return <AppRoutes />;
  }

  // Jika sudah login, tampilkan Layout + AppRoutes
  if (isAuthenticated) {
    return (
      <Layout>
        <AppRoutes />
      </Layout>
    );
  }

  // Jika belum login dan bukan di /login, redirect ke /login
  return <AppRoutes />;
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <FilterProvider>
              <AppContent />
            </FilterProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
