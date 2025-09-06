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

// Komponen ini tidak perlu lagi memeriksa isAuthenticated
function AppContent() {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

  // Cukup periksa apakah ini halaman login atau bukan
  // Jika ya, render AppRoutes saja. Jika tidak, bungkus dengan Layout.
  return isLoginPage ? <AppRoutes /> : (
    <Layout>
      <AppRoutes />
    </Layout>
  );
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