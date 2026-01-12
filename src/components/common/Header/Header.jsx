// src/components/common/Header/Header.jsx
// VERSI TANPA PROP + tombol hamburger (sinkron dgn event Sidebar↔Layout di mobile)
import React, { useState, useEffect } from 'react';
// HAPUS import useNavigate
import { Menu } from 'lucide-react';
// HAPUS import useAuth
import styles from './Header.module.css';

const Header = () => {
  // HAPUS semua state dan logic yg berhubungan dgn auth
  // const [dropdownOpen, setDropdownOpen] = useState(false);
  // const { user, profile, logout } = useAuth();
  // const navigate = useNavigate();
  // HAPUS handleLogout
  // HAPUS handleNavigate
  // HAPUS getInitials
  // HAPUS getRoleDisplayName
  // HAPUS useEffect (handleClickOutside)
  // HAPUS if (!user || !profile) return null;

  // Trigger untuk membuka/menutup sidebar (khusus mobile)
  const openSidebarMobile = () => {
    window.dispatchEvent(new CustomEvent('sidebar:toggle', { detail: { toggle: true } }));
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Kiri: Burger (mobile) + Brand */}
        <div className={styles.left}>
          <button
            type="button"
            className={styles.burgerBtn}
            aria-label="Buka menu"
            onClick={openSidebarMobile}
          >
            <Menu size={22} />
          </button>

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

        {/* Kanan: User (DIHAPUS) */}
        <div className={styles.right}>
          {/* KOSONG - Tidak ada menu user lagi */}
        </div>
      </div>
      {/* HAPUS Dropdown overlay */}
    </header>
  );
};

export default Header;