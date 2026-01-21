// src/pages/SchoolDetail/SchoolDetailPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useDeferredValue,
  startTransition, // ✅ untuk non-blocking state updates
} from "react";
import "leaflet/dist/leaflet.css";
import "../../services/utils/mapUtils.js";
import SimpleMap from "../../components/common/Map/SimpleMap";
import styles from "./SchoolDetailPage.module.css";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  LabelList,
} from "@/components/chart/ChartKitImpl";

import {
  getSdDetailByNpsn,
  getSmpDetailByNpsn,
  getPaudDetailByNpsn,
  getPkbmDetailByNpsn,
} from "../../services/api/detailApi";

import { useHydratedSchools } from "../../hooks/useHydratedSchools";
import supabase from "@/services/supabaseClient"; // ✅ perbaikan: default import

import {
  DEFAULT_PAGE_FILTERS,
  getPageFiltersFromURL,
  setPageFiltersToURL,
} from "../../utils/urlFilters";

import SchoolDetailPaud from "@/components/schools/SchoolDetail/Paud/SchoolDetailPaud";
import SchoolDetailSd from "@/components/schools/SchoolDetail/Sd/SchoolDetailSd";
import SchoolDetailSmp from "@/components/schools/SchoolDetail/Smp/SchoolDetailSmp";
import SchoolDetailPkbm from "@/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm";

/* ============ UTIL ============ */
const isValidCoordinate = (lng, lat) =>
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 &&
  lng <= 180 &&
  lat >= -90 &&
  lat <= 90;

function qp(name) {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const v = params.get(name);
  return v && String(v).trim() !== "" ? v : null;
}

// ====== Responsive helpers ======
const useIsMobile = (maxWidthPx = 768) => {
  const get = () => {
    if (typeof window === "undefined") return false;
    try {
      return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
    } catch {
      return false;
    }
  };

  const [isMobile, setIsMobile] = useState(get);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let mq;
    try {
      mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    } catch {
      return;
    }

    const onChange = () => setIsMobile(!!mq?.matches);
    onChange();

    if (mq.addEventListener) mq.addEventListener("change", onChange);
    else mq.addListener(onChange);

    return () => {
      if (!mq) return;
      if (mq.removeEventListener) mq.removeEventListener("change", onChange);
      else mq.removeListener(onChange);
    };
  }, [maxWidthPx]);

  return isMobile;
};

// ====== Prefetch detail (cache di sessionStorage) ======
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

// ====== Cache list (agar load berikutnya instan) ======
const LIST_CACHE_KEY = "sch-list:v3";
const LIST_CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 jam

function readListCache() {
  try {
    const raw = sessionStorage.getItem(LIST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    const data = parsed?.data;
    if (!Array.isArray(data)) return null;
    if (ts && Date.now() - ts > LIST_CACHE_TTL_MS) return data; // stale ok
    return data;
  } catch {
    return null;
  }
}

function writeListCache(data) {
  try {
    if (!Array.isArray(data)) return;
    sessionStorage.setItem(
      LIST_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data })
    );
  } catch {
    /* ignore */
  }
}

/* =========================================================
   ✅ FIX ERROR 400 (MINIMAL):
   - Pakai query aman hanya pada tabel yang tersedia: schools, school_types, staff_summary, school_classes
   - Kegiatan: schools.kegiatan TIDAK ADA → ambil dari school_projects (activity_name, volume, fiscal_year)
   ========================================================= */
const _normSafe = (s) =>
  String(s ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();

const _normKecamatanLabelSafe = (x) =>
  _normSafe(x)
    .replace(/^KEC(?:AMATAN)?\./i, "")
    .replace(/^KECAMATAN\s+/i, "")
    .replace(/^KAB\.\s*/i, "")
    .replace(/\s+/g, " ")
    .toUpperCase();

async function _fetchDetailSafeByNpsn(npsn) {
  const { data, error } = await supabase
    .from("schools")
    .select(
      `
      id,
      name,
      npsn,
      status,
      address,
      student_count,
      st_male,
      st_female,
      lat,
      lng,
      facilities,
      class_condition,
      meta,
      details,
      location_id,
      school_type_id,
      village_name,
      school_types:school_type_id ( code,name ),
      locations:location_id ( subdistrict, village, district, province, extra ),
      staff_summary(*),
      school_classes(*),
      school_projects ( id, activity_name, volume, fiscal_year, created_at ),
      school_assets ( id, category, total, good, moderate, heavy, extra, created_at ),
      school_rooms ( id, room_type, available, description, extra, created_at )
    `
    )
    .eq("npsn", npsn)
    .single();

  if (error) {
    throw new Error(`[detailApi] ${error.message || error}`);
  }

  const lng = Number(data?.lng);
  const lat = Number(data?.lat);

  // toleransi swap jika lat/lng ketuker
  let coords = null;
  if (isValidCoordinate(lng, lat)) coords = [lng, lat];
  else if (isValidCoordinate(lat, lng)) coords = [lat, lng];

  const kecRaw =
    data?.locations?.subdistrict ||
    data?.locations?.district ||
    data?.meta?.kecamatan ||
    data?.details?.kecamatan ||
    data?.meta?.subdistrict ||
    "";
  const desaRaw =
    data?.locations?.village ||
    data?.village_name ||
    data?.meta?.desa ||
    data?.details?.desa ||
    data?.meta?.village ||
    "";

  const kecamatan = _normKecamatanLabelSafe(kecRaw);
  const desa = _normSafe(desaRaw);

  // ✅ suntikkan kegiatan dari school_projects ke meta.kegiatan kalau meta belum punya kegiatan yang terisi
  const meta0 = data?.meta && typeof data.meta === "object" ? data.meta : {};
  const details0 =
    data?.details && typeof data.details === "object" ? data.details : {};
  const detailsMeta =
    details0?.meta && typeof details0.meta === "object" ? details0.meta : {};
  const mergedMetaBase = {
    ...meta0,
    ...detailsMeta,
  };

  const projects = Array.isArray(data?.school_projects)
    ? data.school_projects
    : [];
  const metaHasKegiatan =
    Array.isArray(mergedMetaBase?.kegiatan) && mergedMetaBase.kegiatan.length > 0;

  const mergedMeta =
    !metaHasKegiatan && projects.length
      ? { ...mergedMetaBase, kegiatan: projects }
      : mergedMetaBase;

  return {
    id: data.id,
    npsn: data.npsn || "",
    name: data.name || "",
    status: data.status || "",
    jenjang: data?.school_types?.code || "", // 'SD','SMP','PAUD','PKBM'
    address: data.address || "",
    kecamatan,
    desa,
    coordinates: coords, // [lng,lat] atau null
    student_count: Number(data?.student_count || 0),
    st_male: Number(data?.st_male || 0),
    st_female: Number(data?.st_female || 0),
    facilities: data?.facilities || null,
    class_condition: data?.class_condition || null,
    meta: mergedMeta || null,
    details: data?.details || null,

    // relasi yang tersedia
    staff_summary: Array.isArray(data?.staff_summary) ? data.staff_summary : [],
    classes: Array.isArray(data?.school_classes) ? data.school_classes : [],
    projects: projects,
    assets: Array.isArray(data?.school_assets) ? data.school_assets : [],
    rooms: Array.isArray(data?.school_rooms) ? data.school_rooms : [],

    _raw: data,
  };
}

async function prefetchDetailByNpsn(jenjang, npsn) {
  if (!jenjang || !npsn) return;
  if (readDetailCache(jenjang, npsn)) return;

  try {
    const data = await _fetchDetailSafeByNpsn(npsn);
    if (data) writeDetailCache(jenjang, npsn, data);
  } catch {
    /* noop */
  }
}

const ric =
  typeof window !== "undefined" && window.requestIdleCallback
    ? window.requestIdleCallback
    : (cb) =>
        setTimeout(
          () => cb({ didTimeout: false, timeRemaining: () => 16 }),
          0
        );

// ======== SWR ringan untuk JSON statis (GeoJSON untuk filter Kec/Desa) ========
async function swrJson(url, cacheName = "ps-cache-v1") {
  let fromCache = null;
  try {
    if ("caches" in window) {
      const cache = await caches.open(cacheName);
      const cached = await cache.match(url, {
        ignoreVary: true,
        ignoreSearch: true,
      });
      if (cached) fromCache = await cached.json();
    }
  } catch {
    /* noop */
  }

  (async () => {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (res.ok) {
        const fresh = await res.json();
        if ("caches" in window) {
          const cache = await caches.open(cacheName);
          await cache.put(
            url,
            new Response(JSON.stringify(fresh), {
              headers: { "Content-Type": "application/json" },
            })
          );
        }
      }
    } catch {
      /* noop */
    }
  })();

  if (fromCache) return fromCache;
  const res = await fetch(url, { cache: "no-cache" });
  if (!res.ok) throw new Error(`Fetch failed for ${url}`);
  return res.json();
}

