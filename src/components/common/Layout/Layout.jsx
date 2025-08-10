import React from 'react';
import Header from '../Header/Header'; // pastikan ada file Header.jsx
import Sidebar from '../Sidebar/Sidebar'; // pastikan ada file Sidebar.jsx
import styles from './Layout.module.css';

const Layout = ({ children }) => {
  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.contentArea}>
        <Sidebar />
        <main className={styles.mainContent}>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
