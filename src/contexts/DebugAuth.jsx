// DebugAuth.jsx - Component untuk debug dan clear session
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const DebugAuth = () => {
  const { 
    debugAuthState, 
    clearAllAuthData, 
    forceLogout, 
    isAuthenticated, 
    user,
    loading 
  } = useAuth();

  const handleDebug = () => {
    debugAuthState();
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear all auth data? You will be logged out.')) {
      clearAllAuthData();
      window.location.reload();
    }
  };

  const handleForceLogout = async () => {
    if (window.confirm('Force logout?')) {
      await forceLogout();
      window.location.reload();
    }
  };

  // Hanya tampilkan jika di development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '15px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '300px'
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>🛠️ Auth Debug Panel</h4>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong> {loading ? 'Loading...' : isAuthenticated ? 'Logged In' : 'Logged Out'}
      </div>
      
      {user && (
        <div style={{ marginBottom: '10px' }}>
          <strong>User:</strong> {user.email}
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button onClick={handleDebug} style={buttonStyle}>
          Debug State
        </button>
        <button onClick={handleClearAll} style={buttonStyle}>
          Clear All
        </button>
        <button onClick={handleForceLogout} style={buttonStyle}>
          Force Logout
        </button>
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: '5px 8px',
  fontSize: '11px',
  border: '1px solid #999',
  background: '#fff',
  borderRadius: '4px',
  cursor: 'pointer'
};

export default DebugAuth;