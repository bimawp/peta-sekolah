import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";

import {
  LayoutDashboard,
  Building,
  Wallet,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

import MenuItem from "./MenuItem";
import styles from "./Sidebar.module.css";

// MENU UTAMA
const menuItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={22} />,
    path: "/",
    description: "Lihat statistik umum",
  },
  {
    id: "detail",
    label: "Detail Sekolah",
    icon: <Building size={22} />,
    path: "/detail-sekolah",
    description: "Informasi lengkap sekolah",
  },
  {
    id: "anggaran",
    label: "Anggaran",
    icon: <Wallet size={22} />,
    path: "/anggaran",
    description: "Rekap & monitoring anggaran",
  },
  {
    id: "lainnya",
    label: "Lainnya",
    icon: <MoreHorizontal size={22} />,
    path: "/lainnya",
    description: "Menu tambahan",
  },
];

// MATCH MENU AKTIF
function useActiveMatcher() {
  const { pathname } = useLocation();

  const detailPaths = [
    "/detail-sekolah",
    "/sd/school_detail",
    "/smp/school_detail",
    "/paud/school_detail",
    "/pkbm/school_detail",
    "/detail-sekolah/map",
  ];

  const isActive = useCallback(
    (itemPath) => {
      if (itemPath === "/") return pathname === "/";
      if (itemPath === "/detail-sekolah") {
        return detailPaths.some((p) => pathname.startsWith(p));
      }
      if (itemPath === "/anggaran") return pathname.startsWith("/anggaran");
      if (itemPath === "/lainnya") return pathname.startsWith("/lainnya");
      return pathname.startsWith(itemPath);
    },
    [pathname]
  );

  // Di /facilities sidebar tidak highlight apa pun
  const suppressActive = pathname.startsWith("/facilities");

  return { isActive, suppressActive };
}

