import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './Header.module.css';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // pakai logout dari context
    navigate('/login'); // redirect ke login
  };

  const handleProfile = () => navigate('/users/profile');
  const handleSettings = () => navigate('/users/settings');
  const handleAdminProfile = () => navigate('/admin/profile');

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Left */}
        <div className={styles.left}>
          <div className={styles.brand} onClick={() => navigate('/')}>
            <img src="/assets/logo-disdik.png" alt="Logo" className={styles.logo} />
            <div className={styles.brandText}>
              <h1>Peta Sekolah</h1>
              <span>Dinas Pendidikan</span>
            </div>
          </div>
        </div>

        {/* Right */}
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
                <span className={styles.userRole}>{user?.email || 'admin@disdik.go.id'}</span>
              </div>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownBody}>
                  <button className={styles.dropdownItem} onClick={handleProfile}>
                    <User size={16} />
                    <span>Profile</span>
                  </button>
                  <button className={styles.dropdownItem} onClick={handleSettings}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
<button className={styles.adminProfileButton} onClick={handleAdminProfile}>
  <Shield size={16} />
  <span>Admin Profile</span>
</button>
                  <button className={styles.logoutButton} onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {dropdownOpen && <div className={styles.overlay} onClick={() => setDropdownOpen(false)} />}
    </header>
  );
};

export default Header;
