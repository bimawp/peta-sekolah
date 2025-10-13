// src/AppContent.jsx

import React from 'react';
import { useAuth } from './contexts/AuthContext';
import AppRoutes from './routes/AppRoutes';
import SuspenseLoader from './components/common/SuspenseLoader/SuspenseLoader';

function AppContent() {
  const { loading } = useAuth();

  // Tampilkan loader selagi status otentikasi diperiksa
  if (loading) {
    return <SuspenseLoader />;
  }

  // Setelah selesai, serahkan ke komponen router utama
  return <AppRoutes />;
}

export default AppContent;