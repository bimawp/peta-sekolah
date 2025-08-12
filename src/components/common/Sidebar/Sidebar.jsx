import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { 
  LayoutDashboard, 
  Building,         // Ganti BuildingLibrary dengan Building
  Wallet,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import MenuItem from './MenuItem';
import styles from './Sidebar.module.css';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/' },
  { id: 'detail', label: 'Detail Sekolah', icon: <Building size={20} />, path: '/detail-sekolah' }, // ganti icon juga
  { id: 'anggaran', label: 'Anggaran', icon: <Wallet size={20} />, path: '/anggaran' },
  { id: 'lainnya', label: 'Lainnya', icon: <MoreHorizontal size={20} />, path: '/lainnya' }
];

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setCollapsed(!collapsed);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!collapsed && <h1 className={styles.logo}>Disdik Garut</h1>}
        <button onClick={toggleSidebar} className={styles.toggleBtn} aria-label="Toggle sidebar">
          {collapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
        </button>
      </div>

      <nav className={styles.menu}>
        {menuItems.map(({ id, label, icon, path }) => (
          <MenuItem 
            key={id}
            icon={icon}
            label={label}
            to={path}
            active={location.pathname === path}
            collapsed={collapsed}
          />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
