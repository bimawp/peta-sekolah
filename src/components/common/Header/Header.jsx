// src/components/common/Header/Header.jsx - VERSI FINAL YANG SUDAH DIPERKUAT (ANTI-CRASH)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import styles from './Header.module.css';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Ambil data user dan profile dari context
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleNavigate = (path) => {
    navigate(path);
    setDropdownOpen(false);
  };
  
  // Fungsi ini sekarang lebih aman
  const getInitials = (name) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(part => part.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  // Fungsi ini sekarang lebih aman
  const getRoleDisplayName = (role) => {
    const roleNames = {
      'admin': 'Administrator', 
      'kepala_dinas': 'Kepala Dinas', 
      'staff': 'Staff', 
      'guru': 'Guru', 
      'operator': 'Operator'
    };
    return roleNames[role?.toLowerCase()] || role?.replace('_', ' ').toUpperCase() || 'User';
  };

  // Efek untuk menutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpen && !event.target.closest(`.${styles.userMenu}`)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [dropdownOpen]);

  // JANGAN RENDER APAPUN jika user atau profile belum ada, untuk mencegah error
  // Ini adalah pengaman tambahan yang sangat penting
  if (!user || !profile) {
    return null; // Atau tampilkan placeholder header yang sederhana
  }

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Bagian Kiri Header - Logo dan Teks Dinas */}
        <div className={styles.left}>
          <div className={styles.logoSection}>
            <div className={styles.logoIcon}>
              <img src="/assets/logo-disdik.png" alt="Logo Disdik" className={styles.logoImage} />
            </div>
            <div className={styles.logoText}>
              <h1 className={styles.mainTitle}>Dinas Pendidikan</h1>
              <p className={styles.subtitle}>Kabupaten Garut</p>
            </div>
          </div>
        </div>

        {/* Bagian Kanan Header - Menu User */}
        <div className={styles.right}>
          <div className={`${styles.userMenu} userMenu`}>
            <button
              className={styles.userButton}
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <div className={styles.userInfo}>
                {/* PERBAIKAN: Gunakan optional chaining (?.) untuk akses aman */}
                <span className={styles.userName}>{profile?.name || user.email.split('@')[0]}</span>
                <span className={styles.userRole}>{getRoleDisplayName(profile?.role)}</span>
              </div>
              <div className={styles.userAvatar}>
                {/* PERBAIKAN: Gunakan optional chaining (?.) */}
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className={styles.avatarImage}/>
                ) : (
                  <span className={styles.avatarInitials}>{getInitials(profile?.name)}</span>
                )}
              </div>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                   <div className={styles.dropdownAvatar}>
                    {/* PERBAIKAN: Gunakan optional chaining (?.) */}
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar"/>
                    ) : (
                      <span className={styles.dropdownInitials}>{getInitials(profile?.name)}</span>
                    )}
                   </div>
                   <div className={styles.dropdownUserInfo}>
                    {/* PERBAIKAN: Gunakan optional chaining (?.) */}
                    <span className={styles.dropdownUserName}>{profile?.name}</span>
                    <span className={styles.dropdownUserEmail}>{user.email}</span>
                   </div>
                </div>
                <div className={styles.dropdownDivider}></div>
                <button className={styles.dropdownItem} onClick={() => handleNavigate('/admin/profile')}>
                  <Shield size={16} />
                  <span>Profil Admin</span>
                </button>
                <button className={styles.dropdownItem} onClick={() => handleNavigate('/users/settings')}>
                  <Settings size={16} />
                  <span>Pengaturan</span>
                </button>
                <div className={styles.dropdownDivider}></div>
                <button className={styles.logoutButton} onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Keluar</span>
                </button>
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
