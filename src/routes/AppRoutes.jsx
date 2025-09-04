// AppRoutes.jsx - FIXED VERSION
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
import { useAuth } from '../contexts/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
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
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Root Route Component
const RootRoute = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
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
  
  // Redirect based on authentication status
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Root route */}
      <Route path="/" element={<RootRoute />} />
      
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      } />
      <Route path="/detail-sekolah" element={
        <ProtectedRoute>
          <SchoolDetailPage />
        </ProtectedRoute>
      } />
      <Route path="/anggaran" element={
        <ProtectedRoute>
          <Budget />
        </ProtectedRoute>
      } />
      <Route path="/lainnya" element={
        <ProtectedRoute>
          <Facilities />
        </ProtectedRoute>
      } />
      <Route path="/map" element={
        <ProtectedRoute>
          <Map />
        </ProtectedRoute>
      } />
      <Route path="/users/profile" element={
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      } />
      <Route path="/users/settings" element={
        <ProtectedRoute>
          <Settings />
        </ProtectedRoute>
      } />
      <Route path="/users/logout" element={
        <ProtectedRoute>
          <Logout />
        </ProtectedRoute>
      } />
      <Route path="/admin/profile" element={
        <ProtectedRoute>
          <AdminProfile />
        </ProtectedRoute>
      } />
      
      {/* 404 - Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;