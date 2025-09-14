// src/components/common/Sidebar/Sidebar.jsx - FIXED VERSION

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
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef(null);
  const animationRef = useRef(null);

  // Simplified mobile detection
  const checkMobile = useCallback(() => {
    const mobile = window.innerWidth <= 768;
    setIsMobile(mobile);
    if (!mobile && isOpen) {
      setIsOpen(false);
    }
  }, [isOpen]);

  // Initialize on mount
  useEffect(() => {
    checkMobile();
    
    // Load saved state only once on mount
    try {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved) {
        setCollapsed(JSON.parse(saved));
      }
    } catch (error) {
      console.warn('Failed to load sidebar state:', error);
    }

    const handleResize = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(checkMobile, 100);
    };

    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [checkMobile]);

  // Save collapsed state (debounced)
  useEffect(() => {
    if (!isMobile) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        try {
          localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
        } catch (error) {
          console.warn('Failed to save sidebar state:', error);
        }
      }, 300);
    }
  }, [collapsed, isMobile]);

  // Optimized toggle function
  const toggleSidebar = useCallback(() => {
    // Prevent rapid clicking
    if (animationRef.current) {
      return;
    }

    animationRef.current = requestAnimationFrame(() => {
      if (isMobile) {
        setIsOpen(prev => !prev);
      } else {
        setCollapsed(prev => !prev);
      }
      
      // Reset animation lock
      setTimeout(() => {
        animationRef.current = null;
      }, 250);
    });
  }, [isMobile]);

  const closeSidebar = useCallback(() => {
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  // Keyboard handling
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen, closeSidebar]);

  // Dynamic classes
  const sidebarClasses = [
    styles.sidebar,
    collapsed && !isMobile && styles.collapsed,
    isMobile && isOpen && styles.open
  ].filter(Boolean).join(' ');

  return (
    <>
      <aside 
        className={sidebarClasses}
        role="navigation"
        aria-label="Menu navigasi utama"
      >
        <div className={styles.header}>
          {(!collapsed || isMobile) && (
            <div className={styles.logoSection}>
              <h1 className={styles.logo}>
                Disdik Garut
              </h1>
              <div className={styles.tagline}>
                Pendidikan Berkualitas
              </div>
            </div>
          )}
          
          <button 
            onClick={toggleSidebar} 
            className={styles.toggleBtn}
            aria-label={isMobile ? 
              (isOpen ? 'Tutup menu' : 'Buka menu') : 
              (collapsed ? 'Perluas sidebar' : 'Perkecil sidebar')
            }
            type="button"
          >
            {isMobile ? 
              (isOpen ? <X size={24} /> : <Menu size={24} />) :
              (collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />)
            }
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
              active={location.pathname === path}
              collapsed={collapsed && !isMobile}
              onClick={closeSidebar}
              role="menuitem"
            />
          ))}
        </nav>

        {!collapsed && !isMobile && (
          <div className={styles.footer}>
            <div className={styles.version}>
              v2.0.0
            </div>
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