// src/pages/Users/Logout.jsx - VERSI FINAL

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Logout = () => {
  const { logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fungsi untuk melakukan logout dan redirect
    const performLogout = async () => {
      // Hanya jalankan logout jika user masih terautentikasi
      if (isAuthenticated) {
        await logout();
      }
      // Arahkan ke halaman login setelah selesai
      navigate('/login', { replace: true });
    };

    performLogout();
  }, [logout, navigate, isAuthenticated]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh' 
    }}>
      <p>Anda sedang keluar...</p>
    </div>
  );
};

export default Logout;