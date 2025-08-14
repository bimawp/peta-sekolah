import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  Settings, 
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './Header.module.css';

const Header = ({ onMenuClick, sidebarOpen }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user } = useAuth();

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Left Section */}
        <div className={styles.left}>
          <Link to="/" className={styles.brand}>
            <img 
              src="/assets/logo-disdik.png" 
              alt="Logo Disdik"
              className={styles.logo}
            />
            <div className={styles.brandText}>
              <h1>Peta Sekolah</h1>
              <span>Dinas Pendidikan</span>
            </div>
          </Link>
        </div>

        {/* Right Section */}
        <div className={styles.right}>
          <div className={styles.userMenu}>
            <button 
              className={styles.userButton}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className={styles.userAvatar}>
                <User size={20} />
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.name || 'Admin User'}</span>
                <span className={styles.userRole}>{user?.email || 'admin@disdik.co.id'}</span>
              </div>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownBody}>
                  <Link to="/user/profile" className={styles.dropdownItem}>
                    <User size={16} />
                    <span>Profile</span>
                  </Link>
                  <Link to="/user/settings" className={styles.dropdownItem}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  <Link to="/user/logout" className={styles.dropdownItem}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overlay for mobile dropdown */}
      {dropdownOpen && (
        <div 
          className={styles.overlay}
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;
