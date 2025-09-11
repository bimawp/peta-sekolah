import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Header from '../Header/Header';
import styles from './Layout.module.css';

const Layout = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Efek untuk memeriksa ukuran layar dan mengatur state isMobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile(); // Cek saat pertama kali render
    window.addEventListener('resize', checkMobile);

    // Cleanup listener saat komponen di-unmount
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className={styles.layoutContainer}>
      {/* Sidebar menerima state dan fungsi untuk mengubahnya */}
      <Sidebar
        isMobile={isMobile}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <div className={styles.mainContent}>
        {/* Header menerima state dan fungsi untuk membuka sidebar */}
        <Header
          isMobile={isMobile}
          onMenuClick={() => setIsSidebarOpen(true)}
        />
        
        {/* 'children' adalah <AppRoutes /> yang Anda kirim dari App.jsx */}
        <main className={styles.pageContent}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
