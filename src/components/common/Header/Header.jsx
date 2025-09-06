// src/components/common/Header/Header.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext'; // Pastikan path ini benar
import styles from './Header.module.css';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Ambil 'profile' dan 'user' dari useAuth
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAdminProfile = () => {
    navigate('/admin/profile');
    setDropdownOpen(false);
  };
  const handleSettings = () => {
    navigate('/users/settings');
    setDropdownOpen(false);
  };
  
  // Fungsi untuk mendapatkan inisial nama
  const getInitials = (name) => {
    if (!name) return user?.email ? user.email.charAt(0).toUpperCase() : 'A';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };


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
         {user && ( // Tampilkan menu hanya jika user sudah login
          <div className={styles.userMenu}>
            <button
              className={styles.userButton}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <div className={styles.userAvatar}>
                {/* Logika untuk menampilkan avatar atau inisial */}
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImage} />
                ) : (
                  <span className={styles.avatarInitials}>
                    {getInitials(profile?.name)}
                  </span>
                )}
              </div>
              <div className={styles.userInfo}>
                 {/* Tampilkan data dari 'profile' jika ada, fallback ke data 'user' */}
                <span className={styles.userName}>{profile?.name || user?.email.split('@')[0]}</span>
                <span className={styles.userRole}>{user?.email}</span>
              </div>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownBody}>
                  <button className={styles.dropdownItem} onClick={handleAdminProfile}>
                    <Shield size={16} />
                    <span>Admin Profile</span>
                  </button>
                  <button className={styles.dropdownItem} onClick={handleSettings}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button className={styles.logoutButton} onClick={handleLogout}>
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
          </div>
         )}
        </div>
      </div>

      {dropdownOpen && <div className={styles.overlay} onClick={() => setDropdownOpen(false)} />}
    </header>
  );
};

export default Header;