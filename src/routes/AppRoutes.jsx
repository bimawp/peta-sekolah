// src/routes/AppRoutes.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Layout from "../components/common/Layout/Layout";
import ProtectedRoute from "./ProtectedRoute.jsx";
import SuspenseLoader from "../components/common/SuspenseLoader/SuspenseLoader";
import BudgetPage from "@/pages/Budget/BudgetPage";
import FacilitiesPage from "@/pages/Facilities/FacilitiesPage";

// === Lazy load pages ===
const Dashboard        = lazy(() => import("../pages/Dashboard/Dashboard.jsx"));
const SchoolDetailPage = lazy(() => import("../pages/SchoolDetail/SchoolDetailPage.jsx"));
const LoginPage        = lazy(() => import("../pages/Auth/Login.jsx"));
const NotFound         = lazy(() => import("../pages/NotFound/NotFound.jsx"));
const MapPage          = lazy(() => import("../pages/Map/Map.jsx"));        // <<— HALAMAN PETA

// Helper redirect yang mempertahankan query string (mis. ?npsn=…)
function QueryPreservingRedirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search || ""}`} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        {/* Halaman login (tanpa layout) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Semua halaman yang butuh layout + proteksi */}
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

          {/* Detail Sekolah */}
          <Route path="/detail-sekolah" element={<SchoolDetailPage />} />

          {/* === PETA (FILTER MAP) === */}
          <Route path="/peta" element={<MapPage />} />

          <Route path="/anggaran" element={<BudgetPage />} />

          <Route path="/lainnya" element={<FacilitiesPage />} />

          {/* Alias /map -> /peta */}
          <Route path="/map" element={<Navigate to="/peta" replace />} />
        </Route>

        {/* Alias/redirect lama ke detail-sekolah (tetap jaga query npsn) */}
        <Route
          path="/smp/school_detail"
          element={<QueryPreservingRedirect to="/detail-sekolah" />}
        />
        <Route
          path="/sd/school_detail"
          element={<QueryPreservingRedirect to="/detail-sekolah" />}
        />
        <Route
          path="/paud/school_detail"
          element={<QueryPreservingRedirect to="/detail-sekolah" />}
        />
        <Route
          path="/pkbm/school_detail"
          element={<QueryPreservingRedirect to="/detail-sekolah" />}
        />
        

        {/* 404 HARUS PALING BAWAH */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
