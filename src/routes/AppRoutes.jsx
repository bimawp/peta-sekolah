// src/routes/AppRoutes.jsx
import React, { Suspense, lazy, useMemo, useEffect, useState, startTransition } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";

import Layout from "../components/common/Layout/Layout";
import SuspenseLoader from "../components/common/SuspenseLoader/SuspenseLoader";

const Dashboard = lazy(() => import("../pages/Dashboard/Dashboard.jsx"));
const SchoolDetailPage = lazy(() => import("../pages/SchoolDetail/SchoolDetailPage.jsx"));
const NotFound = lazy(() => import("../pages/NotFound/NotFound.jsx"));
const MapPage = lazy(() => import("../pages/Map/Map.jsx"));
const BudgetPage = lazy(() => import("../pages/Budget/BudgetPage.jsx"));
const FacilitiesPage = lazy(() => import("../pages/Facilities/FacilitiesPage.jsx"));

import {
  getSdDetailByNpsn,
  getSmpDetailByNpsn,
  getPaudDetailByNpsn,
  getPkbmDetailByNpsn,
} from "@/services/api/detailApi";

// ======= Scheduler low-priority (anti jank) =======
function scheduleLowPriority(cb, timeout = 1200) {
  try {
    if (typeof window !== "undefined" && typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(
        () => {
          try {
            cb();
          } catch {
            /* ignore */
          }
        },
        { timeout }
      );
      return () => {
        try {
          window.cancelIdleCallback?.(id);
        } catch {
          /* ignore */
        }
      };
    }
  } catch {
    /* ignore */
  }

  const t = setTimeout(() => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  }, 1);
  return () => clearTimeout(t);
}

const prefetch = (() => {
  const inFlight = new Set();
  return (loader, key) => {
    const k = key || loader.toString();
    if (inFlight.has(k)) return;
    inFlight.add(k);

    // Jalankan saat idle agar tidak mengganggu animasi/scroll/input user
    scheduleLowPriority(() => {
      loader()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => inFlight.delete(k), 5000);
        });
    });
  };
})();

export const prefetchPages = {
  dashboard: () => prefetch(() => import("../pages/Dashboard/Dashboard.jsx"), "pg:dashboard"),
  map: () => prefetch(() => import("../pages/Map/Map.jsx"), "pg:map"),
  budget: () => prefetch(() => import("../pages/Budget/BudgetPage.jsx"), "pg:budget"),
  facilities: () => prefetch(() => import("../pages/Facilities/FacilitiesPage.jsx"), "pg:facilities"),
  detail: () => prefetch(() => import("../pages/SchoolDetail/SchoolDetailPage.jsx"), "pg:detail"),
};

function QueryPreservingRedirect({ to }) {
  const { search } = useLocation();
  return <Navigate to={`${to}${search || ""}`} replace />;
}

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// ===== Cache helpers =====
const CACHE_PREFIX = "sch-detail:";
const getCacheKey = (jenjang, npsn) => `${CACHE_PREFIX}${jenjang}:${npsn}`;

function unwrapMaybe(x) {
  let cur = x;
  for (let i = 0; i < 4; i++) {
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) break;
    if (cur.data && typeof cur.data === "object") cur = cur.data;
    else if (cur.school && typeof cur.school === "object") cur = cur.school;
    else if (cur.detail && typeof cur.detail === "object") cur = cur.detail;
    else if (cur.payload && typeof cur.payload === "object") cur = cur.payload;
    else break;
  }
  return cur;
}

function isValidDetailPayload(data, npsn) {
  const base = unwrapMaybe(data);
  if (!base || typeof base !== "object" || Array.isArray(base)) return false;

  const want = String(npsn ?? "").trim();
  const got = String(base?.npsn ?? base?.NPSN ?? base?._raw?.npsn ?? "").trim();
  if (want && got && got === want) return true;

  const id = base?.id ?? base?.school_id ?? base?._raw?.id ?? base?._raw?.school_id;
  const name = String(base?.name ?? base?.school_name ?? base?.nama_sekolah ?? "").trim();
  if (id || name) return true;

  return false;
}

