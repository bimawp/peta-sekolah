// src/index.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';

// Impor file-file CSS
import './index.css';
import './styles/globals.css'; // <— Baris ini ditambahkan

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {/* Provider untuk Redux */}
    <Provider store={store}>
      {/* Provider untuk Router */}
      <BrowserRouter>
        {/* Provider untuk Autentikasi */}
        <AuthProvider>
          {/* Provider untuk Tema */}
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);