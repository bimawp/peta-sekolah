// src/App.jsx
import React, { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { SWRConfig } from "swr";
import AppRoutes from "./routes/AppRoutes.jsx";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import SuspenseLoader from "./components/common/SuspenseLoader/SuspenseLoader";
import { purgeSessionPrefix } from "@/utils/http";

const fetcher = async (key) => {
  const res = await fetch(key, { cache: "default", keepalive: true });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  return res.json();
};

export default function App() {
  useEffect(() => {
    // bersihkan cache detail yang sudah kadaluwarsa
    purgeSessionPrefix("sch-detail:", 1000 * 60 * 60 * 24 * 14);
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
  );
}
