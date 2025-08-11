// di src/index.js atau App.jsx
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import React from 'react';
import 'leaflet/dist/leaflet.css';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './store/store'; // pastikan path store benar
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { FilterProvider } from './contexts/FilterContext';
import AppRoutes from './routes/AppRoutes';
import Layout from './components/common/Layout/Layout'; // sesuaikan path jika beda
import './App.css';
import './styles/globals.css';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <FilterProvider>
              <Layout>
                <AppRoutes />
              </Layout>
            </FilterProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