/* ==================== UTIL NORMALISASI ==================== */
const norm = (x) =>
  String(x ?? "")
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();

const keyify = (x) =>
  norm(x)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const isCodeLike = (v) => {
  const s = String(v || "").trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (/^id[0-9]{6,}$/.test(lower)) return true;
  if (/^[0-9]{6,}$/.test(s)) return true;
  if (s.length > 8 && /[0-9]{6,}/.test(s)) return true;
  return false;
};

/* =========================================================
   ✅ FIX MISMATCH: sumber angka kondisi kelas ada di meta.prasarana.classrooms
   ========================================================= */
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const deepMerge = (base, patch) => {
  if (!isObj(base)) base = {};
  if (!isObj(patch)) return base;
  const out = { ...base };
  for (const k of Object.keys(patch)) {
    const bv = out[k];
    const pv = patch[k];
    if (isObj(bv) && isObj(pv)) out[k] = deepMerge(bv, pv);
    else out[k] = pv;
  }
  return out;
};

function mergeMeta(meta, details) {
  const m = isObj(meta) ? meta : {};
  // details bisa object bebas; kadang punya details.meta
  const d = isObj(details) ? details : {};
  const dMeta = isObj(d?.meta) ? d.meta : {};
  // beberapa RPC menaruh meta langsung di details
  const dMetaAlt = !Object.keys(dMeta).length && isObj(d) ? d : {};
  return deepMerge(m, Object.keys(dMeta).length ? dMeta : dMetaAlt);
}

