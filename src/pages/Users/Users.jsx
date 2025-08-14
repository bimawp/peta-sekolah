// src/pages/User/User.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import styles from './User.module.css';

const User = () => {
  return (
    <div className={styles.container}>
      <h2>User Dashboard</h2>
      <Outlet /> {/* Tempat render subroute seperti Profile/Settings */}
    </div>
  );
};

export default User;
