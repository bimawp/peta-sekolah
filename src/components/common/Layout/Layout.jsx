import React, { useEffect, useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import styles from "./Layout.module.css";
import SuspenseLoader from "../SuspenseLoader/SuspenseLoader";
import { useIdlePrefetch } from "@/hooks/useIdlePrefetch";

const Layout = () => {
  // === State hasil broadcast dari Sidebar ===
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false); // desktop only
  const [isMobile, setIsMobile] = useState(false); // <=768
  const [mobileOpen, setMobileOpen] = useState(false); // overlay state (informasi)

  const idlePrefetch = useIdlePrefetch();

  // Prefetch ringan saat idle (chunk + JSON yang sering dipakai)
  useEffect(() => {
    // PERF: Hindari prefetch JSON besar (sd/smp/paud/pkbm + data_kegiatan) yang sering membuat initial load “berat”
    // dan memakan bandwidth sehingga map/chart/Supabase terasa lambat.
    // Tetap prefetch chunk halaman + geojson boundary yang relatif penting untuk map.
    const conn =
      navigator.connection || navigator.mozConnection || navigator.webkitConnection;

    const saveData = Boolean(conn?.saveData);
    const effectiveType = (conn?.effectiveType || "").toString();
    const isSlowNet = /(^|-)2g/.test(effectiveType);

    if (saveData || isSlowNet) return;

    // Beri jeda kecil agar tidak mengganggu rendering awal & request penting.
    const t = window.setTimeout(() => {
      idlePrefetch([
        { type: "chunk", importer: () => import("@/pages/Map/Map.jsx") },
        {
          type: "chunk",
          importer: () => import("@/pages/Facilities/FacilitiesPage.jsx"),
        },
        { type: "chunk", importer: () => import("@/pages/Dashboard/Dashboard.jsx") },

        // GeoJSON boundary (relatif lebih ringan & sering dipakai map)
        { type: "json", url: "/data/kecamatan.geojson" },
        { type: "json", url: "/data/desa.geojson" },
      ]);
    }, 1200);

    return () => window.clearTimeout(t);
  }, [idlePrefetch]);

  // Dengarkan event dari Sidebar
  useEffect(() => {
    const onSidebarState = (e) => {
      const { collapsed, isMobile: mob, isOpen } = e.detail || {};
      setSidebarCollapsed(Boolean(collapsed));
      setIsMobile(Boolean(mob));
      setMobileOpen(Boolean(isOpen));
    };

    // dukung dua nama event sekaligus
    window.addEventListener("sidebar:state", onSidebarState);
    window.addEventListener("layout:sidebar-state", onSidebarState);

    return () => {
      window.removeEventListener("sidebar:state", onSidebarState);
      window.removeEventListener("layout:sidebar-state", onSidebarState);
    };
  }, []);

  return (
    <div className={styles.layout}>
      <Sidebar />

      {/* Desktop: geser konten jika collapsed.
          Mobile: margin-left selalu 0 via CSS. */}
      <div
        className={`${styles.mainContent} ${
          sidebarCollapsed ? styles.mainContentCollapsed : ""
        }`}
        data-scroll-stable
        data-mobile-open={mobileOpen}
        data-is-mobile={isMobile}
      >
        <Header />

        {/* Suspense lokal → header/sidebar tetap kelihatan saat halaman lazy-load */}
        <main className={styles.contentArea} aria-busy={false}>
          <Suspense fallback={<SuspenseLoader />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Layout;
