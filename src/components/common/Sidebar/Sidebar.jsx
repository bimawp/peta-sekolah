import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import {
  LayoutDashboard,
  Building,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

import MenuItem from "./MenuItem";
import styles from "./Sidebar.module.css";

// =========================
// Konstanta ukuran sidebar
// =========================
const SIDEBAR_W_EXPANDED = 280;
const SIDEBAR_W_COLLAPSED = 86;

// MENU UTAMA (dibuat di luar komponen agar tidak dibuat ulang setiap render)
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
    id: "lainnya",
    label: "Lainnya",
    icon: <MoreHorizontal size={22} />,
    path: "/lainnya",
    description: "Menu tambahan",
  },
];

// detail paths dipindah ke luar hook agar tidak re-alloc setiap render
const DETAIL_PATHS = [
  "/detail-sekolah",
  "/sd/school_detail",
  "/smp/school_detail",
  "/paud/school_detail",
  "/pkbm/school_detail",
  "/detail-sekolah/map",
];

// MATCH MENU AKTIF
function useActiveMatcher() {
  const { pathname } = useLocation();

  const isActive = useCallback(
    (itemPath) => {
      if (itemPath === "/") return pathname === "/";
      if (itemPath === "/detail-sekolah") {
        return DETAIL_PATHS.some((p) => pathname.startsWith(p));
      }
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
  const prefersReducedMotion = useReducedMotion();

  const [collapsed, setCollapsed] = useState(false); // desktop
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false); // overlay mobile

  const debounceRef = useRef(null);
  const rafRef = useRef(null);

  // Broadcast state ke Layout lewat CustomEvent (dipertahankan)
  const broadcast = useCallback(
    (next = {}) => {
      const payload = {
        collapsed: next.collapsed ?? (collapsed && !isMobile),
        isMobile: next.isMobile ?? isMobile,
        isOpen: next.isOpen ?? isOpen,
      };

      window.dispatchEvent(new CustomEvent("layout:sidebar-state", { detail: payload }));
      window.dispatchEvent(new CustomEvent("sidebar:state", { detail: payload }));
    },
    [collapsed, isMobile, isOpen]
  );

  // Deteksi mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setIsOpen(false); // pastikan overlay tertutup kalau kembali ke desktop
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
        if (typeof parsed === "boolean") setCollapsed(parsed);
      }
    } catch {
      /* ignore */
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
        /* ignore */
      }
    }, 250);
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

  const isCollapsed = collapsed && !isMobile;

  // Toggle sidebar (dibatasi dengan rAF agar tidak spam-click)
  const toggleSidebar = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      if (isMobile) {
        const nextOpen = !isOpen;
        setIsOpen(nextOpen);
        broadcast({ isOpen: nextOpen });
      } else {
        const nextCollapsed = !collapsed;
        setCollapsed(nextCollapsed);
        broadcast({ collapsed: nextCollapsed });
      }
      rafRef.current = null;
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

  // =========================
  // Framer Motion variants
  // =========================
  const widthSpring = useMemo(() => {
    if (prefersReducedMotion) return { duration: 0 };
    return {
      type: "spring",
      stiffness: 260,
      damping: 30,
      mass: 0.9,
    };
  }, [prefersReducedMotion]);

  const sidebarVariants = useMemo(
    () => ({
      expanded: {
        width: SIDEBAR_W_EXPANDED,
        x: 0,
        transition: widthSpring,
      },
      collapsed: {
        width: SIDEBAR_W_COLLAPSED,
        x: 0,
        transition: widthSpring,
      },
      mobileOpen: {
        width: SIDEBAR_W_EXPANDED,
        x: 0,
        transition: widthSpring,
      },
      mobileClosed: {
        width: SIDEBAR_W_EXPANDED,
        x: -(SIDEBAR_W_EXPANDED + 16),
        transition: widthSpring,
      },
    }),
    [widthSpring]
  );

  const motionState = isMobile ? (isOpen ? "mobileOpen" : "mobileClosed") : isCollapsed ? "collapsed" : "expanded";

  const sidebarClasses = useMemo(() => {
    return [
      styles.sidebar,
      isCollapsed && styles.collapsed,
      isMobile && styles.mobile,
      isMobile && isOpen && styles.open,
      isMobile && !isOpen && styles.mobileClosed,
    ]
      .filter(Boolean)
      .join(" ");
  }, [isCollapsed, isMobile, isOpen]);

  // Memoize rendering menu agar mapping tidak dihitung ulang tiap toggle kecil yang tidak relevan
  const renderedMenu = useMemo(() => {
    return menuItems.map(({ id, icon, label, path, description }) => (
      <MenuItem
        key={id}
        icon={icon}
        label={label}
        to={path}
        description={description}
        active={!suppressActive && isActive(path)}
        collapsed={isCollapsed}
        onClick={closeSidebar}
        role="menuitem"
      />
    ));
  }, [isActive, suppressActive, isCollapsed, closeSidebar]);

  return (
    <>
      <motion.aside
        className={sidebarClasses}
        role="navigation"
        aria-label="Menu navigasi utama"
        aria-hidden={isMobile && !isOpen ? true : undefined}
        initial={false}
        animate={motionState}
        variants={sidebarVariants}
        style={{
          // pointer-events dimatikan saat off-canvas mobile agar tidak “nyangkut” fokus/klik
          pointerEvents: isMobile && !isOpen ? "none" : "auto",
        }}
      >
        {/* HEADER SIDEBAR */}
        <header className={styles.header}>
          <div className={styles.logoSection}>
            <img
              src="/assets/logo-disdik.png"
              alt="Logo Dinas Pendidikan Kabupaten Garut"
              className={styles.sidebarLogo}
              draggable="false"
            />

            <AnimatePresence initial={false}>
              {!isCollapsed && !isMobile && (
                <motion.p
                  className={styles.tagline}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { duration: 0.18, ease: [0.2, 0.9, 0.2, 1] }
                  }
                >
                  E-Plan Disdik
                  <br />
                  Kabupaten Garut
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop: tombol collapse */}
          {!isMobile && (
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={toggleSidebar}
              aria-label={isCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            >
              {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
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
          {renderedMenu}
        </nav>

        {/* LEGEND SUPER SIMPEL (DOT SAJA, TANPA TEKS) */}
        <AnimatePresence initial={false}>
          {(!isCollapsed || isMobile) && (
            <motion.section
              className={styles.legendBox}
              aria-label="Legenda titik peta"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.18, ease: [0.2, 0.9, 0.2, 1] }
              }
            >
              <span className={`${styles.legendDot} ${styles.legendDotPaud}`} title="PAUD" />
              <span className={`${styles.legendDot} ${styles.legendDotSd}`} title="SD" />
              <span className={`${styles.legendDot} ${styles.legendDotSmp}`} title="SMP" />
              <span className={`${styles.legendDot} ${styles.legendDotPkbm}`} title="PKBM" />
            </motion.section>
          )}
        </AnimatePresence>

        {/* FOOTER (desktop, saat tidak collapsed) */}
        <AnimatePresence initial={false}>
          {!isCollapsed && !isMobile && (
            <motion.div
              className={styles.footer}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.18, ease: [0.2, 0.9, 0.2, 1] }
              }
            >
              <div className={styles.version}>v2.0.0</div>
              <div className={styles.footerText}>Dinas Pendidikan Kab. Garut</div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Tombol hamburger (mobile) */}
      <AnimatePresence initial={false}>
        {isMobile && !isOpen && (
          <motion.button
            type="button"
            className={styles.mobileToggle}
            onClick={openMobileSidebar}
            aria-label="Buka menu"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18 }}
          >
            <Menu size={22} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Overlay (mobile) */}
      <AnimatePresence initial={false}>
        {isMobile && isOpen && (
          <motion.div
            className={styles.sidebarOverlay}
            onClick={closeSidebar}
            role="button"
            tabIndex={0}
            aria-label="Tutup menu"
            onKeyDown={(e) => e.key === "Enter" && closeSidebar()}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18 }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