const Sidebar = () => {
  const { isActive, suppressActive } = useActiveMatcher();

  const [collapsed, setCollapsed] = useState(false); // desktop
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // overlay mobile

  const debounceRef = useRef(null);
  const animRef = useRef(null);

  // Broadcast state ke Layout lewat CustomEvent
  const broadcast = useCallback(
    (next = {}) => {
      const payload = {
        collapsed: next.collapsed ?? (collapsed && !isMobile),
        isMobile: next.isMobile ?? isMobile,
        isOpen: next.isOpen ?? isOpen,
      };

      // kirim dua jenis event supaya kompatibel
      window.dispatchEvent(
        new CustomEvent("layout:sidebar-state", { detail: payload })
      );
      window.dispatchEvent(
        new CustomEvent("sidebar:state", { detail: payload })
      );
    },
    [collapsed, isMobile, isOpen]
  );

  // Deteksi mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsOpen(false); // pastikan overlay tertutup kalau kembali ke desktop
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Restore state collapsed dari localStorage (desktop)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === "boolean") {
          setCollapsed(parsed);
        }
      }
    } catch {
      // abaikan
    }
  }, []);

  // Simpan state collapsed (desktop)
  useEffect(() => {
    if (isMobile) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem("sidebar-collapsed", JSON.stringify(collapsed));
      } catch {
        // abaikan
      }
    }, 300);
  }, [collapsed, isMobile]);

  // Broadcast setiap kali state penting berubah
  useEffect(() => {
    broadcast();
  }, [collapsed, isMobile, isOpen, broadcast]);

  // Broadcast awal
  useEffect(() => {
    broadcast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    if (animRef.current) return;

    animRef.current = requestAnimationFrame(() => {
      if (isMobile) {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        broadcast({ isOpen: nextOpen });
      } else {
        const nextCollapsed = !collapsed;
        setCollapsed(nextCollapsed);
        broadcast({ collapsed: nextCollapsed });
      }
      animRef.current = null;
    });
  }, [collapsed, isMobile, isOpen, broadcast]);

  const openMobileSidebar = useCallback(() => {
    setIsOpen(true);
    broadcast({ isOpen: true });
  }, [broadcast]);

  const closeSidebar = useCallback(() => {
    if (!isMobile) return;
    setIsOpen(false);
    broadcast({ isOpen: false });
  }, [isMobile, broadcast]);

  // Listener global dari Header / Layout: 'sidebar:toggle'
  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {};

      if (isMobile) {
        const { forceClose, toggle } = detail;
        if (forceClose) {
          setIsOpen(false);
          broadcast({ isOpen: false });
          return;
        }
        if (toggle) {
          const next = !isOpen;
          setIsOpen(next);
          broadcast({ isOpen: next });
        }
      } else {
        const { collapsed: nextCollapsed } = detail;
        if (typeof nextCollapsed === "boolean") {
          setCollapsed(nextCollapsed);
          broadcast({ collapsed: nextCollapsed });
        }
      }
    };

    window.addEventListener("sidebar:toggle", handler);
    return () => window.removeEventListener("sidebar:toggle", handler);
  }, [isMobile, isOpen, broadcast]);

  const sidebarClasses = [
    styles.sidebar,
    collapsed && !isMobile && styles.collapsed,
    isMobile && isOpen && styles.open,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <aside
        className={sidebarClasses}
        role="navigation"
        aria-label="Menu navigasi utama"
      >
        {/* HEADER SIDEBAR */}
        <header className={styles.header}>
          <div className={styles.logoSection}>
            <p className={styles.logo}>PS</p>
            {!collapsed && !isMobile && (
              <p className={styles.tagline}>
                Peta Sekolah
                <br />
                Kabupaten Garut
              </p>
            )}
          </div>

          {/* Desktop: tombol collapse */}
          {!isMobile && (
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={toggleSidebar}
              aria-label={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            >
              {collapsed ? (
                <ChevronRight size={18} />
              ) : (
                <ChevronLeft size={18} />
              )}
            </button>
          )}

          {/* Mobile: tombol close */}
          {isMobile && (
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={closeSidebar}
              aria-label="Tutup menu"
            >
              <X size={20} />
            </button>
          )}
        </header>

        {/* MENU UTAMA */}
        <nav className={styles.menu} aria-label="Daftar menu utama">
          {menuItems.map(({ id, icon, label, path, description }) => (
            <MenuItem
              key={id}
              icon={icon}
              label={label}
              to={path}
              description={description}
              active={!suppressActive && isActive(path)}
              collapsed={collapsed && !isMobile}
              onClick={closeSidebar}
              role="menuitem"
            />
          ))}
        </nav>

        {/* LEGEND SUPER SIMPEL (DOT SAJA, TANPA TEKS) */}
        {(!collapsed || isMobile) && (
          <section className={styles.legendBox} aria-label="Legenda titik peta">
            <span
              className={`${styles.legendDot} ${styles.legendDotPaud}`}
              title="PAUD"
            />
            <span
              className={`${styles.legendDot} ${styles.legendDotSd}`}
              title="SD"
            />
            <span
              className={`${styles.legendDot} ${styles.legendDotSmp}`}
              title="SMP"
            />
            <span
              className={`${styles.legendDot} ${styles.legendDotPkbm}`}
              title="PKBM"
            />
          </section>
        )}

        {/* FOOTER (desktop, saat tidak collapsed) */}
        {!collapsed && !isMobile && (
          <div className={styles.footer}>
            <div className={styles.version}>v2.0.0</div>
            <div className={styles.footerText}>
              Dinas Pendidikan Kab. Garut
            </div>
          </div>
        )}
      </aside>

      {/* Tombol hamburger (mobile) */}
      {isMobile && !isOpen && (
        <button
          type="button"
          className={styles.mobileToggle}
          onClick={openMobileSidebar}
          aria-label="Buka menu"
        >
          <Menu size={22} />
        </button>
      )}

      {/* Overlay (mobile) */}
      {isMobile && isOpen && (
        <div
          className={styles.sidebarOverlay}
          onClick={closeSidebar}
          role="button"
          tabIndex={0}
          aria-label="Tutup menu"
          onKeyDown={(e) => e.key === "Enter" && closeSidebar()}
        />
      )}
    </>
  );
};

export default Sidebar;
