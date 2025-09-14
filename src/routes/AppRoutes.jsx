// src/routes/AppRoutes.jsx - VERSI PERBAIKAN FINAL

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Dashboard';
import Budget from '../pages/Budget/BudgetPage';
import NotFound from '../pages/NotFound/NotFound';
import Map from '../pages/Map/Map';
import Facilities from '../pages/Facilities/FacilitiesPage';
import SchoolDetailPage from '../pages/SchoolDetail/SchoolDetailPage';
import Login from '../pages/Auth/Login';
import Profile from '../pages/Users/Profile';
import Settings from '../pages/Users/Settings';
import Logout from '../pages/Users/Logout';
import AdminProfile from '../pages/AdminProfile/AdminProfile';
import Layout from '../components/common/Layout/Layout';
import ProtectedRoute from './ProtectedRoute'; // 1. IMPORT DARI FILE TERPISAH

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rute publik (tidak butuh login) */}
      <Route path="/login" element={<Login />} />

      {/* Rute Induk yang dilindungi dan menggunakan Layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Redirect dari "/" ke "/dashboard" jika sudah login */}
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Semua halaman di bawah ini akan ditampilkan di dalam <Layout> */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="detail-sekolah" element={<SchoolDetailPage />} />
        <Route path="anggaran" element={<Budget />} />
        <Route path="lainnya" element={<Facilities />} />
        <Route path="map" element={<Map />} />
        <Route path="users/profile" element={<Profile />} />
        <Route path="users/settings" element={<Settings />} />
        <Route path="users/logout" element={<Logout />} />
        <Route path="admin/profile" element={<AdminProfile />} />
      </Route>

      {/* Halaman 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;