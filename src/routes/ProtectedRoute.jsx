// src/routes/ProtectedRoute.jsx - VERSI PERBAIKAN FINAL

import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // 1. Selama status autentikasi sedang diperiksa (saat refresh),
  // tampilkan layar loading di tengah halaman.
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#64748b',
        fontFamily: 'sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  // 2. Setelah selesai memeriksa, jika ternyata pengguna TIDAK login,
  // paksa mereka kembali ke halaman login.
  if (!isAuthenticated) {
    // Simpan halaman yang ingin mereka tuju agar bisa kembali setelah login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Jika pengguna SUDAH login, tampilkan konten yang seharusnya.
  // 'children' di sini adalah komponen <Layout /> dari AppRoutes.jsx
  return children;
};

export default ProtectedRoute;