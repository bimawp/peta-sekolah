// AppContent.jsx - SIMPLE VERSION
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/common/Layout/Layout';
import AppRoutes from './routes/AppRoutes';

function AppContent() {
  const location = useLocation();
  const { loading } = useAuth();

  console.log('🔍 AppContent render:', {
    pathname: location.pathname,
    loading: loading
  });

  // Show loading state saat auth masih loading
  if (loading) {
    console.log('⏳ AppContent: Showing loading state');
    return (
      <div style={{ 
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>Loading...</div>
      </div>
    );
  }

  const isLoginPage = location.pathname === '/login';
  console.log('🔍 AppContent: isLoginPage =', isLoginPage);

  // Jika halaman login, render tanpa Layout
  if (isLoginPage) {
    console.log('📝 AppContent: Rendering login page without layout');
    return <AppRoutes />;
  }

  // Semua halaman lain menggunakan Layout
  console.log('🏠 AppContent: Rendering with layout');
  return (
    <Layout>
      <AppRoutes />
    </Layout>
  );
}

export default AppContent;