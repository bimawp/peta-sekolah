// src/pages/User/Profile.jsx
import React from 'react';
import styles from './Profile.module.css';
import { useAuth } from '../../contexts/AuthContext';

const Profile = () => {
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      <h2>Profile</h2>
      <div className={styles.info}>
        <p><strong>Nama:</strong> {user?.name || 'Admin User'}</p>
        <p><strong>Email:</strong> {user?.email || 'admin@disdik.go.id'}</p>
        <p><strong>Role:</strong> {user?.role || 'Administrator'}</p>
      </div>
    </div>
  );
};

export default Profile;
