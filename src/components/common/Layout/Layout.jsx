import React from 'react';
import { Outlet } from 'react-router-dom'; // <-- Impor Outlet
import Header from '../Header/Header';
import Sidebar from '../Sidebar/Sidebar';
import styles from './Layout.module.css';

const Layout = () => {
  // Komponen ini sekarang berfungsi sebagai "cetakan" untuk halaman yang dilindungi.
  // Ia tidak lagi menerima 'children' sebagai properti.
  return (
    <div className={styles.layout}>
      <Sidebar />
      <div className={styles.mainPanel}>
        <Header />
        <main className={styles.content}>
          {/* <Outlet /> akan me-render komponen rute anak (misalnya Dashboard) di sini */}
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
