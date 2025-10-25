// ============================================
// src/components/common/Layout/Layout.jsx
// ============================================
import React, { useEffect, useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../Sidebar/Sidebar";
import Header from "../Header/Header";
import styles from "./Layout.module.css";
import SuspenseLoader from "../SuspenseLoader/SuspenseLoader";
import { useIdlePrefetch } from "@/hooks/useIdlePrefetch";

const Layout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const toggleSidebar = () => setIsSidebarOpen((v) => !v);
  const idlePrefetch = useIdlePrefetch();

  // Idle prefetch: data & chunk halaman yang sering dipakai
  useEffect(() => {
    idlePrefetch([
      // chunks
      { type: "chunk", importer: () => import("@/pages/Map/Map.jsx") },
      { type: "chunk", importer: () => import("@/pages/Facilities/FacilitiesPage.jsx") },
      { type: "chunk", importer: () => import("@/pages/Dashboard/Dashboard.jsx") },
      // data (samakan dengan Map.jsx & FacilitiesPage.jsx)
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

  return (
    <div className={styles.layout}>
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      <div
        className={`${styles.mainContent} ${
          isSidebarOpen ? "" : styles.mainContentCollapsed
        }`}
        // hindari layout shift karena scrollbar
        data-scroll-stable
      >
        <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />

        {/* Suspense lokal, loader tidak full-screen supaya header/sidebar tetap terlihat */}
        <main className={styles.contentArea}>
          <Suspense fallback={<SuspenseLoader fullScreen={false} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default Layout;
