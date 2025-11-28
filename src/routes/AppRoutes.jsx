// src/routes/AppRoutes.jsx
import React, {
  Suspense,
  lazy,
  useMemo,
  useEffect,
  useState,
  useCallback,
  startTransition,
} from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Layout from "../components/common/Layout/Layout";
// HAPUS ProtectedRoute
// import ProtectedRoute from "./ProtectedRoute.jsx";
import SuspenseLoader from "../components/common/SuspenseLoader/SuspenseLoader";

// === Lazy load pages (dipisah dari initial bundle) ===
const Dashboard        = lazy(() => import("../pages/Dashboard/Dashboard.jsx"));
const SchoolDetailPage = lazy(() => import("../pages/SchoolDetail/SchoolDetailPage.jsx"));
// HAPUS LoginPage
// const LoginPage        = lazy(() => import("../pages/Auth/Login.jsx"));
const NotFound         = lazy(() => import("../pages/NotFound/NotFound.jsx"));
const MapPage          = lazy(() => import("../pages/Map/Map.jsx"));
const BudgetPage       = lazy(() => import("../pages/Budget/BudgetPage.jsx"));
const FacilitiesPage   = lazy(() => import("../pages/Facilities/FacilitiesPage.jsx"));

// === API detail by NPSN (ringan) ===
import {
  getSdDetailByNpsn,
  getSmpDetailByNpsn,
  getPaudDetailByNpsn,
  getPkbmDetailByNpsn,
} from "@/services/api/detailApi";

/* =====================================================================
   Prefetch helper: panggil dynamic import saat hover/focus untuk nyiapin chunk
===================================================================== */
const prefetch = (() => {
  const inFlight = new Set();
  return (loader, key) => {
    const k = key || loader.toString();
    if (inFlight.has(k)) return;
    inFlight.add(k);
    queueMicrotask(() => {
      loader().catch(() => {}).finally(() => {
        setTimeout(() => inFlight.delete(k), 5000);
      });
    });
  };
})();

// Prefetch map komponen utama (dipakai sidebar/menu)
export const prefetchPages = {
  dashboard:   () => prefetch(() => import("../pages/Dashboard/Dashboard.jsx"), "pg:dashboard"),
  map:         () => prefetch(() => import("../pages/Map/Map.jsx"), "pg:map"),
  budget:      () => prefetch(() => import("../pages/Budget/BudgetPage.jsx"), "pg:budget"),
  facilities:  () => prefetch(() => import("../pages/Facilities/FacilitiesPage.jsx"), "pg:facilities"),
  detail:      () => prefetch(() => import("../pages/SchoolDetail/SchoolDetailPage.jsx"), "pg:detail"),
  // HAPUS prefetch login
};

