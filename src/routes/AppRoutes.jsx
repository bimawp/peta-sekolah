// src/routes/AppRoutes.jsx
import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Layout from '../components/common/Layout/Layout';
import ProtectedRoute from "./ProtectedRoute.jsx";
import SuspenseLoader from "../components/common/SuspenseLoader/SuspenseLoader";

// === Lazy load semua halaman dengan path yang benar ===
const Dashboard = lazy(() => import("../pages/Dashboard/Dashboard.jsx"));
const SchoolDetailPage = lazy(() => import("../pages/SchoolDetail/SchoolDetailPage.jsx"));
const LoginPage = lazy(() => import("../pages/Auth/Login.jsx"));
const NotFound = lazy(() => import("../pages/NotFound/NotFound.jsx"));

// Helper redirect yang mempertahankan ?query (mis. ?npsn=...)
function QueryPreservingRedirect({ to }) {
  const location = useLocation();
  const search = location.search || "";
  return <Navigate to={`${to}${search}`} replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes>
        {/* Rute publik (tanpa Header/Sidebar) */}
        <Route path="/login" element={<LoginPage />} />

        {/* Grup rute yang dilindungi dan memerlukan Layout (Header & Sidebar) */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Rute utama sekarang adalah Dashboard */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Rute Detail Sekolah */}
          <Route path="/detail-sekolah" element={<SchoolDetailPage />} />

          {/* (Tambahkan rute lain yang memerlukan layout di sini) */}
          {/* Contoh:
          <Route path="/peta" element={<MapPage />} />
          <Route path="/anggaran" element={<BudgetPage />} />
          */}
        </Route>

        {/* ===== ALIAS/REDIRECT UNTUK DETAIL SEKOLAH ===== */}
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