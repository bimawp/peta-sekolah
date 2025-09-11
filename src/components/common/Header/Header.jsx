// src/components/common/Header/Header.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Settings, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext'; // Pastikan path ini benar
import styles from './Header.module.css';

const Header = () => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Ambil 'profile', 'user', dan 'refreshProfile' dari useAuth
  const { user, profile, logout, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Refresh profile data ketika component dimount jika user ada tapi profile belum ada
  useEffect(() => {
    if (user && !profile && refreshProfile) {
      refreshProfile();
    }
  }, [user, profile, refreshProfile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAdminProfile = () => {
    navigate('/admin/profile');
    setDropdownOpen(false);
  };

  const handleSettings = () => {
    // Jika sudah di halaman admin profile, ubah activeView ke settings
    if (location.pathname === '/admin/profile') {
      // Trigger perubahan view ke settings di komponen AdminProfile
      // Karena tidak bisa langsung mengakses state komponen lain,
      // kita akan menggunakan URL parameter atau redirect ke tab settings
      navigate('/admin/profile?view=settings');
    } else {
      // Jika di halaman lain, redirect ke admin profile dengan view settings
      navigate('/admin/profile?view=settings');
    }
    setDropdownOpen(false);
  };
  
  // Fungsi untuk mendapatkan inisial nama (sinkron dengan AdminProfile.jsx)
  const getInitials = (name) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  // Fungsi untuk mendapatkan display name role (sinkron dengan AdminProfile.jsx)
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
                {/* Logika untuk menampilkan avatar atau inisial (sinkron dengan AdminProfile.jsx) */}
                {profile?.avatar_url ? (
                  <img 
                    src={profile.avatar_url} 
                    alt="Avatar" 
                    className={styles.avatarImage}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span 
                  className={styles.avatarInitials}
                  style={{ display: profile?.avatar_url ? 'none' : 'flex' }}
                >
                  {getInitials(profile?.name)}
                </span>
              </div>
              <div className={styles.userInfo}>
                {/* Tampilkan data dari 'profile' jika ada, fallback ke data 'user' */}
                <span className={styles.userName}>
                  {profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0]}
                </span>
                <span className={styles.userRole}>
                  {profile?.role ? getRoleDisplayName(profile.role) : user?.email}
                </span>
              </div>
            </button>

            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownAvatar}>
                    {profile?.avatar_url ? (
                      <img 
                        src={profile.avatar_url} 
                        alt="Avatar" 
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <span 
                      className={styles.dropdownInitials}
                      style={{ display: profile?.avatar_url ? 'none' : 'flex' }}
                    >
                      {getInitials(profile?.name)}
                    </span>
                  </div>
                  <div className={styles.dropdownUserInfo}>
                    <span className={styles.dropdownUserName}>
                      {profile?.name || user?.user_metadata?.full_name || 'Admin'}
                    </span>
                    <span className={styles.dropdownUserEmail}>
                      {profile?.email || user?.email}
                    </span>
                    {profile?.role && (
                      <span className={styles.dropdownUserRole}>
                        {getRoleDisplayName(profile.role)}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={styles.dropdownDivider}></div>
                
                <div className={styles.dropdownBody}>
                  <button className={styles.dropdownItem} onClick={handleAdminProfile}>
                    <Shield size={16} />
                    <span>Admin Profile</span>
                  </button>
                  <button className={styles.dropdownItem} onClick={handleSettings}>
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  
                  <div className={styles.dropdownDivider}></div>
                  
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