// Helper: redirect yang mempertahankan query string (mis. ?npsn=…)
function QueryPreservingRedirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search || ""}`} replace />;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// ===== Cache helpers (sessionStorage) =====
const CACHE_PREFIX = "sch-detail:";
const getCacheKey = (jenjang, npsn) => `${CACHE_PREFIX}${jenjang}:${npsn}`;
function readDetailCache(jenjang, npsn) {
  try {
    const raw = sessionStorage.getItem(getCacheKey(jenjang, npsn));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.data || null;
  } catch {
    return null;
  }
}
function writeDetailCache(jenjang, npsn, data) {
  try {
    sessionStorage.setItem(
      getCacheKey(jenjang, npsn),
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch { /* ignore */ }
}

/**
 * Map jenjang -> komponen detail (lazy) agar tidak ikut bundle rute lain.
 */
const DetailLazyMap = {
  SD:   lazy(() => import("@/components/schools/SchoolDetail/Sd/SchoolDetailSd")),
  SMP:  lazy(() => import("@/components/schools/SchoolDetail/Smp/SchoolDetailSmp")),
  PAUD: lazy(() => import("@/components/schools/SchoolDetail/Paud/SchoolDetailPaud")),
  PKBM: lazy(() => import("@/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm")),
};

// Prefetch modul detail by jenjang (buat link/hover)
export function prefetchDetailModule(jenjang) {
  const map = {
    SD:   () => import("@/components/schools/SchoolDetail/Sd/SchoolDetailSd"),
    SMP:  () => import("@/components/schools/SchoolDetail/Smp/SchoolDetailSmp"),
    PAUD: () => import("@/components/schools/SchoolDetail/Paud/SchoolDetailPaud"),
    PKBM: () => import("@/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm"),
  };
  const loader = map[jenjang];
  if (loader) prefetch(loader, `detail:${jenjang}`);
}

/**
 * Standalone detail route per jenjang:
 * - Baca ?npsn=... dari URL
 * - Fast paint dari cache (kalau ada), tetap revalidate di background
 * - Tanpa Layout (header/sidebar) & tanpa tombol kembali
 */
function StandaloneDetailRoute({ jenjang }) {
  const query = useQuery();
  const npsn = query.get("npsn");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [detail, setDetail] = useState(null);

  // Prefetch chunk sesuai jenjang secepat mungkin
  useEffect(() => {
    prefetchDetailModule(jenjang);
  }, [jenjang]);

  useEffect(() => {
    let alive = true;
    async function run() {
      setErr(null);

      if (!npsn) {
        setLoading(false);
        setErr("Parameter NPSN tidak ditemukan.");
        return;
      }

      // 1) coba cache untuk fast-first-paint
      const cached = readDetailCache(jenjang, npsn);
      if (cached) {
        setDetail(cached);
        setLoading(false);
      }

      // 2) revalidate (atau fetch pertama kali kalau tak ada cache)
      try {
        let data = null;
        if (jenjang === "SD")   data = await getSdDetailByNpsn(npsn);
        if (jenjang === "SMP")  data = await getSmpDetailByNpsn(npsn);
        if (jenjang === "PAUD") data = await getPaudDetailByNpsn(npsn);
        if (jenjang === "PKBM") data = await getPkbmDetailByNpsn(npsn);
        if (!data) throw new Error("Detail sekolah tidak ditemukan.");

        writeDetailCache(jenjang, npsn, data);
        if (!alive) return;
        setDetail((prev) => prev || data);
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        if (!cached) {
          setErr(e?.message || String(e));
          setLoading(false);
        }
      }
    }
    startTransition(run);
    return () => {
      alive = false;
    };
  }, [npsn, jenjang]);

  if (loading && !detail)
    return <div style={{ padding: 16 }}>Memuat detail sekolah…</div>;
  if (err && !detail)
    return (
      <div style={{ padding: 16, color: "#b91c1c" }}>⚠️ {err}</div>
    );
  if (!detail) return <div style={{ padding: 16 }}>Detail kosong.</div>;

  const DetailComp = DetailLazyMap[jenjang];
  if (!DetailComp) return <div style={{ padding: 16 }}>Jenjang tidak didukung.</div>;

  return (
    <Suspense fallback={<SuspenseLoader />}>
      <DetailComp schoolData={detail} />
    </Suspense>
  );
}

/**
 * Komponen root routes
 */
export default function AppRoutes() {
  const location = useLocation();

  // Heuristik prefetch tetangga rute
  useEffect(() => {
    const path = location.pathname;
    if (path === "/" || path === "/dashboard") {
      prefetchPages.map();
      prefetchPages.facilities();
      prefetchPages.budget();
    } else if (path === "/peta" || path === "/map") {
      prefetchPages.dashboard();
      prefetchPages.facilities();
    } else if (path === "/lainnya") {
      prefetchPages.dashboard();
      prefetchPages.map();
    }
  }, [location.pathname]);

  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        {/* ====== Halaman login (DIHAPUS) ====== */}
        {/* <Route path="/login" element={<LoginPage />} /> */}

        {/* ====== ROUTES DENGAN LAYOUT (Header + Sidebar) ====== */}
        <Route
          element={
            // HAPUS ProtectedRoute
            <Layout
              onMenuHover={(key) => {
                const map = {
                  dashboard: prefetchPages.dashboard,
                  peta: prefetchPages.map,
                  anggaran: prefetchPages.budget,
                  fasilitas: prefetchPages.facilities,
                };
                map[key]?.();
              }}
            />
          }
        >
          {/* Rute utama */}
          <Route path="/"          element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Peta */}
          <Route path="/peta" element={<MapPage />} />
          <Route path="/map"  element={<Navigate to="/peta" replace />} />

          {/* Menu lain */}
          <Route path="/anggaran"  element={<BudgetPage />} />
          <Route path="/lainnya"   element={<FacilitiesPage />} />

          {/* Halaman gabungan (punya header/sidebar) */}
          <Route path="/detail-sekolah" element={<SchoolDetailPage />} />
        </Route>

        {/* ====== ROUTES TANPA LAYOUT: detail per jenjang (standalone) ====== */}
        {/* HAPUS ProtectedRoute */}
        <Route
          path="/sd/school_detail"
          element={<StandaloneDetailRoute jenjang="SD" />}
        />
        <Route
          path="/smp/school_detail"
          element={<StandaloneDetailRoute jenjang="SMP" />}
        />
        <Route
          path="/paud/school_detail"
          element={<StandaloneDetailRoute jenjang="PAUD" />}
        />
        <Route
          path="/pkbm/school_detail"
          element={<StandaloneDetailRoute jenjang="PKBM" />}
        />

        {/* ====== Alias/redirect lama → detail rute baru ====== */}
        <Route
          path="/smp/school_detail_old"
          element={<QueryPreservingRedirect to="/smp/school_detail" />}
        />
        <Route
          path="/sd/school_detail_old"
          element={<QueryPreservingRedirect to="/sd/school_detail" />}
        />
        <Route
          path="/paud/school_detail_old"
          element={<QueryPreservingRedirect to="/paud/school_detail" />}
        />
        <Route
          path="/pkbm/school_detail_old"
          element={<QueryPreservingRedirect to="/pkbm/school_detail" />}
        />

        {/* ====== 404 ====== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}