// src/routes/ProtectedRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // DEBUGGING LOG
  console.log("[ProtectedRoute] Rendering with state:", {
    isAuthenticated,
    loading,
    path: location.pathname
  });

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}>
        <div>Checking authentication...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log("[ProtectedRoute] Not authenticated. Redirecting to /login.");
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log("[ProtectedRoute] Authenticated. Rendering children.");
  return children;
};

export default ProtectedRoute;