function readDetailCache(jenjang, npsn) {
  try {
    const raw = sessionStorage.getItem(getCacheKey(jenjang, npsn));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const data = parsed?.data || null;

    if (!isValidDetailPayload(data, npsn)) {
      sessionStorage.removeItem(getCacheKey(jenjang, npsn));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeDetailCache(jenjang, npsn, data) {
  try {
    if (!isValidDetailPayload(data, npsn)) return;
    sessionStorage.setItem(getCacheKey(jenjang, npsn), JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* ignore */
  }
}

const DetailLazyMap = {
  SD: lazy(() => import("@/components/schools/SchoolDetail/Sd/SchoolDetailSd")),
  SMP: lazy(() => import("@/components/schools/SchoolDetail/Smp/SchoolDetailSmp")),
  PAUD: lazy(() => import("@/components/schools/SchoolDetail/Paud/SchoolDetailPaud")),
  PKBM: lazy(() => import("@/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm")),
};

export function prefetchDetailModule(jenjang) {
  const map = {
    SD: () => import("@/components/schools/SchoolDetail/Sd/SchoolDetailSd"),
    SMP: () => import("@/components/schools/SchoolDetail/Smp/SchoolDetailSmp"),
    PAUD: () => import("@/components/schools/SchoolDetail/Paud/SchoolDetailPaud"),
    PKBM: () => import("@/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm"),
  };
  const loader = map[jenjang];
  if (loader) prefetch(loader, `detail:${jenjang}`);
}

function StandaloneDetailRoute({ jenjang }) {
  const query = useQuery();
  const npsn = query.get("npsn");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    prefetchDetailModule(jenjang);
  }, [jenjang]);

  useEffect(() => {
    let alive = true;

    const tSet = (fn) => {
      startTransition(() => {
        if (alive) fn();
      });
    };

    async function run() {
      tSet(() => setErr(null));

      if (!npsn) {
        tSet(() => {
          setLoading(false);
          setErr("Parameter NPSN tidak ditemukan.");
        });
        return;
      }

      const cached = readDetailCache(jenjang, npsn);
      const hadCache = Boolean(cached);

      if (cached) {
        tSet(() => {
          setDetail(cached);
          setLoading(false);
        });
      }

      try {
        let data = null;
        if (jenjang === "SD") data = await getSdDetailByNpsn(npsn);
        if (jenjang === "SMP") data = await getSmpDetailByNpsn(npsn);
        if (jenjang === "PAUD") data = await getPaudDetailByNpsn(npsn);
        if (jenjang === "PKBM") data = await getPkbmDetailByNpsn(npsn);

        if (!data) throw new Error("Detail sekolah tidak ditemukan (RPC mengembalikan kosong).");

        writeDetailCache(jenjang, npsn, data);
        if (!alive) return;

        // FIX: selalu replace (jangan prev || data)
        tSet(() => {
          setDetail(data);
          setLoading(false);
        });
      } catch (e) {
        if (!alive) return;
        if (!hadCache) {
          tSet(() => {
            setErr(e?.message || String(e));
            setLoading(false);
          });
        }
      }
    }

    // Jalankan fetch tanpa membuat render perpindahan jadi “nyangkut”
    run();

    return () => {
      alive = false;
    };
  }, [npsn, jenjang]);

  if (loading && !detail) return <div style={{ padding: 16 }}>Memuat detail sekolah…</div>;
  if (err && !detail) return <div style={{ padding: 16, color: "#b91c1c" }}>⚠️ {err}</div>;
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
  const location = useLocation();

  // ===== Smooth route rendering:
  // UI menahan halaman lama sampai halaman baru (lazy chunk) siap, sehingga tidak ada "kaku" saat pindah.
  const [displayLocation, setDisplayLocation] = useState(location);

  useEffect(() => {
    // gunakan key bila tersedia, fallback ke pathname+search
    const same =
      (displayLocation?.key && location?.key && displayLocation.key === location.key) ||
      (displayLocation?.pathname === location?.pathname && displayLocation?.search === location?.search);

    if (same) return;

    startTransition(() => {
      setDisplayLocation(location);
    });
  }, [location, displayLocation]);

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

  // Warm-up prefetch saat idle (mengurangi kemungkinan suspense saat pindah halaman)
  useEffect(() => {
    const cancels = [];

    cancels.push(
      scheduleLowPriority(() => {
        // prefetch halaman yang paling sering dipakai (tanpa mengubah perilaku UI)
        prefetchPages.dashboard();
        prefetchPages.map();
        prefetchPages.facilities();
        prefetchPages.budget();
        prefetchPages.detail();
      }, 1500)
    );

    cancels.push(
      scheduleLowPriority(() => {
        // prefetch komponen detail per jenjang agar klik detail terasa instan
        prefetchDetailModule("SD");
        prefetchDetailModule("SMP");
        prefetchDetailModule("PAUD");
        prefetchDetailModule("PKBM");
      }, 2500)
    );

    return () => {
      for (const c of cancels) {
        try {
          c?.();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return (
    <Suspense fallback={<SuspenseLoader />}>
      <Routes location={displayLocation}>
        <Route
          element={
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/peta" element={<MapPage />} />
          <Route path="/map" element={<Navigate to="/peta" replace />} />
          <Route path="/anggaran" element={<BudgetPage />} />
          <Route path="/lainnya" element={<FacilitiesPage />} />
          <Route path="/detail-sekolah" element={<SchoolDetailPage />} />
        </Route>

        <Route path="/sd/school_detail" element={<StandaloneDetailRoute jenjang="SD" />} />
        <Route path="/smp/school_detail" element={<StandaloneDetailRoute jenjang="SMP" />} />
        <Route path="/paud/school_detail" element={<StandaloneDetailRoute jenjang="PAUD" />} />
        <Route path="/pkbm/school_detail" element={<StandaloneDetailRoute jenjang="PKBM" />} />

        <Route path="/smp/school_detail_old" element={<QueryPreservingRedirect to="/smp/school_detail" />} />
        <Route path="/sd/school_detail_old" element={<QueryPreservingRedirect to="/sd/school_detail" />} />
        <Route path="/paud/school_detail_old" element={<QueryPreservingRedirect to="/paud/school_detail" />} />
        <Route path="/pkbm/school_detail_old" element={<QueryPreservingRedirect to="/pkbm/school_detail" />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
