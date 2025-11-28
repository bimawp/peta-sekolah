import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import styles from "./MenuItem.module.css";

// Peta rute -> dynamic import untuk prefetch chunk halaman di hover
const preloads = {
  "/":                () => import("@/pages/Dashboard/Dashboard.jsx" /* webpackPrefetch: true */),
  "/peta":            () => import("@/pages/Map/Map.jsx" /* webpackPrefetch: true */),
  "/detail-sekolah":  () => import("@/pages/SchoolDetail/SchoolDetailPage.jsx" /* webpackPrefetch: true */),
  "/anggaran":        () => import("@/pages/Budget/BudgetPage.jsx" /* webpackPrefetch: true */).catch(() => {}),
  "/lainnya":         () => import("@/pages/Facilities/FacilitiesPage.jsx" /* webpackPrefetch: true */).catch(() => {}),
};

export default function MenuItem({
  icon, label, to, collapsed = false, description, active, ...props
}) {
  const onHover = useCallback(() => {
    const loader = preloads[to];
    if (loader) loader();

    // Prefetch JSON ringan untuk halaman peta agar transisi instan
    if (to === "/peta") {
      fetch("/data/sd_new.json").catch(() => {});
      fetch("/data/paud.json").catch(() => {});
      fetch("/data/smp.json").catch(() => {});
      fetch("/data/pkbm.json").catch(() => {});
      fetch("/data/kecamatan.geojson").catch(() => {});
      fetch("/data/desa.geojson").catch(() => {});
    }
  }, [to]);

  return (
    <Link
      to={to}
      className={[
        styles.menuItem,
        active ? styles.active : "",
        collapsed ? styles.collapsed : "",
      ].filter(Boolean).join(" ")}
      onMouseEnter={onHover}
      title={collapsed ? label : description}
      aria-current={active ? "page" : undefined}
      {...props}
    >
      <div className={styles.iconWrapper}>
        {icon}
        {active && <div className={styles.activeIndicator} />}
      </div>
      {!collapsed && <span className={styles.label}>{label}</span>}
    </Link>
  );
}
