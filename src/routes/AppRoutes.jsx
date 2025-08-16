// AppRoutes.jsx
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
import { useAuth } from '../contexts/AuthContext';

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Semua route lain diproteksi */}
      <Route
        path="/"
        element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/detail-sekolah"
        element={isAuthenticated ? <SchoolDetailPage /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/anggaran"
        element={isAuthenticated ? <Budget /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/lainnya"
        element={isAuthenticated ? <Facilities /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/map"
        element={isAuthenticated ? <Map /> : <Navigate to="/login" replace />}
      />

      {/* Routes untuk user menu */}
      <Route
        path="/users/profile"
        element={isAuthenticated ? <Profile /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/users/settings"
        element={isAuthenticated ? <Settings /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/users/logout"
        element={isAuthenticated ? <Logout /> : <Navigate to="/login" replace />}
      />

      {/* Catch-all */}
      <Route
        path="*"
        element={isAuthenticated ? <NotFound /> : <Navigate to="/login" replace />}
      />
    </Routes>
  );
};

export default AppRoutes;
