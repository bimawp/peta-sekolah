// src/AppContent.jsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/common/Layout/Layout';
import AppRoutes from './routes/AppRoutes';

function AppContent() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isLoginPage = location.pathname === '/login';

  // Jika user belum login atau berada di halaman login, render AppRoutes saja
  if (!isAuthenticated || isLoginPage) return <AppRoutes />;

  // Render layout global + routes tanpa menampilkan list sekolah
  return (
    <Layout>
      <AppRoutes />
    </Layout>
  );
}

export default AppContent;
