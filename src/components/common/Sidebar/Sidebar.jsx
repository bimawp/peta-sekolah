import React from 'react';
import { useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  School, 
  DollarSign, 
  Building, 
  MapPin,
  BarChart3,
  Users,
  Settings,
  X
} from 'lucide-react';
import MenuItem from './MenuItem';
import styles from './Sidebar.module.css';

const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/',
    badge: null
  },
  {
    id: 'schools',
    label: 'Data Sekolah',
    icon: School,
    path: '/schools',
    badge: null,
    submenu: [
      { label: 'Semua Sekolah', path: '/schools' },
      { label: 'SD/MI', path: '/schools/sd' },
      { label: 'SMP/MTs', path: '/schools/smp' },
      { label: 'SMA/SMK/MA', path: '/schools/sma' }
    ]
  },
  {
    id: 'map',
    label: 'Peta Sekolah',
    icon: MapPin,
    path: '/map',
    badge: null
  },
  {
    id: 'budget',
    label: 'Anggaran',
    icon: DollarSign,
    path: '/budget',
    badge: 'New'
  },
  {
    id: 'facilities',
    label: 'Fasilitas',
    icon: Building,
    path: '/facilities',
    badge: null
  },
  {
    id: 'analytics',
    label: 'Analitik',
    icon: BarChart3,
    path: '/analytics',
    badge: null
  },
  {
    id: 'users',
    label: 'Pengguna',
    icon: Users,
    path: '/users',
    badge: null
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    icon: Settings,
    path: '/settings',
    badge: null
  }
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className={styles.overlay}
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        {/* Mobile Close Button */}
        <div className={styles.mobileHeader}>
          <button 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          <div className={styles.menuSection}>
            <h3 className={styles.sectionTitle}>Menu Utama</h3>
            <ul className={styles.menuList}>
              {menuItems.slice(0, 3).map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isActive={location.pathname === item.path}
                  onItemClick={onClose}
                />
              ))}
            </ul>
          </div>

          <div className={styles.menuSection}>
            <h3 className={styles.sectionTitle}>Manajemen</h3>
            <ul className={styles.menuList}>
              {menuItems.slice(3, 7).map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isActive={location.pathname === item.path}
                  onItemClick={onClose}
                />
              ))}
            </ul>
          </div>

          <div className={styles.menuSection}>
            <h3 className={styles.sectionTitle}>Sistem</h3>
            <ul className={styles.menuList}>
              {menuItems.slice(7).map((item) => (
                <MenuItem
                  key={item.id}
                  item={item}
                  isActive={location.pathname === item.path}
                  onItemClick={onClose}
                />
              ))}
            </ul>
          </div>
        </nav>

        {/* Footer */}
        <div className={styles.footer}>
          <div className={styles.footerContent}>
            <p className={styles.version}>v1.0.0</p>
            <p className={styles.copyright}>
              © 2024 Dinas Pendidikan
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;