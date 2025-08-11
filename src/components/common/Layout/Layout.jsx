import React from 'react';
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
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
