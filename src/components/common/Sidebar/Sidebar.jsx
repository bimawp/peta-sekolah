// src/components/common/Sidebar/Sidebar.jsx

import React, { useState, useEffect, useCallback } from 'react';
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
    description: 'Kelola keuangan'
  },
  { 
    id: 'lainnya', 
    label: 'Lainnya', 
    icon: <MoreHorizontal size={20} />, 
    path: '/lainnya',
    description: 'Menu tambahan'
  }
];

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => {
    // Restore collapsed state from localStorage
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Improved mobile detection with debouncing
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth <= 768;
    if (mobile !== isMobile) {
      setIsMobile(mobile);
      
      // Close mobile sidebar when switching to desktop
      if (!mobile && isOpen) {
        setIsOpen(false);
      }
    }
  }, [isMobile, isOpen]);

  useEffect(() => {
    checkMobile();
    
    let timeoutId;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 150);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, [checkMobile]);

  // Save collapsed state to localStorage
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
    }
  }, [collapsed, isMobile]);

  // Update body class for layout adjustment with CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    
    if (isMobile) {
      root.style.removeProperty('--sidebar-offset');
      return;
    }

    const sidebarWidth = collapsed ? 80 : 280;
    root.style.setProperty('--sidebar-offset', `${sidebarWidth}px`);

    return () => {
      root.style.removeProperty('--sidebar-offset');
    };
  }, [collapsed, isMobile]);

  // Enhanced toggle with animation state
  const toggleSidebar = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    
    if (isMobile) {
      setIsOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
    
    // Reset animation state
    setTimeout(() => setIsAnimating(false), 300);
  }, [isMobile, isAnimating]);

  const closeSidebar = useCallback(() => {
    if (isMobile && isOpen) {
      setIsAnimating(true);
      setIsOpen(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  }, [isMobile, isOpen]);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isMobile && isOpen) {
        closeSidebar();
      }
    };

    if (isMobile && isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when mobile sidebar is open
      document.body.style.overflow = 'hidden';
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isMobile, isOpen, closeSidebar]);

  // Generate dynamic classes
  const sidebarClasses = [
    styles.sidebar,
    collapsed && !isMobile ? styles.collapsed : '',
    isMobile && isOpen ? styles.open : '',
    isAnimating ? styles.animating : ''
  ].filter(Boolean).join(' ');

  // Logo component for better organization
  const LogoSection = () => (
    <div className={styles.logoSection}>
      <h1 className={styles.logo}>
        Disdik Garut
      </h1>
      {!collapsed && !isMobile && (
        <div className={styles.tagline}>
          Pendidikan Berkualitas
        </div>
      )}
    </div>
  );

  // Toggle button with better UX
  const ToggleButton = () => {
    const getIcon = () => {
      if (isMobile) {
        return isOpen ? <X size={24} /> : <Menu size={24} />;
      }
      return collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />;
    };

    const getAriaLabel = () => {
      if (isMobile) {
        return isOpen ? 'Tutup menu' : 'Buka menu';
      }
      return collapsed ? 'Perluas sidebar' : 'Perkecil sidebar';
    };

    return (
      <button 
        onClick={toggleSidebar} 
        className={styles.toggleBtn}
        aria-label={getAriaLabel()}
        disabled={isAnimating}
        type="button"
      >
        {getIcon()}
      </button>
    );
  };

  return (
    <>
      <aside 
        className={sidebarClasses}
        role="navigation"
        aria-label="Menu navigasi utama"
      >
        <div className={styles.header}>
          {(!collapsed || isMobile) && <LogoSection />}
          <ToggleButton />
        </div>

        <nav className={styles.menu} role="menubar">
          {menuItems.map(({ id, label, icon, path, description }) => (
            <MenuItem 
              key={id}
              icon={icon}
              label={label}
              to={path}
              description={description}
              active={location.pathname === path}
              collapsed={collapsed && !isMobile}
              onClick={closeSidebar}
              role="menuitem"
            />
          ))}
        </nav>

        {/* Footer section for additional info */}
        {!collapsed && !isMobile && (
          <div className={styles.footer}>
            <div className={styles.version}>
              v2.0.0
            </div>
          </div>
        )}
      </aside>

      {/* Enhanced mobile overlay with better accessibility */}
      {isMobile && isOpen && (
        <div 
          className={styles.sidebarOverlay} 
          onClick={closeSidebar}
          onKeyDown={(e) => e.key === 'Enter' && closeSidebar()}
          role="button"
          tabIndex={0}
          aria-label="Tutup menu dengan klik di luar"
        />
      )}
    </>
  );
};

export default Sidebar;