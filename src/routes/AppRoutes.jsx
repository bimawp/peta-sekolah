// src/routes/AppRoutes.jsx
import React, { Suspense, lazy, useMemo, useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Layout from "../components/common/Layout/Layout";
import ProtectedRoute from "./ProtectedRoute.jsx";
import SuspenseLoader from "../components/common/SuspenseLoader/SuspenseLoader";

// === Lazy load pages (semuanya dipisah dari initial bundle) ===
const Dashboard        = lazy(() => import("../pages/Dashboard/Dashboard.jsx"));
const SchoolDetailPage = lazy(() => import("../pages/SchoolDetail/SchoolDetailPage.jsx"));
const LoginPage        = lazy(() => import("../pages/Auth/Login.jsx"));
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
  } catch {
    /* ignore */
  }
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
        setDetail((prev) => prev || data); // kalau sudah punya cache, jangan flicker
        setLoading(false);
      } catch (e) {
        if (!alive) return;
        if (!cached) {
          setErr(e?.message || String(e));
          setLoading(false);
        }
      }
    }
    run();
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

export default function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        {/* ====== Halaman login (tanpa layout) ====== */}
        <Route path="/login" element={<LoginPage />} />

        {/* ====== ROUTES DENGAN LAYOUT (Header + Sidebar) ====== */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
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
          <Route path="/lainnya" element={<FacilitiesPage />} />

          {/* Halaman gabungan (punya header/sidebar) */}
          <Route path="/detail-sekolah" element={<SchoolDetailPage />} />
        </Route>

        {/* ====== ROUTES TANPA LAYOUT: detail per jenjang (standalone) ====== */}
        <Route
          path="/sd/school_detail"
          element={
            <ProtectedRoute>
              <StandaloneDetailRoute jenjang="SD" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/smp/school_detail"
          element={
            <ProtectedRoute>
              <StandaloneDetailRoute jenjang="SMP" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/paud/school_detail"
          element={
            <ProtectedRoute>
              <StandaloneDetailRoute jenjang="PAUD" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pkbm/school_detail"
          element={
            <ProtectedRoute>
              <StandaloneDetailRoute jenjang="PKBM" />
            </ProtectedRoute>
          }
        />

        {/* ====== Alias/redirect lama → detail rute baru (jaga ?npsn=…) ====== */}
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

        {/* ====== 404 HARUS PALING BAWAH ====== */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
