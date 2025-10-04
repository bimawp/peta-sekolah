// src/routes/AppRoutes.jsx - GANTI SELURUH ISI FILE DENGAN INI

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import Layout from '../components/common/Layout/Layout';
import ProtectedRoute from './ProtectedRoute';
import SuspenseLoader from '../components/common/SuspenseLoader/SuspenseLoader';

// Impor komponen
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const BudgetPage = lazy(() => import('../pages/Budget/BudgetPage'));
const NotFound = lazy(() => import('../pages/NotFound/NotFound'));
const FacilitiesPage = lazy(() => import('../pages/Facilities/FacilitiesPage'));
const Login = lazy(() => import('../pages/Auth/Login'));
const Profile = lazy(() => import('../pages/Users/Profile'));
const Settings = lazy(() => import('../pages/Users/Settings'));
const Logout = lazy(() => import('../pages/Users/Logout'));
const AdminProfile = lazy(() => import('../pages/AdminProfile/AdminProfile'));

// Ini adalah komponen yang Anda inginkan, yang berisi Peta, Chart, dan Tabel
const SchoolDetailPage = lazy(() => import('../pages/SchoolDetail/SchoolDetailPage'));

const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <SuspenseLoader />;
  }

  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* INI ADALAH RUTE YANG BENAR UNTUK HALAMAN ANDA */}
          <Route path="detail-sekolah" element={<SchoolDetailPage />} />
          
          <Route path="anggaran" element={<BudgetPage />} />
          <Route path="lainnya" element={<FacilitiesPage />} />
          {/* Kita tidak lagi memerlukan halaman /map terpisah */}
          <Route path="users/profile" element={<Profile />} />
          <Route path="users/settings" element={<Settings />} />
          <Route path="users/logout" element={<Logout />} />
          <Route path="admin/profile" element={<AdminProfile />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;