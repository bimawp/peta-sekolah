// src/components/common/Layout/Layout.jsx - VERSI UPDATED

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar'; 
import Header from '../Header/Header';   
import styles from './Layout.module.css';

const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleSidebarToggle = (collapsed) => {
    setSidebarCollapsed(collapsed);
  };

  return (
    <div className={styles.layoutContainer}>
      {/* Sidebar dengan callback untuk handle toggle */}
      <Sidebar onToggle={handleSidebarToggle} />
      
      {/* Main panel dengan class conditional untuk sidebar state */}
      <div className={`${styles.mainPanel} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>
        {/* Header fixed position */}
        <Header />
        
        {/* Content area tempat Outlet dirender */}
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;