import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTheme } from '../../../contexts/ThemeContext';
import styles from './Header.module.css';

const Header = ({ onMenuClick, sidebarOpen }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Left Section */}
        <div className={styles.left}>
          <button 
            className={styles.menuButton}
            onClick={onMenuClick}
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          
          <Link to="/" className={styles.brand}>
            <img 
              src="/images/logo-disdik.png" 
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
          {/* Theme Toggle */}
          <button 
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {/* Notifications */}
          <button className={styles.notificationButton}>
            <Bell size={20} />
            <span className={styles.badge}>3</span>
          </button>

          {/* User Menu */}
          <div className={styles.userMenu}>
            <button 
              className={styles.userButton}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className={styles.userAvatar}>
                <User size={20} />
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user?.name || 'Admin'}</span>
                <span className={styles.userRole}>{user?.role || 'Administrator'}</span>
              </div>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.userDetails}>
                    <strong>{user?.name || 'Admin User'}</strong>
                    <span>{user?.email || 'admin@example.com'}</span>
                  </div>
                </div>
                
                <div className={styles.dropdownBody}>
                  <Link to="/profile" className={styles.dropdownItem}>
                    <User size={16} />
                    <span>Profile</span>
                  </Link>
                  <Link to="/settings" className={styles.dropdownItem}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                </div>
                
                <div className={styles.dropdownFooter}>
                  <button 
                    className={styles.logoutButton}
                    onClick={handleLogout}
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
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