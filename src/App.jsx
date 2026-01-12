// src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { SWRConfig } from "swr";
import AppRoutes from "./routes/AppRoutes.jsx";
// HAPUS AuthProvider (auth context sementara tidak dipakai)
// import { AuthProvider } from "./contexts/AuthContext.jsx";
import SuspenseLoader from "./components/common/SuspenseLoader/SuspenseLoader";
import { purgeSessionPrefix } from "@/utils/http";

// Fetcher global untuk SWR (dipakai kalau nanti ada komponen yang pakai useSWR)
const fetcher = async (key) => {
  const res = await fetch(key, { cache: "default", keepalive: true });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
};

export default function App() {
  useEffect(() => {
    // Housekeeping: bersihkan cache detail sekolah yang terlalu lama
    // Prefix-nya mengikuti yang dipakai di SchoolDetailPage (sch-detail:...)
    // maxAgeMs = 14 hari
    const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
    purgeSessionPrefix("sch-detail:", FOURTEEN_DAYS_MS);
  }, []);

  return (
    <BrowserRouter>
      {/* AuthProvider sengaja tidak diaktifkan dulu */}
      {/* <AuthProvider> */}
      <SWRConfig
        value={{
          fetcher,
          suspense: true,
          revalidateOnFocus: false,
          revalidateOnReconnect: true,
          dedupingInterval: 60_000,
          focusThrottleInterval: 60_000,
          keepPreviousData: true,
          errorRetryCount: 2,
          errorRetryInterval: 3000,
        }}
      >
        <React.Suspense fallback={<SuspenseLoader />}>
          <AppRoutes />
        </React.Suspense>
      </SWRConfig>
      {/* </AuthProvider> */}
    </BrowserRouter>
  );
}
