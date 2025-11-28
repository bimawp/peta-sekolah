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
  const [isMobile, setIsMobile] = useState(false);                  // <=768
  const [mobileOpen, setMobileOpen] = useState(false);              // overlay state (informasi)

  const idlePrefetch = useIdlePrefetch();

  // Prefetch ringan saat idle (chunk + JSON yang sering dipakai)
  useEffect(() => {
    idlePrefetch([
      { type: "chunk", importer: () => import("@/pages/Map/Map.jsx") },
      { type: "chunk", importer: () => import("@/pages/Facilities/FacilitiesPage.jsx") },
      { type: "chunk", importer: () => import("@/pages/Dashboard/Dashboard.jsx") },
      { type: "json", url: "/data/kecamatan.geojson" },
      { type: "json", url: "/data/desa.geojson" },
      { type: "json", url: "/data/sd_new.json" },
      { type: "json", url: "/data/smp.json" },
      { type: "json", url: "/data/paud.json" },
      { type: "json", url: "/data/pkbm.json" },
      { type: "json", url: "/data/data_kegiatan_sd.json" },
      { type: "json", url: "/data/data_kegiatan_smp.json" },
      { type: "json", url: "/data/data_kegiatan_paud.json" },
      { type: "json", url: "/data/data_kegiatan_pkbm.json" },
    ]);
  }, [idlePrefetch]);

  // Dengarkan event dari Sidebar
  useEffect(() => {
    const onSidebarState = (e) => {
      const { collapsed, isMobile: mob, isOpen } = e.detail || {};
      setSidebarCollapsed(Boolean(collapsed));
      setIsMobile(Boolean(mob));
      setMobileOpen(Boolean(isOpen));
    };
    window.addEventListener("sidebar:state", onSidebarState);
    return () => window.removeEventListener("sidebar:state", onSidebarState);
  }, []);

  return (
    <div className={styles.layout}>
      <Sidebar />

      {/* Desktop: geser konten jika collapsed.
          Mobile: margin-left selalu 0 via CSS. */}
      <div
        className={`${styles.mainContent} ${sidebarCollapsed ? styles.mainContentCollapsed : ""}`}
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