function pickFirstFinite(...vals) {
  for (const v of vals) {
    if (v === 0 || v === "0") return 0;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function extractKondisiFromAny({ meta, class_condition, row }) {
  const m = isObj(meta) ? meta : {};
  const cc = isObj(class_condition) ? class_condition : {};
  const r = isObj(row) ? row : {};

  // sumber utama: meta.prasarana.classrooms
  const prClass =
    (isObj(m?.prasarana?.classrooms) && m.prasarana.classrooms) ||
    (isObj(m?.prasarana?.kelas) && m.prasarana.kelas) ||
    (isObj(m?.prasarana?.ruangKelas) && m.prasarana.ruangKelas) ||
    {};

  // RPC list kadang mengembalikan flat fields (row.classrooms_good dst)
  const hasRpcFlat =
    r.classrooms_good != null ||
    r.classrooms_moderate_damage != null ||
    r.classrooms_heavy_damage != null ||
    r.lacking_rkb != null ||
    r.total_room != null;

  const baik = hasRpcFlat
    ? pickFirstFinite(r.classrooms_good, r.good, r.baik)
    : pickFirstFinite(
        prClass.classrooms_good,
        prClass.good,
        prClass.baik,
        cc.classrooms_good,
        cc.good,
        cc.baik
      );

  const rusakSedang = hasRpcFlat
    ? pickFirstFinite(r.classrooms_moderate_damage, r.moderate, r.moderate_damage)
    : pickFirstFinite(
        prClass.classrooms_moderate_damage,
        prClass.moderate_damage,
        prClass.moderate,
        prClass.rusak_sedang,
        prClass.rusakSedang,
        cc.classrooms_moderate_damage,
        cc.moderate_damage,
        cc.moderate,
        cc.rusak_sedang,
        cc.rusakSedang
      );

  const rusakBerat = hasRpcFlat
    ? pickFirstFinite(r.classrooms_heavy_damage, r.heavy, r.heavy_damage)
    : pickFirstFinite(
        prClass.classrooms_heavy_damage,
        prClass.heavy_damage,
        prClass.heavy,
        prClass.rusak_berat,
        prClass.rusakBerat,
        cc.classrooms_heavy_damage,
        cc.heavy_damage,
        cc.heavy,
        cc.rusak_berat,
        cc.rusakBerat
      );

  const kurangRKB = hasRpcFlat
    ? pickFirstFinite(r.lacking_rkb)
    : pickFirstFinite(
        prClass.lacking_rkb,
        prClass.kurang_rkb,
        prClass.kurangRkb,
        prClass.kurangRKB,
        cc.lacking_rkb,
        cc.kurang_rkb,
        cc.kurangRkb,
        cc.kurangRKB
      );

  const totalRoom = hasRpcFlat
    ? pickFirstFinite(r.total_room)
    : pickFirstFinite(prClass.total_room, prClass.total, cc.total_room, cc.total);

  return {
    baik: toNum(baik, 0),
    rusakSedang: toNum(rusakSedang, 0),
    rusakBerat: toNum(rusakBerat, 0),
    kurangRKB: toNum(kurangRKB, 0),
    totalRoom: toNum(totalRoom, 0),
  };
}

/* =========================================================
   ✅ FIX PENTING: Intervensi Ruang Kelas juga bisa berasal dari:
   - meta.kegiatan[] (array dari school_projects): { activity_name, volume, fiscal_year }
   ========================================================= */
function extractIntervensiFromMeta(meta) {
  const m = isObj(meta) ? meta : {};

  const parseMaybeJson = (v) => {
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }
    return v;
  };

  // 1) direct keys (tetap support yang lama)
  let rehab = pickFirstFinite(
    m?.kegiatanFisik?.rehab_unit,
    m?.kegiatanFisik?.rehabilitasi_unit,
    m?.kegiatanFisik?.rehabRuangKelas,
    m?.rehab_unit,
    m?.rehabilitasi_unit,
    m?.prasarana?.classrooms?.rehab_unit
  );

  let pembangunan = pickFirstFinite(
    m?.kegiatanFisik?.pembangunan_unit,
    m?.kegiatanFisik?.bangun_unit,
    m?.kegiatanFisik?.pembangunanRKB,
    m?.pembangunan_unit,
    m?.bangun_unit,
    m?.prasarana?.classrooms?.pembangunan_unit
  );

  // 2) array sources yang mungkin: kegiatanFisik[], kegiatan[] (diisi dari school_projects), projects[], dll
  const candidates = [
    m?.kegiatanFisik,
    m?.kegiatan, // <-- utama (disuntikkan dari school_projects)
    m?.projects,
    m?.intervensi,
    m?.intervensiRuangKelas,
  ].map(parseMaybeJson);

  const list = candidates.find((v) => Array.isArray(v)) || null;

  const getUnit = (it) =>
    toNum(it?.lokal ?? it?.unit ?? it?.jumlah ?? it?.count ?? it?.volume ?? 0, 0);

  const getType = (it) =>
    String(
      it?.kegiatan_type ??
        it?.type ??
        it?.jenis ??
        it?.kegiatan ??
        it?.activity_name ??
        it?.activityName ??
        it?.name ??
        ""
    )
      .toLowerCase()
      .trim();

  if (Array.isArray(list)) {
    let rSum = 0;
    let pSum = 0;

    for (const it of list) {
      const t = getType(it);
      if (!t) continue;

      if (t === "rehab" || t.includes("rehab") || t.includes("rehabilit")) {
        rSum += getUnit(it);
        continue;
      }
      if (
        t === "pembangunan" ||
        t.includes("pembangunan") ||
        t.includes("bangun") ||
        t.includes("rkb")
      ) {
        pSum += getUnit(it);
        continue;
      }
    }

    rehab = Math.max(toNum(rehab, 0), rSum);
    pembangunan = Math.max(toNum(pembangunan, 0), pSum);
  }

  return {
    rehab_unit: toNum(rehab, 0),
    pembangunan_unit: toNum(pembangunan, 0),
  };
}

/* ==================== ERROR BOUNDARY ==================== */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("SchoolDetailPage Error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.error}>
          <div>
            ⚠️ Terjadi kesalahan.{" "}
            <button
              className={styles.resetTableButton}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Coba lagi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ==================== PIE CHART ==================== */
const PieChartComponent = React.memo(({ title, data }) => {
  const isMobile = useIsMobile();
  const safe = (data || []).map((d) => ({
    ...d,
    value: Number(d?.value || 0),
  }));

  const total = safe.reduce((s, i) => s + i.value, 0);
  const validData = safe.filter((i) => i.value >= 0);

  if (!validData.length) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h3>{title}</h3>
        </div>
        <div className={styles.chartEmpty}>
          <img
            className={styles.chartEmptyIcon}
            alt=""
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E"
          />
          Tidak ada data
        </div>
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  const chartHeight = isMobile ? 280 : 360;
  const outerRadius = isMobile ? 100 : 120;

  // ✅ Label SELALU tampil & berada DI DALAM slice (warna)
  // ✅ Menampilkan PERSENTASE + TOTAL
  const renderSliceLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;

    const inR = Number(innerRadius ?? 0);
    const outR = Number(outerRadius ?? 0);
    const radius = inR + (outR - inR) * 0.55;

    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const v = Number(value || 0);
    const pct = total ? (v / total) * 100 : 0;
    const txtPct = `${pct.toFixed(1)}%`;
    const txtVal = v.toLocaleString("id-ID");

    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        className={styles.pieValueLabel}
        pointerEvents="none"
        fill="#ffffff"
      >
        <tspan x={x} dy="-0.2em" style={{ fontWeight: 700 }}>
          {txtPct}
        </tspan>
        <tspan
          x={x}
          dy="1.25em"
          style={{ fontWeight: 600, fontSize: isMobile ? 10 : 11 }}
        >
          {txtVal}
        </tspan>
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      const pct = total ? ((d.value / total) * 100).toFixed(1) : "0.0";
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipHeader}>
            <div
              className={styles.tooltipColorDot}
              style={{ backgroundColor: d.payload.color }}
            />
            <span className={styles.tooltipLabel}>{d.name}</span>
          </div>
          <div className={styles.tooltipValue}>
            {Number(d.value || 0).toLocaleString("id-ID")} ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>{title}</h3>
      </div>

      <div className={`${styles.chartContent} ${styles.pieRow}`}>
        <div className={styles.pieLeft}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <Pie
                data={validData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={outerRadius}
                labelLine={false}
                label={renderSliceLabel}
                isAnimationActive={false}
              >
                {validData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={<CustomTooltip />}
                cursor={false}
                isAnimationActive={false}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.pieRight}>
          <ul className={styles.legendList}>
            {validData.map((d, i) => {
              const pct = total ? (d.value / total) * 100 : 0;
              return (
                <li key={`${d.name}-${i}`} className={styles.legendItem}>
                  <span
                    className={styles.legendDot}
                    style={{ backgroundColor: d.color }}
                  />
                  <div className={styles.legendTexts}>
                    <span className={styles.legendLabel}>{d.name}</span>
                    <span className={styles.legendSub}>
                      {Number(d.value || 0).toLocaleString("id-ID")} •{" "}
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </li>
              );
            })}
            <li className={styles.legendTotal}>
              <span className={styles.legendTotalLabel}>Total</span>
              <span className={styles.legendTotalValue}>
                {Number(total || 0).toLocaleString("id-ID")}
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
});


/* ==================== BAR CHART ==================== */
const BarChartComponent = React.memo(({ title, data, colors }) => {
  const isMobile = useIsMobile();
  const chartHeight = isMobile ? 320 : 380;
  const xAxisAngle = isMobile ? -10 : -25;
  const xAxisHeight = isMobile ? 60 : 80;
  const xTickFont = isMobile ? 11 : 12;
  const yTickFont = isMobile ? 11 : 12;

  const safeData = (data || []).map((d) => ({
    ...d,
    value: Number(d?.value || 0),
  }));
  const hasAny = safeData.some((d) => d.value > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipHeader}>
            <span className={styles.tooltipLabel}>{label}</span>
          </div>
          <div className={styles.tooltipValue}>
            {Number(payload[0].value || 0).toLocaleString("id-ID")} unit
          </div>
        </div>
      );
    }
    return null;
  };

  const BarValueLabel = (props) => {
    const { x, y, width, value } = props;
    const val = Number(value || 0).toLocaleString("id-ID");
    const tx = x + width / 2;
    const ty = (y || 0) - 8;
    return (
      <text x={tx} y={ty} textAnchor="middle" className={styles.barValueLabel}>
        {val}
      </text>
    );
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3>{title}</h3>
      </div>
      {!hasAny ? (
        <div className={styles.chartEmpty}>
          <img
            className={styles.chartEmptyIcon}
            alt=""
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23E2E8F0'/%3E%3C/svg%3E"
          />
          Tidak ada data
        </div>
      ) : (
        <div className={styles.chartOverflow}>
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={safeData}
              margin={{
                top: 24,
                right: 16,
                left: 12,
                bottom: isMobile ? 42 : 56,
              }}
              className="horizontal-bar-chart"
            >
              <defs>
                {colors.map((c, i) => (
                  <linearGradient
                    key={i}
                    id={`gradient-${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: xTickFont, fill: "#64748b" }}
                interval={0}
                angle={xAxisAngle}
                textAnchor="end"
                height={xAxisHeight}
              />
              <YAxis
                tickFormatter={(v) => Number(v || 0).toLocaleString("id-ID")}
                tick={{ fontSize: yTickFont, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} isAnimationActive={false} />
              <Bar dataKey="value" isAnimationActive={false}>
                {safeData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={`url(#gradient-${i % colors.length})`}
                    stroke={colors[i % colors.length]}
                    strokeWidth={1}
                  />
                ))}
                <LabelList dataKey="value" content={<BarValueLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});


/* ==================== DATA TABLE ==================== */

const DataTable = React.memo(({ data, onDetailClick, onDetailPrefetch }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const deferredData = useDeferredValue(data); // ✅ tahan array besar

  const filteredData = useMemo(() => {
    let f = deferredData || [];
    if (deferredSearchTerm) {
      const q = deferredSearchTerm.toLowerCase();
      f = f.filter(
        (s) =>
          (s.namaSekolah || "").toLowerCase().includes(q) ||
          String(s.npsn || "").includes(deferredSearchTerm) ||
          (s.kecamatan || "").toLowerCase().includes(q)
      );
    }
    if (sortField) {
      f = [...f].sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];
        if (typeof aVal === "string") {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        if (aVal === bVal) return 0;
        return sortDirection === "asc"
          ? aVal > bVal
            ? 1
            : -1
          : aVal < bVal
          ? 1
          : -1;
      });
    }
    return f;
  }, [deferredData, deferredSearchTerm, sortField, sortDirection]);

  const { data: paginatedData, totalPages, totalItems } = useMemo(() => {
    const t = Math.ceil(filteredData.length / itemsPerPage);
    const s = (currentPage - 1) * itemsPerPage;
    return {
      data: filteredData.slice(s, s + itemsPerPage),
      totalPages: t > 0 ? t : 1,
      totalItems: filteredData.length,
    };
  }, [filteredData, currentPage, itemsPerPage]);

  const handleSort = (field) => {
    if (sortField === field)
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchTerm, itemsPerPage]);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableControls}>
        <div className={styles.searchContainer}>
          <div className={styles.searchIcon}>🔍</div>
          <input
            type="text"
            placeholder="Cari nama sekolah, NPSN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
          {searchTerm && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchTerm("")}
            >
              ✕
            </button>
          )}
        </div>
        <div className={styles.controlGroup}>
          <label>Tampilkan:</label>
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className={styles.itemsPerPageSelect}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <button
            onClick={() => {
              setSearchTerm("");
              setCurrentPage(1);
              setItemsPerPage(10);
              setSortField("");
              setSortDirection("asc");
            }}
            className={styles.resetTableButton}
          >
            Reset
          </button>
        </div>
      </div>

      <div className={styles.tableScrollContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>NO</th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("npsn")}
              >
                NPSN{" "}
                {sortField === "npsn" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("namaSekolah")}
              >
                NAMA SEKOLAH{" "}
                {sortField === "namaSekolah" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("jenjang")}
              >
                JENJANG{" "}
                {sortField === "jenjang" &&
                  (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th>TIPE</th>
              <th>DESA</th>
              <th>KECAMATAN</th>
              <th>SISWA</th>
              <th>KLS BAIK</th>
              <th>R. SEDANG</th>
              <th>R. BERAT</th>
              <th>KURANG RKB</th>
              <th>REHAB</th>
              <th>PEMBANGUNAN</th>
              <th>DETAIL</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((school, index) => {
                const jenjang = String(
                  school?.jenjang || school?.level || ""
                ).toUpperCase();
                const npsn = school?.npsn;
                return (
                  <tr
                    key={`${school.npsn || index}-${index}`}
                    className={styles.tableRow}
                  >
                    <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                    <td>
                      <span className={styles.npsnBadge}>
                        {school.npsn || "-"}
                      </span>
                    </td>
                    <td className={styles.schoolNameCell}>
                      {school.namaSekolah || "-"}
                    </td>
                    <td>
                      <span
                        className={`${styles.jenjangBadge} ${
                          styles[school.jenjang?.toLowerCase?.() || ""]
                        }`}
                      >
                        {school.jenjang || "-"}
                      </span>
                    </td>
                    <td>{school.tipeSekolah || "-"}</td>
                    <td>{school.desa || "-"}</td>
                    <td>{school.kecamatan || "-"}</td>
                    <td>
                      <span className={styles.numberBadge}>
                        {Number(school.student_count || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.conditionGood}>
                        {Number(school.kondisiKelas?.baik || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.conditionModerate}>
                        {Number(school.kondisiKelas?.rusakSedang || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.conditionBad}>
                        {Number(school.kondisiKelas?.rusakBerat || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.numberBadge}>
                        {Number(school.kurangRKB || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.numberBadge}>
                        {Number(school.rehabRuangKelas || 0)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.numberBadge}>
                        {Number(school.pembangunanRKB || 0)}
                      </span>
                    </td>
                    <td>
                      <button
                        className={styles.detailButton}
                        onMouseEnter={() =>
                          onDetailPrefetch && onDetailPrefetch(jenjang, npsn)
                        }
                        onFocus={() =>
                          onDetailPrefetch && onDetailPrefetch(jenjang, npsn)
                        }
                        onClick={() => onDetailClick && onDetailClick(jenjang, npsn)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="15" className={styles.noDataCell}>
                  <div className={styles.chartEmpty}>
                    <img
                      className={styles.chartEmptyIcon}
                      alt=""
                      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E"
                    />
                    Tidak ada data
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.paginationInfo}>
          <span className={styles.pageInfo}>
            Menampilkan <strong>{paginatedData.length}</strong> dari{" "}
            <strong>{totalItems}</strong> data
          </span>
        </div>
        <div className={styles.pageButtons}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            className={styles.pageButton}
          >
            ⏮️
          </button>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className={styles.pageButton}
          >
            ⬅️
          </button>
          <span className={styles.pageIndicator}>
            <strong>{currentPage}</strong> / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className={styles.pageButton}
          >
            ➡️
          </button>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className={styles.pageButton}
          >
            ⏭️
          </button>
        </div>
      </div>
    </div>
  );
});

/* ==================== FILTER BAR (compact & mobile first) ==================== */
const FilterBar = React.memo(function FilterBar({
  filterJenjang,
  setFilterJenjang,
  filterKecamatan,
  setFilterKecamatan,
  filterDesa,
  setFilterDesa,
  kondisiFilter,
  setKondisiFilter,
  handleResetAllFilters,
  kecamatanList,
  desaList,
}) {
  // deteksi mobile
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 768px)").matches
      : false
  );
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  const [open, setOpen] = useState(false);

  const Chip = ({ label }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 999,
        padding: "6px 10px",
        fontSize: 12,
        background: "#EEF2FF",
        color: "#1F2937",
        border: "1px solid #E5E7EB",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );

  const summaryChips = (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Chip label={`Jenjang: ${filterJenjang}`} />
      <Chip label={`Kec: ${filterKecamatan}`} />
      <Chip label={`Desa: ${filterDesa}`} />
      <Chip label={`Kondisi: ${kondisiFilter}`} />
    </div>
  );

  // grid area untuk kontrol filter
  const gridStyle = {
    display: "grid",
    gap: 10,
    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
  };

  const selectStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#FFFFFF",
    minHeight: 44, // sentuhan nyaman
    fontSize: 14,
  };

  const labelStyle = {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 6,
    display: "block",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  };

  const resetStyle = {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#F8FAFC",
    minHeight: 44,
    fontSize: 14,
    fontWeight: 600,
  };

  // kontainer sticky agar tetap terlihat saat scroll (mobile)
  const wrapperStyle = {
    position: "sticky",
    top: isMobile ? 8 : 0,
    zIndex: 2,
    background: "#FFFFFF",
    borderRadius: 16,
    border: "1px solid #E5E7EB",
    boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
    padding: 12,
  };

  return (
    <div className={styles.filtersContainer} style={wrapperStyle}>
      {isMobile ? (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: open ? 12 : 0,
            }}
          >
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid #E5E7EB",
                background: "#F8FAFC",
                fontWeight: 600,
              }}
            >
              {open ? "Tutup Filter" : "Buka Filter"} ⚙️
            </button>
            <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
              {summaryChips}
            </div>
          </div>

          {open && (
            <div style={{ ...gridStyle }}>
              <div className={styles.filterGroup} style={{ minWidth: 0 }}>
                <label style={labelStyle}>Jenjang</label>
                <select
                  aria-label="Jenjang"
                  value={filterJenjang}
                  onChange={(e) => setFilterJenjang(e.target.value)}
                  style={selectStyle}
                >
                  <option>Semua Jenjang</option>
                  {["PAUD", "SD", "SMP", "PKBM"].map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup} style={{ minWidth: 0 }}>
                <label style={labelStyle}>Kecamatan</label>
                <select
                  aria-label="Kecamatan"
                  value={filterKecamatan}
                  onChange={(e) => setFilterKecamatan(e.target.value)}
                  style={selectStyle}
                >
                  <option>Semua Kecamatan</option>
                  {kecamatanList.map((kec) => (
                    <option key={kec} value={kec}>
                      {kec}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup} style={{ minWidth: 0 }}>
                <label style={labelStyle}>Desa/Kelurahan</label>
                <select
                  aria-label="Desa/Kelurahan"
                  value={filterDesa}
                  onChange={(e) => setFilterDesa(e.target.value)}
                  disabled={
                    !filterKecamatan ||
                    filterKecamatan === "Semua Kecamatan" ||
                    desaList.length === 0
                  }
                  style={{
                    ...selectStyle,
                    background:
                      !filterKecamatan ||
                      filterKecamatan === "Semua Kecamatan" ||
                      desaList.length === 0
                        ? "#F3F4F6"
                        : "#FFFFFF",
                  }}
                >
                  <option>Semua Desa</option>
                  {desaList.map((desa) => (
                    <option key={desa} value={desa}>
                      {desa}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup} style={{ minWidth: 0 }}>
                <label style={labelStyle}>Kondisi</label>
                <select
                  aria-label="Kondisi"
                  value={kondisiFilter}
                  onChange={(e) => setKondisiFilter(e.target.value)}
                  style={selectStyle}
                >
                  <option>Semua Kondisi</option>
                  <option>Baik</option>
                  <option>Rusak Sedang</option>
                  <option>Rusak Berat</option>
                  <option>Kurang RKB</option>
                </select>
              </div>

              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10 }}>
                <button onClick={handleResetAllFilters} style={resetStyle}>
                  🔄 Reset Filter
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        // DESKTOP
        <div style={{ ...gridStyle, gridTemplateColumns: "repeat(5, 1fr)" }}>
          <div className={styles.filterGroup}>
            <label style={labelStyle}>Jenjang</label>
            <select
              value={filterJenjang}
              onChange={(e) => setFilterJenjang(e.target.value)}
              style={selectStyle}
            >
              <option>Semua Jenjang</option>
              {["PAUD", "SD", "SMP", "PKBM"].map((jenjang) => (
                <option key={jenjang} value={jenjang}>
                  {jenjang}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label style={labelStyle}>Kecamatan</label>
            <select
              value={filterKecamatan}
              onChange={(e) => setFilterKecamatan(e.target.value)}
              style={selectStyle}
            >
              <option>Semua Kecamatan</option>
              {kecamatanList.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label style={labelStyle}>Desa/Kelurahan</label>
            <select
              value={filterDesa}
              onChange={(e) => setFilterDesa(e.target.value)}
              disabled={
                !filterKecamatan ||
                filterKecamatan === "Semua Kecamatan" ||
                desaList.length === 0
              }
              style={{
                ...selectStyle,
                background:
                  !filterKecamatan ||
                  filterKecamatan === "Semua Kecamatan" ||
                  desaList.length === 0
                    ? "#F3F4F6"
                    : "#FFFFFF",
              }}
            >
              <option>Semua Desa</option>
              {desaList.map((desa) => (
                <option key={desa} value={desa}>
                  {desa}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label style={labelStyle}>Kondisi</label>
            <select
              value={kondisiFilter}
              onChange={(e) => setKondisiFilter(e.target.value)}
              style={selectStyle}
            >
              <option>Semua Kondisi</option>
              <option>Baik</option>
              <option>Rusak Sedang</option>
              <option>Rusak Berat</option>
              <option>Kurang RKB</option>
            </select>
          </div>

          <div style={{ display: "flex", alignItems: "end" }}>
            <button onClick={handleResetAllFilters} style={resetStyle}>
              🔄 Reset Filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

/* ==================== MAIN ==================== */
const SchoolDetailPage = ({ hideChrome = false }) => {
  const [schoolData, setSchoolData] = useState([]);
  const [geoData, setGeoData] = useState({
    kecamatan: null,
    desa: null,
  });

  // Render heavy UI (map + charts) setelah data siap agar first paint lebih cepat
  const [renderHeavyUI, setRenderHeavyUI] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState("main");

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const detailCache = useRef(new Map());

  const cameFromFacilitiesRef = useRef(qp("from") === "facilities");

  // FILTER BAR
  const [filterJenjang, setFilterJenjang] = useState(
    DEFAULT_PAGE_FILTERS.jenjang
  );
  const [filterKecamatan, setFilterKecamatan] = useState(
    DEFAULT_PAGE_FILTERS.kecamatan
  );
  const [filterDesa, setFilterDesa] = useState(DEFAULT_PAGE_FILTERS.desa);
  const [kondisiFilter, setKondisiFilter] = useState("Semua Kondisi");

  // =======================
  // ✅ TAMBAHAN MINIMAL: FULL FILTER UNTUK MAP MODE SEKOLAH
  // =======================
  const isAllValue = (v) => {
    const s = String(v ?? "").trim();
    if (!s) return true;
    const low = s.toLowerCase();
    if (low.startsWith("semua")) return true;
    if (low.startsWith("(semua")) return true;
    if (low.includes("pilih")) return true;
    if (low.includes("select")) return true;
    return false;
  };

  // Full filter HANYA: jenjang + kecamatan + desa
  const hasFullFilter =
    !isAllValue(filterJenjang) &&
    !isAllValue(filterKecamatan) &&
    !isAllValue(filterDesa);

  const mapFilters = useMemo(
    () => ({
      jenjang: filterJenjang,
      kecamatan: filterKecamatan,
      desa: filterDesa,
      kondisi: kondisiFilter,
    }),
    [filterJenjang, filterKecamatan, filterDesa, kondisiFilter]
  );

  // pilihan dropdown (Kec/Desa tetap dari JSON – TIDAK disentuh)
  const [jenjangList] = useState(["PAUD", "SD", "SMP", "PKBM"]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [desaByKecamatan, setDesaByKecamatan] = useState({});
  const [mapView] = useState({
    center: [-7.21, 107.91],
    zoom: 11,
  });

  // INIT filters dari URL
  useEffect(() => {
    const f = getPageFiltersFromURL();
    setFilterJenjang(f.jenjang || DEFAULT_PAGE_FILTERS.jenjang);
    setFilterKecamatan(f.kecamatan || DEFAULT_PAGE_FILTERS.kecamatan);
    setFilterDesa(f.desa || DEFAULT_PAGE_FILTERS.desa);
  }, []);

  // Sync filters ke URL
  useEffect(() => {
    setPageFiltersToURL({
      jenjang: filterJenjang,
      kecamatan: filterKecamatan,
      desa: filterDesa,
    });
  }, [filterJenjang, filterKecamatan, filterDesa]);

  // buka detail di tab baru (per jenjang)
  const handleDetailClick = useCallback((jenjang, npsn) => {
    if (!npsn) {
      alert("NPSN sekolah tidak ditemukan.");
      return;
    }

    const j = String(jenjang || "").toUpperCase();

    let url = `/detail-sekolah?npsn=${encodeURIComponent(
      npsn
    )}&jenjang=${encodeURIComponent(j)}`;
    if (j === "PAUD") {
      url = `/paud/school_detail?npsn=${encodeURIComponent(npsn)}`;
    }
    if (j === "SD") {
      url = `/sd/school_detail?npsn=${encodeURIComponent(npsn)}`;
    }
    if (j === "SMP") {
      url = `/smp/school_detail?npsn=${encodeURIComponent(npsn)}`;
    }
    if (j === "PKBM") {
      url = `/pkbm/school_detail?npsn=${encodeURIComponent(npsn)}`;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handlePrefetchDetail = useCallback((jenjang, npsn) => {
    prefetchDetailByNpsn(jenjang, npsn);
  }, []);

  const handleBackToMain = useCallback(() => {
    if (cameFromFacilitiesRef.current) {
      window.location.assign("/facilities");
      return;
    }
    setCurrentView("main");
    setSelectedSchool(null);
    setSelectedDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

  /* ==================== MASTER LOKASI DARI GEOJSON (JSON statis) ==================== */
  const cleanName = (x) =>
    String(x ?? "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .trim();

  // Bangun master kecamatan + desa dari geoData.desa (bukan dari Supabase) — ❗ JANGAN diubah
  useEffect(() => {
    const desaGeo = geoData?.desa;
    if (!desaGeo || !Array.isArray(desaGeo.features)) {
      return;
    }

    const kecMap = new Map(); // kecKey -> label kecamatan
    const desaMap = new Map(); // kecKey -> Set desa

    for (const feat of desaGeo.features) {
      const props = feat.properties || {};

      const rawKec =
        props.subdistrict ||
        props.kecamatan ||
        props.district ||
        props.District ||
        "";
      const kecLabel = cleanName(rawKec);
      if (!kecLabel || isCodeLike(kecLabel)) continue;
      const kecKey = keyify(kecLabel);
      if (!kecMap.has(kecKey)) kecMap.set(kecKey, kecLabel);

      const rawDesa =
        props.village ||
        props.desa ||
        props.Desa ||
        props.VILLAGE ||
        "";
      const desaLabel = cleanName(rawDesa);
      if (!desaLabel || isCodeLike(desaLabel)) continue;

      let dSet = desaMap.get(kecKey);
      if (!dSet) {
        dSet = new Set();
        desaMap.set(kecKey, dSet);
      }
      dSet.add(desaLabel);
    }

    const kecList = Array.from(kecMap.values()).sort((a, b) =>
      a.localeCompare(b, "id")
    );
    setKecamatanList(kecList);

    const byKec = {};
    desaMap.forEach((set, key) => {
      byKec[key] = Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
    });
    setDesaByKecamatan(byKec);
  }, [geoData]);

  // isi desaList setiap kali kecamatan dipilih — ❗ JANGAN diubah
  useEffect(() => {
    if (!filterKecamatan || filterKecamatan === "Semua Kecamatan") {
      setDesaList([]);
      if (filterDesa !== "Semua Desa") setFilterDesa("Semua Desa");
      return;
    }

    const key = keyify(filterKecamatan);
    const list = desaByKecamatan[key] || [];
    setDesaList(list);

    if (filterDesa !== "Semua Desa" && !list.includes(filterDesa)) {
      setFilterDesa("Semua Desa");
    }
  }, [filterKecamatan, desaByKecamatan, filterDesa]);

  /* ==================== FETCH LIST DATA dari Supabase ==================== */

  // ✅ cache map kegiatan (npsn -> kegiatan array) dari school_projects / fallback v_json_kegiatan_rows
  const kegiatanMapRef = useRef(null);

  const getKegiatanMap = useCallback(async () => {
    if (kegiatanMapRef.current) return kegiatanMapRef.current;

    const m = new Map();

    const push = (npsn, activity_name, volume, fiscal_year) => {
      const key = String(npsn ?? "").trim();
      const name = String(activity_name ?? "").trim();
      if (!key || !name) return;

      const item = {
        activity_name: name,
        volume: Number(volume ?? 0) || 0,
        fiscal_year: fiscal_year != null ? Number(fiscal_year) : null,
      };

      const arr = m.get(key) || [];
      arr.push(item);
      m.set(key, arr);
    };

    const pageSize = 1000;
    const maxRows = 50000;

    // 1) utama: school_projects
    try {
      for (let from = 0; from < maxRows; from += pageSize) {
        const { data, error } = await supabase
          .from("school_projects")
          .select("npsn, activity_name, volume, fiscal_year")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        const rows = Array.isArray(data) ? data : [];
        if (!rows.length) break;

        for (const r of rows) {
          push(r?.npsn, r?.activity_name, r?.volume, r?.fiscal_year);
        }

        if (rows.length < pageSize) break;
      }
    } catch {
      // ignore → fallback view
    }

    // 2) fallback: v_json_kegiatan_rows jika hasil utama terlalu sedikit (indikasi kosong/tidak terakses)
    try {
      if (m.size < 1000) {
        for (let from = 0; from < maxRows; from += pageSize) {
          const { data, error } = await supabase
            .from("v_json_kegiatan_rows")
            .select("npsn, activity_name, volume, fiscal_year")
            .range(from, from + pageSize - 1);

          if (error) throw error;
          const rows = Array.isArray(data) ? data : [];
          if (!rows.length) break;

          for (const r of rows) {
            push(r?.npsn, r?.activity_name, r?.volume, r?.fiscal_year);
          }

          if (rows.length < pageSize) break;
        }
      }
    } catch {
      // ignore
    }

    kegiatanMapRef.current = m;
    return m;
  }, []);

  // 1) Coba via RPC (jika tersedia)
  const fetchSchoolsViaRpc = useCallback(
    async (
      { levelValue, kecamatanValue, villageValue, kondisiValue },
      opts = { includeKegiatanMap: false }
    ) => {
      // ✅ sesuai permintaan: pakai 'ALL' sebagai default agar tidak kirim null/undefined
      const params = {
        p_jenjang: levelValue ? String(levelValue).toUpperCase() : "ALL",
        p_kecamatan: kecamatanValue ? String(kecamatanValue) : "ALL",
        p_desa: villageValue ? String(villageValue) : "ALL",
        ...(kondisiValue ? { p_kondisi: String(kondisiValue) } : {}),
      };

      const callRpc = async (rpcParams) => {
        const { data, error } = await supabase.rpc(
          "rpc_school_detail_list",
          rpcParams
        );

        if (error) {
          console.error("rpc_school_detail_list error:", error.message);
        } else {
          console.log(
            "Data Berhasil Diambil:",
            Array.isArray(data) ? data.length : 0
          );
        }

        return { data, error };
      };

      let { data, error } = await callRpc(params);

      // ✅ fallback otomatis: jika Supabase function ternyata TIDAK punya p_kondisi
      if (error) {
        const msg = String(error?.message || "").toLowerCase();
        const details = String(error?.details || "").toLowerCase();
        const combined = `${msg} ${details}`;
        if (
          combined.includes("p_kondisi") &&
          (combined.includes("parameter") ||
            combined.includes("could not find") ||
            combined.includes("not found"))
        ) {
          const { p_kondisi, ...paramsNoKondisi } = params;
          const retry = await callRpc(paramsNoKondisi);
          data = retry.data;
          error = retry.error;
        }
      }

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];

      // ✅ PERFORMANCE: list view tidak memproses JSON besar (meta/details) agar load jauh lebih cepat
      // Data detail lengkap tetap diambil saat user buka halaman detail sekolah.
      return rows.map((row) => {
        const lng = Number(row?.lng);
        const lat = Number(row?.lat);

        const kk = extractKondisiFromAny({
          meta: null,
          class_condition: row?.class_condition,
          row,
        });

        const rehabFinal =
          row?.rehab_unit != null ? Number(row.rehab_unit || 0) : 0;
        const bangunFinal =
          row?.pembangunan_unit != null ? Number(row.pembangunan_unit || 0) : 0;

        return {
          id: row.id,
          npsn: row.npsn,
          namaSekolah: row.nama_sekolah || row.name || "",
          jenjang: String(row.jenjang || "").trim().toUpperCase(),
          tipeSekolah: row.tipe_sekolah || row.status || "-",
          desa: row.desa || row.village || row.village_name || null,
          kecamatan: row.kecamatan || row.subdistrict || null,
          student_count: Number(row.student_count || 0),
          coordinates: isValidCoordinate(lng, lat) ? [lng, lat] : null,

          kondisiKelas: {
            baik: kk.baik,
            rusakSedang: kk.rusakSedang,
            rusakBerat: kk.rusakBerat,
          },
          kurangRKB: kk.kurangRKB,

          rehabRuangKelas: rehabFinal,
          pembangunanRKB: bangunFinal,

          meta: null,
        };
      });
    },
    []
  );

  // 2) Fallback: langsung dari tabel `schools` + relasi (client-side filter)
  // ✅ PERFORMANCE: ambil kolom MINIMAL untuk list agar cepat (tidak tarik meta/details/facilities besar)
  const fetchSchoolsViaSelect = useCallback(async () => {
    const { data, error } = await supabase
      .from("schools")
      .select(
        `
        id, npsn, name, status,
        student_count, lat, lng,
        village_name,
        class_condition,
        location_id, school_type_id,
        locations:location_id ( subdistrict, village, district, province ),
        school_types!school_type_id ( code, name )
      `
      )
      .limit(7000);

    if (error) throw error;

    return (data || []).map((s) => {
      const lng = Number(s?.lng);
      const lat = Number(s?.lat);

      const kk = extractKondisiFromAny({
        meta: null,
        class_condition: s?.class_condition,
        row: null,
      });

      return {
        id: s.id,
        npsn: s.npsn || "",
        namaSekolah: s.name || "",
        jenjang: String(s?.school_types?.code || "").toUpperCase(),
        tipeSekolah: s.status || "-",
        desa: s?.locations?.village || s?.village_name || "-",
        kecamatan: s?.locations?.subdistrict || s?.locations?.district || "-",
        student_count: Number(s?.student_count || 0),
        coordinates: isValidCoordinate(lng, lat) ? [lng, lat] : null,

        kondisiKelas: {
          baik: kk.baik,
          rusakSedang: kk.rusakSedang,
          rusakBerat: kk.rusakBerat,
        },
        kurangRKB: kk.kurangRKB,

        // ✅ intervensi (rehab/pembangunan) diperkaya saat user buka halaman detail
        rehabRuangKelas: 0,
        pembangunanRKB: 0,

        meta: null,
      };
    });
  }, []);

  // fallback detail satu sekolah langsung dari tabel "schools"
  const fetchSchoolDetail = useCallback(async (schoolId) => {
    const { data, error } = await supabase
      .from("schools")
      .select(
        `
        id,
        npsn,
        name,
        address,
        village_name,
        status,
        student_count,
        st_male,
        st_female,
        lat,
        lng,
        class_condition,
        facilities,
        meta,
        details,
        location_id,
        locations:location_id ( subdistrict, village, district, province, extra )
      `
      )
      .eq("id", schoolId)
      .single();

    if (error) throw error;

    // ambil kegiatan dari school_projects (berdasar school_id / npsn)
    let projects = [];
    try {
      const { data: pRows } = await supabase
        .from("school_projects")
        .select("id, npsn, activity_name, volume, fiscal_year, created_at")
        .eq("school_id", data?.id)
        .limit(5000);
      projects = Array.isArray(pRows) ? pRows : [];
      if (!projects.length && data?.npsn) {
        const { data: pRows2 } = await supabase
          .from("school_projects")
          .select("id, npsn, activity_name, volume, fiscal_year, created_at")
          .eq("npsn", data?.npsn)
          .limit(5000);
        projects = Array.isArray(pRows2) ? pRows2 : [];
      }
    } catch {
      // ignore
    }

    const mergedMeta0 = mergeMeta(data?.meta, data?.details);
    const metaHasKegiatan =
      Array.isArray(mergedMeta0?.kegiatan) && mergedMeta0.kegiatan.length > 0;

    const mergedMeta =
      !metaHasKegiatan && projects.length
        ? deepMerge(mergedMeta0, { kegiatan: projects })
        : mergedMeta0;

    const kk = extractKondisiFromAny({
      meta: mergedMeta,
      class_condition: data?.class_condition,
      row: null,
    });

    const lng = Number(data?.lng);
    const lat = Number(data?.lat);

    const mergedDetail = {
      ...data,
      meta: mergedMeta,
      namaSekolah: data?.name,
      desa: data?.locations?.village || data?.village_name,
      kecamatan:
        data?.locations?.subdistrict || data?.locations?.district || "-",
      koordinat: isValidCoordinate(lng, lat) ? [lng, lat] : null,
      kondisiKelas: {
        baik: kk.baik,
        rusakSedang: kk.rusakSedang,
        rusakBerat: kk.rusakBerat,
        total: kk.totalRoom,
        kurangRKB: kk.kurangRKB,
      },
      projects,
    };

    return mergedDetail;
  }, []);

  // GEOJSON cache (overlay peta) — sumber filter kec/desa
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [kecGeo, desaGeo] = await Promise.all([
          swrJson("/data/kecamatan.geojson"),
          swrJson("/data/desa.geojson"),
        ]);
        if (!alive) return;
        setGeoData({ kecamatan: kecGeo, desa: desaGeo });
      } catch {
        if (!alive) return;
        setGeoData({ kecamatan: null, desa: null });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // LOAD LIST DATA dari Supabase
  // ✅ Dipercepat:
  //    - gunakan cache list (stale-while-revalidate)
  //    - lakukan fetch RPC dan SELECT secara paralel, ambil yang paling cepat
  // ✅ Filter hanya untuk MAP + CHART; TABEL tetap default (tidak ikut filter)
  useEffect(() => {
    let alive = true;
    setError(null);

    const cached = readListCache();
    if (Array.isArray(cached) && cached.length) {
      startTransition(() => setSchoolData(cached));
      setLoading(false);
      setRenderHeavyUI(true);
    } else {
      setLoading(true);
    }

    const setRows = (rows) => {
      if (!alive) return;
      if (!Array.isArray(rows) || rows.length === 0) return;
      startTransition(() => setSchoolData(rows));
      writeListCache(rows);
      setLoading(false);
      setRenderHeavyUI(true);
    };

    (async () => {
      try {
        const pRpc = fetchSchoolsViaRpc(
          {
            levelValue: null,
            kecamatanValue: null,
            villageValue: null,
            kondisiValue: null,
          },
          { includeKegiatanMap: false }
        ).catch(() => null);

        const pSel = fetchSchoolsViaSelect().catch(() => null);

        // ambil hasil tercepat dulu agar UI cepat muncul
        const first = await Promise.race([pRpc, pSel]);
        if (Array.isArray(first) && first.length) setRows(first);

        // lalu ambil yang paling lengkap/tersedia
        const [rpcRows, selRows] = await Promise.all([pRpc, pSel]);
        const best =
          Array.isArray(rpcRows) && rpcRows.length
            ? rpcRows
            : Array.isArray(selRows) && selRows.length
            ? selRows
            : null;

        if (best && (!first || best !== first)) setRows(best);
      } catch (e) {
        if (!alive) return;
        console.error("[SchoolDetailPage] load error:", e);
        setError(e?.message || String(e));
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [fetchSchoolsViaRpc, fetchSchoolsViaSelect]);

  // hydrate dari hook (jika ada enrichment lain)
  const hydratedSchools = useHydratedSchools(schoolData);

  // ✅ tampil cepat: jika hook masih memproses, gunakan schoolData terlebih dahulu
  const deferredHydrated = useMemo(() => {
    if (Array.isArray(hydratedSchools) && hydratedSchools.length) return hydratedSchools;
    return Array.isArray(schoolData) ? schoolData : [];
  }, [hydratedSchools, schoolData]);

  // ✅ percepat tampil map + chart: jangan menunggu idle callback
  useEffect(() => {
    if (renderHeavyUI) return;
    if (loading) return;
    if (!Array.isArray(deferredHydrated) || deferredHydrated.length === 0) return;

    const t = setTimeout(() => setRenderHeavyUI(true), 0);
    return () => clearTimeout(t);
  }, [renderHeavyUI, loading, deferredHydrated]);

  // ✅ LAZY enrichment kegiatan dari school_projects (tanpa menahan render awal)
  const kegiatanEnrichStartedRef = useRef(false);
  useEffect(() => {
    if (!Array.isArray(schoolData) || schoolData.length === 0) return;
    if (kegiatanEnrichStartedRef.current) return;

    // Hanya enrich jika masih banyak yang 0 & belum punya meta.kegiatan
    const needEnrich = schoolData.some((s) => {
      const metaObj = isObj(s?.meta) ? s.meta : {};
      const hasKegiatan =
        Array.isArray(metaObj?.kegiatan) && metaObj.kegiatan.length > 0;
      const rehab0 = Number(s?.rehabRuangKelas || 0) === 0;
      const bangun0 = Number(s?.pembangunanRKB || 0) === 0;
      return !hasKegiatan && (rehab0 || bangun0);
    });

    kegiatanEnrichStartedRef.current = true;
    if (!needEnrich) return;

    let alive = true;
    ric(async () => {
      try {
        const m = await getKegiatanMap();
        if (!alive || !m || !m.size) return;

        startTransition(() => {
          setSchoolData((prev) => {
            if (!Array.isArray(prev) || prev.length === 0) return prev;

            let changed = false;
            const out = prev.map((s) => {
              const key = String(s?.npsn || "").trim();
              if (!key) return s;

              const kegiatan = m.get(key);
              if (!kegiatan || !kegiatan.length) return s;

              const metaObj = isObj(s?.meta) ? s.meta : {};
              if (Array.isArray(metaObj?.kegiatan) && metaObj.kegiatan.length)
                return s;

              const meta2 = { ...metaObj, kegiatan };
              const intervensi = extractIntervensiFromMeta(meta2);

              const rehabFinal = Math.max(
                Number(s?.rehabRuangKelas || 0),
                Number(intervensi?.rehab_unit || 0)
              );
              const bangunFinal = Math.max(
                Number(s?.pembangunanRKB || 0),
                Number(intervensi?.pembangunan_unit || 0)
              );

              changed = true;
              return {
                ...s,
                meta: meta2,
                rehabRuangKelas: rehabFinal,
                pembangunanRKB: bangunFinal,
              };
            });

            return changed ? out : prev;
          });
        });
      } catch {
        /* ignore */
      }
    });

    return () => {
      alive = false;
    };
  }, [schoolData, getKegiatanMap]);

  // ✅ TABEL harus default (tidak ikut filter eksternal)
  const tableData = useMemo(() => deferredHydrated, [deferredHydrated]);

  // ✅ FILTER hanya untuk MAP + CHART (client-side, cepat, tanpa refetch)
  const filteredForVisuals = useMemo(() => {
    let rows = Array.isArray(deferredHydrated) ? deferredHydrated : [];

    const levelValue =
      filterJenjang && filterJenjang !== "Semua Jenjang" ? filterJenjang : null;
    const kecamatanValue =
      filterKecamatan && filterKecamatan !== "Semua Kecamatan"
        ? filterKecamatan
        : null;
    const villageValue =
      filterDesa && filterDesa !== "Semua Desa" ? filterDesa : null;

    if (levelValue) {
      const j = String(levelValue).toUpperCase();
      rows = rows.filter((r) => String(r?.jenjang || "").toUpperCase() === j);
    }
    if (kecamatanValue) {
      const key = norm(kecamatanValue).toUpperCase();
      rows = rows.filter(
        (r) => norm(r?.kecamatan).toUpperCase() === key
      );
    }
    if (villageValue) {
      const key = norm(villageValue).toUpperCase();
      rows = rows.filter((r) => norm(r?.desa).toUpperCase() === key);
    }

    if (kondisiFilter && kondisiFilter !== "Semua Kondisi") {
      rows = rows.filter((r) => {
        const baik = Number(r?.kondisiKelas?.baik || 0);
        const sedang = Number(r?.kondisiKelas?.rusakSedang || 0);
        const berat = Number(r?.kondisiKelas?.rusakBerat || 0);
        const total = baik + sedang + berat;

        if (kondisiFilter === "Baik") return baik > 0;
        if (kondisiFilter === "Rusak Sedang") return sedang > 0;
        if (kondisiFilter === "Rusak Berat") return berat > 0;
        if (kondisiFilter === "Baik Semua") return total > 0 && sedang === 0 && berat === 0;
        if (kondisiFilter === "Rusak") return sedang > 0 || berat > 0;
        if (kondisiFilter === "Kurang") return Number(r?.kurangRKB || 0) > 0;
        return true;
      });
    }

    return rows;
  }, [deferredHydrated, filterJenjang, filterKecamatan, filterDesa, kondisiFilter]);

  // tahan agar render map/chart tetap halus saat filter berubah
  const filteredData = filteredForVisuals;

  // Data untuk map (hanya yang punya koordinat valid)
  const mapData = useMemo(() => {
    return filteredData.filter(
      (s) =>
        Array.isArray(s.coordinates) &&
        s.coordinates.length === 2 &&
        !Number.isNaN(+s.coordinates[0]) &&
        !Number.isNaN(+s.coordinates[1])
    );
  }, [filteredData]);
  const deferredMapData = mapData;

  // memoized prop object untuk SimpleMap
  const statsOverride = useMemo(
    () => ({
      kecamatanCount: kecamatanList.length,
      sekolahCount: deferredMapData.length,
    }),
    [kecamatanList.length, deferredMapData.length]
  );

  // Hitung data chart dari filteredData (sudah deferred)
  const { chartData } = useMemo(() => {
    let unitBaik = 0,
      unitRusakSedang = 0,
      unitRusakBerat = 0;
    let totalKurangRKB = 0;

    let rehabSekolahCount = 0;
    let pembangunanSekolahCount = 0;

    filteredData.forEach((school) => {
      unitBaik += Number(school?.kondisiKelas?.baik || 0);
      unitRusakSedang += Number(school?.kondisiKelas?.rusakSedang || 0);
      unitRusakBerat += Number(school?.kondisiKelas?.rusakBerat || 0);
      totalKurangRKB += Number(school?.kurangRKB || 0);

      rehabSekolahCount += Number(school?.rehabRuangKelas || 0);
      pembangunanSekolahCount += Number(school?.pembangunanRKB || 0);
    });

    const totalUnitKelas = unitBaik + unitRusakSedang + unitRusakBerat;
    const belumDirehab = Math.max(0, unitRusakBerat - rehabSekolahCount);
    const belumDibangun = Math.max(0, totalKurangRKB - pembangunanSekolahCount);
    const totalIntervensi = rehabSekolahCount + pembangunanSekolahCount;

    return {
      chartData: {
        pieDataList: [
          {
            title: "Kondisi Ruang Kelas",
            data: [
              { name: "Baik", value: unitBaik, color: "#16A34A" },
              { name: "Rusak Sedang", value: unitRusakSedang, color: "#F59E0B" },
              { name: "Rusak Berat", value: unitRusakBerat, color: "#DC2626" },
            ],
          },
          {
            title: "Rehabilitasi Ruang Kelas",
            data: [
              { name: "Rehab", value: rehabSekolahCount, color: "#0EA5E9" },
              { name: "Belum Rehab", value: belumDirehab, color: "#F59E0B" },
            ],
          },
          {
            title: "Intervensi Ruang Kelas",
            data: [
              {
                name: "Pembangunan dilakukan",
                value: pembangunanSekolahCount,
                color: "#8b5cf6",
              },
              { name: "Kebutuhan RKB", value: belumDibangun, color: "#F2B705" },
            ],
          },
        ],
        barKondisiKelas: [
          { name: "Total Kelas", value: totalUnitKelas },
          { name: "Kondisi baik", value: unitBaik },
          { name: "Rusak Sedang", value: unitRusakSedang },
          { name: "Rusak Berat", value: unitRusakBerat },
          { name: "Kurang RKB", value: totalKurangRKB },
        ],
        barIntervensiKelas: [
          { name: "Total Intervensi", value: totalIntervensi },
          { name: "Pembangunan RKB", value: pembangunanSekolahCount },
          { name: "Rehab Ruang Kelas", value: rehabSekolahCount },
        ],
      },
    };
  }, [filteredData]);

  const handleResetAllFilters = useCallback(() => {
    setFilterJenjang("Semua Jenjang");
    setFilterKecamatan("Semua Kecamatan");
    setFilterDesa("Semua Desa");
    setKondisiFilter("Semua Kondisi");
  }, []);

  // DETAIL VIEW
  useEffect(() => {
    const run = async () => {
      if (currentView !== "detail" || !selectedSchool) return;
      setDetailError(null);

      const jenjang = String(
        selectedSchool?.jenjang || selectedSchool?.level || ""
      ).toUpperCase();
      const cacheKey = `${jenjang}:${selectedSchool?.npsn || selectedSchool?.id}`;
      if (detailCache.current.has(cacheKey)) {
        setSelectedDetail(detailCache.current.get(cacheKey));
        return;
      }

      setDetailLoading(true);
      try {
        let detail;
        const npsn = selectedSchool.npsn;

        if (jenjang === "SD") detail = await _fetchDetailSafeByNpsn(npsn);
        else if (jenjang === "SMP") detail = await _fetchDetailSafeByNpsn(npsn);
        else if (jenjang === "PAUD") detail = await _fetchDetailSafeByNpsn(npsn);
        else if (jenjang === "PKBM") detail = await _fetchDetailSafeByNpsn(npsn);
        else detail = await fetchSchoolDetail(selectedSchool.id);

        if (!detail) throw new Error("Detail sekolah tidak ditemukan.");

        const hydratedBasic =
          deferredHydrated.find((h) => h.id === selectedSchool.id) ||
          selectedSchool;

        const mergedForDetail = {
          ...hydratedBasic,
          ...detail,
          kecamatan: detail?.kecamatan || hydratedBasic?.kecamatan,
          desa: detail?.village || detail?.desa || hydratedBasic?.desa,
          name: detail?.name || hydratedBasic?.name,
          namaSekolah: detail?.name || hydratedBasic?.namaSekolah,
          npsn: detail?.npsn || hydratedBasic?.npsn,
        };

        detailCache.current.set(cacheKey, mergedForDetail);
        setSelectedDetail(mergedForDetail);
      } catch (e) {
        console.error("[SchoolDetailPage] fetch detail error:", e);
        setDetailError(e?.message || String(e));
      } finally {
        setDetailLoading(false);
      }
    };
    run();
  }, [currentView, selectedSchool, deferredHydrated, fetchSchoolDetail]);

  // sinkron jenjang dari URL (jika ada)
  useEffect(() => {
    const qJenjang = qp("jenjang");
    if (qJenjang && qJenjang !== filterJenjang) setFilterJenjang(qJenjang);
  }, [filterJenjang]);

  // auto view detail kalau ada ?npsn= di URL
  useEffect(() => {
    const qNpsn = qp("npsn");
    if (!qNpsn || !deferredHydrated.length) return;
    const target = deferredHydrated.find(
      (s) => String(s.npsn) === String(qNpsn)
    );
    if (target) {
      setSelectedSchool(target);
      setCurrentView("detail");
    }
  }, [deferredHydrated, filterJenjang, filterKecamatan, filterDesa]);

  // RENDER
  if (error) return <div className={styles.error}>⚠️ {error}</div>;

  const renderDetailView = () => {
    if (detailLoading)
      return <div className={styles.loading}>Memuat detail…</div>;
    if (detailError) {
      return (
        <div className={styles.error}>
          <div>⚠️ {detailError}</div>
          <div style={{ marginTop: 8 }}>
            <button
              className={styles.resetTableButton}
              onClick={() =>
                detailCache.current.delete(selectedSchool?.id) ||
                setSelectedDetail(null)
              }
            >
              🔁 Coba Lagi
            </button>
          </div>
        </div>
      );
    }
    const detailObj = selectedDetail;
    if (!detailObj) return null;

    let DetailComponent;
    switch (detailObj.jenjang) {
      case "PAUD":
        DetailComponent = SchoolDetailPaud;
        break;
      case "SD":
        DetailComponent = SchoolDetailSd;
        break;
      case "SMP":
        DetailComponent = SchoolDetailSmp;
        break;
      case "PKBM":
        DetailComponent = SchoolDetailPkbm;
        break;
      default:
        return (
          <div className={styles.error}>
            Detail tidak tersedia untuk jenjang ini.
          </div>
        );
    }
    return <DetailComponent schoolData={detailObj} />;
  };

  const renderMainView = () => {
    const hasAnyData = filteredData.length > 0;
    const hasAnyMap = deferredMapData.length > 0;

    return (
      <div className={styles.dashboard}>
        {/* ✅ (3) loading tidak full-screen; hanya info ringan */}
        {loading && !hasAnyData ? (
          <div className={styles.loading}>Memuat data…</div>
        ) : null}

        <header className={styles.dashboardHeader}>
          <h1>Detail Peta Sekolah</h1>

          {/* ✅ tampilkan statistik hanya kalau data sudah ada (lebih rapi & tidak “0 semua”) */}
          {!loading && (
            <div
              style={{
                fontSize: "14px",
                color: "#666",
                marginTop: "8px",
              }}
            >
              Total: {deferredHydrated.length} sekolah • Filtered:{" "}
              {filteredData.length} sekolah • Map: {deferredMapData.length} sekolah
            </div>
          )}
        </header>

        <section className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h2>🗺️ Peta Sebaran Sekolah</h2>
            <FilterBar
              filterJenjang={filterJenjang}
              setFilterJenjang={setFilterJenjang}
              filterKecamatan={filterKecamatan}
              setFilterKecamatan={setFilterKecamatan}
              filterDesa={filterDesa}
              setFilterDesa={setFilterDesa}
              kondisiFilter={kondisiFilter}
              setKondisiFilter={setKondisiFilter}
              handleResetAllFilters={handleResetAllFilters}
              kecamatanList={kecamatanList}
              desaList={desaList}
            />
          </div>

          <div className={styles.chartContent}>
            <div
              className={styles.mapWrapper}
              style={{
                position: "relative",
                // ✅ (2) tinggi peta responsif (desktop & mobile)
                height: "clamp(360px, 55vh, 520px)",
              }}
            >
              <ErrorBoundary>
                {/* ✅ (3) map tidak dirender kalau belum ada data koordinat (lebih ringan) */}
                {hasAnyMap ? (
                  renderHeavyUI ? (
                    <SimpleMap
                      schools={deferredMapData}
                      geoData={geoData}
                      initialCenter={mapView.center}
                      initialZoom={mapView.zoom}
                      statsOverride={statsOverride}
                      filters={mapFilters}
                      hasFullFilter={hasFullFilter}
                    />
                  ) : (
                    <div className={styles.chartEmpty}>
                      <img
                        className={styles.chartEmptyIcon}
                        alt=""
                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E"
                      />
                      Menyiapkan peta…
                    </div>
                  )
                ) : (
                  <div className={styles.chartEmpty}>
                    <img
                      className={styles.chartEmptyIcon}
                      alt=""
                      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E"
                    />
                    {loading ? "Memuat peta…" : "Tidak ada data peta"}
                  </div>
                )}
              </ErrorBoundary>
            </div>
          </div>
        </section>

        {/* ✅ (3) chart berat hanya dirender jika ada data */}
        {hasAnyData ? (
          renderHeavyUI ? (
            <>
              <section className={styles.chartsContainer}>
                {chartData.pieDataList.map((pie, idx) => (
                  <ErrorBoundary key={idx}>
                    <div className={styles.chartCard}>
                      <PieChartComponent title={pie.title} data={pie.data} />
                    </div>
                  </ErrorBoundary>
                ))}
              </section>

              <section className={styles.chartsContainer}>
                <ErrorBoundary>
                  <div className={styles.chartCard}>
                    <BarChartComponent
                      title="Statistik Kondisi Ruang Kelas"
                      data={chartData.barKondisiKelas}
                      colors={[
                        "#3b82f6",
                        "#16A34A",
                        "#F59E0B",
                        "#DC2626",
                        "#8b5cf6",
                      ]}
                    />
                  </div>
                </ErrorBoundary>
                <ErrorBoundary>
                  <div className={styles.chartCard}>
                    <BarChartComponent
                      title="Statistik Intervensi Ruang Kelas"
                      data={chartData.barIntervensiKelas}
                      colors={["#0EA5E9", "#F2B705", "#8b5cf6"]}
                    />
                  </div>
                </ErrorBoundary>
              </section>
            </>
          ) : (
            <div className={styles.loading}>Menyiapkan grafik…</div>
          )
        ) : null}

        <section className={styles.chartContainer}>
          <div className={styles.chartHeader}>
            <h2>📊 Data Detail Sekolah</h2>
          </div>
          <div className={styles.chartContent}>
            <ErrorBoundary>
              <DataTable
                data={tableData}
                onDetailClick={handleDetailClick}
                onDetailPrefetch={handlePrefetchDetail}
              />
            </ErrorBoundary>
          </div>
        </section>
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <div data-hide-chrome={hideChrome ? "true" : "false"}>
        {currentView === "main" && renderMainView()}
        {currentView === "detail" && renderDetailView()}
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(SchoolDetailPage);
