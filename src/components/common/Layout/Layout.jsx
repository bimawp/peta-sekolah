import React, { useState } from 'react';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import styles from './Layout.module.css';

const Layout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setCollapsed(prev => !prev);

  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.contentArea}>
        <Sidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
        <main
          className={`${styles.mainContent} ${collapsed ? styles.mainContentCollapsed : ''}`}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
