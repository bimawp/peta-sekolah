import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 1. Saat aplikasi sedang memeriksa status login, tampilkan pesan loading
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading Authentication...</p>
      </div>
    );
  }

  // 2. Setelah selesai memeriksa, jika ternyata tidak login, paksa pengguna kembali ke halaman login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Jika sudah login, izinkan pengguna melihat halaman yang dituju
  return children;
};

export default ProtectedRoute;