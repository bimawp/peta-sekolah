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
  const { pathname } = useLocation();

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

  return { isActive, suppressActive };
}

const Sidebar = () => {
  const { isActive, suppressActive } = useActiveMatcher();
  const [collapsed, setCollapsed] = useState(false); // desktop
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);       // mobile overlay
  const debounceRef = useRef(null);
  const animRef = useRef(null);

  // Broadcast helper → kirim state ke Layout
  const broadcast = useCallback((next = {}) => {
    const payload = {
      collapsed: next.collapsed ?? (collapsed && !isMobile),
      isMobile:  next.isMobile  ?? isMobile,
      isOpen:    next.isOpen    ?? isOpen,
    };
    const ev = new CustomEvent('sidebar:state', { detail: payload });
    window.dispatchEvent(ev);
  }, [collapsed, isMobile, isOpen]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // simpan state collapsed (desktop)
  useEffect(() => {
    if (isMobile) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
      } catch {}
    }, 300);
  }, [collapsed, isMobile]);

  // broadcast setiap ada perubahan penting
  useEffect(() => {
    broadcast();
  }, [collapsed, isMobile, isOpen, broadcast]);

  // broadcast awal setelah mount
  useEffect(() => {
    broadcast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // toggle
  const toggleSidebar = useCallback(() => {
    if (animRef.current) return;
    animRef.current = requestAnimationFrame(() => {
      if (isMobile) {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        broadcast({ isOpen: nextOpen });
      } else {
        setCollapsed(v => {
          const next = !v;
          broadcast({ collapsed: next });
          return next;
        });
      }
      setTimeout(() => { animRef.current = null; }, 250);
    });
  }, [isMobile, isOpen, broadcast]);

  const closeSidebar = useCallback(() => {
    if (isMobile && isOpen) {
      setIsOpen(false);
      broadcast({ isOpen: false });
    }
  }, [isMobile, isOpen, broadcast]);

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

  // ⬇️ Dengarkan perintah toggle dari Header (khusus mobile)
  useEffect(() => {
    const handler = (e) => {
      const { forceOpen, forceClose, toggle } = e.detail || {};
      if (!isMobile) return;

      if (forceOpen) {
        setIsOpen(true);
        broadcast({ isOpen: true });
        return;
      }
      if (forceClose) {
        setIsOpen(false);
        broadcast({ isOpen: false });
        return;
      }
      if (toggle) {
        const next = !isOpen;
        setIsOpen(next);
        broadcast({ isOpen: next });
      }
    };

    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, [isMobile, isOpen, broadcast]);

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
