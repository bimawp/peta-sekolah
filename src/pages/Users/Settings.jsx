// src/pages/User/Settings.jsx
import React from 'react';
import styles from './Settings.module.css';
import { useAuth } from '../../contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      <h2>Settings</h2>
      <p>Pengaturan untuk akun {user?.name || 'Admin User'} akan ditampilkan di sini.</p>
    </div>
  );
};

export default Settings;
