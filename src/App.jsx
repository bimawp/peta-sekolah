// src/App.jsx

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider as ReduxProvider } from 'react-redux';
import { store } from './store/store';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppContent from './AppContent';

// Impor CSS utama
import './index.css';

function App() {
  return (
    <ReduxProvider store={store}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ReduxProvider>
  );
}

export default App;