import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute'; // Import penjaga yang baru kita buat

// Import semua komponen halaman Anda
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

const AppRoutes = () => {
  return (
    <Routes>
      {/* Rute publik, bisa diakses siapa saja */}
      <Route path="/login" element={<Login />} />

      {/* Semua rute di bawah ini sekarang dilindungi */}
      <Route
        path="/"
        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
      />
      <Route
        path="/detail-sekolah"
        element={<ProtectedRoute><SchoolDetailPage /></ProtectedRoute>}
      />
      <Route
        path="/anggaran"
        element={<ProtectedRoute><Budget /></ProtectedRoute>}
      />
      <Route
        path="/lainnya"
        element={<ProtectedRoute><Facilities /></ProtectedRoute>}
      />
      <Route
        path="/map"
        element={<ProtectedRoute><Map /></ProtectedRoute>}
      />
      <Route
        path="/users/profile"
        element={<ProtectedRoute><Profile /></ProtectedRoute>}
      />
      <Route
        path="/users/settings"
        element={<ProtectedRoute><Settings /></ProtectedRoute>}
      />
      <Route
        path="/users/logout"
        element={<ProtectedRoute><Logout /></ProtectedRoute>}
      />

      {/* Halaman "tidak ditemukan" juga dilindungi */}
      <Route
        path="*"
        element={<ProtectedRoute><NotFound /></ProtectedRoute>}
      />
    </Routes>
  );
};

export default AppRoutes;