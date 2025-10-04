// src/routes/AppRoutes.jsx

import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

import Layout from '../components/common/Layout/Layout';
import ProtectedRoute from './ProtectedRoute';
import SuspenseLoader from '../components/common/SuspenseLoader/SuspenseLoader';

// Lazy load semua halaman
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const MapPage = lazy(() => import('../pages/Map/Map'));
const LoginPage = lazy(() => import('../pages/Auth/Login'));
const SchoolDetailPage = lazy(() => import('../pages/SchoolDetail/SchoolDetailPage'));
const AdminProfile = lazy(() => import('../pages/AdminProfile/AdminProfile'));
const NotFound = lazy(() => import('../pages/NotFound/NotFound'));

const BudgetPage = lazy(() => import('../pages/Budget/BudgetPage'));
// GANTI BARIS INI: Arahkan ke halaman Fasilitas
const LainnyaPage = lazy(() => import('../pages/Facilities/FacilitiesPage'));

// Komponen Pembungkus untuk Rute yang Dilindungi dan Memiliki Layout
const ProtectedLayout = () => (
  <ProtectedRoute>
    <Layout />
  </ProtectedRoute>
);

const AppRoutes = () => {
  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Gunakan Rute Bersarang untuk semua halaman yang butuh Layout */}
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/peta" element={<MapPage />} />
          <Route path="/detail-sekolah" element={<SchoolDetailPage />} />
          <Route path="/profil" element={<AdminProfile />} />
          <Route path="/anggaran" element={<BudgetPage />} />
          {/* Rute ini sekarang akan menampilkan halaman Fasilitas */}
          <Route path="/lainnya" element={<LainnyaPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;