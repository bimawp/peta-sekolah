// src/pages/User/Logout.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Logout.module.css';

const Logout = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <div className={styles.container}>
      <p>Logging out...</p>
    </div>
  );
};

export default Logout;
