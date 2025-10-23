// src/components/common/Sidebar/Sidebar.jsx

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import {
  LayoutDashboard,
  Building,
  Wallet,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import MenuItem from './MenuItem';
import styles from './Sidebar.module.css';

// MENU: Dashboard, Detail Sekolah, Anggaran, Lainnya (TANPA "Fasilitas")
const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={20} />,
    path: '/',
    description: 'Lihat statistik umum'
  },
  {
    id: 'detail',
    label: 'Detail Sekolah',
    icon: <Building size={20} />,
    path: '/detail-sekolah',
    description: 'Informasi lengkap sekolah'
  },
  {
    id: 'anggaran',
    label: 'Anggaran',
    icon: <Wallet size={20} />,
    path: '/anggaran',
    description: 'Rekap & monitoring anggaran'
  },
  {
    id: 'lainnya',
    label: 'Lainnya',
    icon: <MoreHorizontal size={20} />,
    path: '/lainnya',
    description: 'Menu tambahan'
  }
];

// helper untuk menentukan menu aktif
function useActiveMatcher() {
  const location = useLocation();
  const { pathname } = location;

  // Rute yang dianggap "Detail Sekolah" agar highlight konsisten
  const detailPaths = [
    '/detail-sekolah',
    '/sd/school_detail',
    '/smp/school_detail',
    '/paud/school_detail',
    '/pkbm/school_detail',
  ];

  const isActive = useCallback((itemPath) => {
    if (itemPath === '/') return pathname === '/';
    if (itemPath === '/detail-sekolah') {
      return detailPaths.some(p => pathname.startsWith(p));
    }
    if (itemPath === '/anggaran') return pathname.startsWith('/anggaran');
    if (itemPath === '/lainnya')  return pathname.startsWith('/lainnya');

    return pathname.startsWith(itemPath);
  }, [pathname]);

  // Khusus: saat berada di /facilities, JANGAN sorot menu apa pun
  const suppressActive = pathname.startsWith('/facilities');

  return { isActive, suppressActive, pathname };
}

const Sidebar = () => {
  const { isActive, suppressActive } = useActiveMatcher();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef(null);
  const animationRef = useRef(null);

  // cek mobile
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    if (!mobile && isOpen) setIsOpen(false);
  }, [isOpen]);

  // init
  useEffect(() => {
    checkMobile();
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved) setCollapsed(JSON.parse(saved));
    } catch {}
    const handleResize = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(checkMobile, 100);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(debounceRef.current);
    };
  }, [checkMobile]);

  // simpan state collapsed
  useEffect(() => {
    if (isMobile) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
      } catch {}
    }, 300);
  }, [collapsed, isMobile]);

  // toggle
  const toggleSidebar = useCallback(() => {
    if (animationRef.current) return;
    animationRef.current = requestAnimationFrame(() => {
      if (isMobile) setIsOpen(v => !v);
      else setCollapsed(v => !v);
      setTimeout(() => { animationRef.current = null; }, 250);
    });
  }, [isMobile]);

  const closeSidebar = useCallback(() => {
    if (isMobile && isOpen) setIsOpen(false);
  }, [isMobile, isOpen]);

  // esc to close (mobile)
  useEffect(() => {
    if (!isMobile || !isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') closeSidebar(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen, closeSidebar]);

  const sidebarClasses = [
    styles.sidebar,
    collapsed && !isMobile && styles.collapsed,
    isMobile && isOpen && styles.open
  ].filter(Boolean).join(' ');

  return (
    <>
      <aside className={sidebarClasses} role="navigation" aria-label="Menu navigasi utama">
        <div className={styles.header}>
          {(!collapsed || isMobile) && (
            <div className={styles.logoSection}>
              <h1 className={styles.logo}>Disdik Garut</h1>
              <div className={styles.tagline}>Pendidikan Berkualitas</div>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={styles.toggleBtn}
            aria-label={isMobile ? (isOpen ? 'Tutup menu' : 'Buka menu') : (collapsed ? 'Perluas sidebar' : 'Perkecil sidebar')}
            type="button"
          >
            {isMobile ? (isOpen ? <X size={24} /> : <Menu size={24} />)
                      : (collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />)}
          </button>
        </div>

        <nav className={styles.menu} role="menubar">
          {menuItems.map(({ id, label, icon, path, description }) => (
            <MenuItem
              key={id}
              icon={icon}
              label={label}
              to={path}
              description={description}
              active={!suppressActive && isActive(path)}
              collapsed={collapsed && !isMobile}
              onClick={closeSidebar}
              role="menuitem"
            />
          ))}
        </nav>

        {!collapsed && !isMobile && (
          <div className={styles.footer}>
            <div className={styles.version}>v2.0.0</div>
          </div>
        )}
      </aside>

      {isMobile && isOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={closeSidebar}
          role="button"
          tabIndex={0}
          aria-label="Tutup menu"
          onKeyDown={(e) => e.key === 'Enter' && closeSidebar()}
        />
      )}
    </>
  );
};

export default Sidebar;
