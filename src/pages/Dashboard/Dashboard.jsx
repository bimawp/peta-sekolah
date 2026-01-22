// src/pages/Dashboard/Dashboard.jsx
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";
import styles from "./Dashboard.module.css";
import useDashboardData from "../../hooks/useDashboardQuery";
import ErrorMessage from "../../components/common/ErrorMessage/ErrorMessage";

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const JENJANGS = ["PAUD", "SD", "SMP", "PKBM"];

const TOOLTIP_CONTENT_STYLE = {
  backgroundColor: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: "8px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
};

const getJenjangOfSchool = (s, schoolTypesMap) => {
  const code = schoolTypesMap?.[String(s?.school_type_id)];
  if (code) return code;

  const guess = String(s?.jenjang || s?.level || "").toUpperCase();
  if (JENJANGS.includes(guess)) return guess;

  return "UNKNOWN";
};

const readClassCond = (cc) => {
  const o = cc && typeof cc === "object" ? cc : {};

  const baik = toNum(o.classrooms_good) || toNum(o.good) || 0;

  const sedang =
    toNum(o.classrooms_moderate_damage) ||
    toNum(o.moderate_damage) ||
    toNum(o.moderate) ||
    0;

  const berat =
    toNum(o.classrooms_heavy_damage) ||
    toNum(o.heavy_damage) ||
    toNum(o.heavy) ||
    0;

  const kurang = toNum(o.lacking_rkb) || toNum(o.kurang_rkb) || 0;

  return { baik, sedang, berat, kurang };
};

const getTipeDisplayName = (tipe) =>
  tipe === "berat"
    ? "Rusak Berat"
    : tipe === "sedang"
    ? "Rusak Sedang"
    : tipe === "kurangRkb"
    ? "Kurang RKB"
    : tipe;

const getFieldByTipe = (tipe) => {
  if (tipe === "sedang") return "sedang";
  if (tipe === "kurangRkb") return "kurangRkb";
  return "berat";
};

// === Custom label (stabil, tidak dibuat ulang tiap render)
const CustomLabel = React.memo(function CustomLabel(props) {
  const { x, y, width, height, value } = props;
  if (!value || Number.isNaN(value)) return null;

  return (
    <text
      x={x + width + 12}
      y={y + height / 2}
      fill="#374151"
      fontSize="11"
      fontWeight="600"
      textAnchor="start"
      dominantBaseline="middle"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))" }}
    >
      {Number(value).toLocaleString()}
    </text>
  );
});

const CustomBar = React.memo(function CustomBar({ fill, dataKey, ...props }) {
  return (
    <Bar
      {...props}
      dataKey={dataKey}
      fill={fill}
      radius={[0, 4, 4, 0]}
      minPointSize={20}
    >
      <LabelList content={CustomLabel} />
    </Bar>
  );
});

const SummaryCards = React.memo(function SummaryCards({ summary }) {
  return (
    <div className={styles.summaryCardsContainer}>
      <div className={styles.summaryCards}>
        <div className={styles.summaryCard}>
          <div className={styles.title}>TOTAL PAUD</div>
          <div className={styles.value}>{summary.totalPaud?.toLocaleString?.() ?? 0}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.title}>TOTAL SD</div>
          <div className={styles.value}>{summary.totalSd?.toLocaleString?.() ?? 0}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.title}>TOTAL SMP</div>
          <div className={styles.value}>{summary.totalSmp?.toLocaleString?.() ?? 0}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.title}>TOTAL PKBM</div>
          <div className={styles.value}>{summary.totalPkbm?.toLocaleString?.() ?? 0}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.title}>TENAGA PENDIDIK</div>
          <div className={styles.value}>
            {(summary.totalTenagaPendidik || summary.totaltenagapendidik || 0).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
});

const ConditionChartCard = React.memo(function ConditionChartCard({
  chartWidth,
  rcKey,
  isMobile,
  conditionChartData,
}) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>Kondisi Sekolah berdasarkan Ruang Kelas:</h3>
      </div>
      <div className={styles.chartContent}>
        <ResponsiveContainer width={chartWidth || "100%"} height={350} key={`rc-a-${rcKey}`}>
          <BarChart
            data={conditionChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            isAnimationActive={!isMobile}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="jenjang" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Total Kelas" fill="#94A3B8" name="Total Kelas" isAnimationActive={!isMobile} />
            <Bar dataKey="Kondisi Baik" fill="#1E7F4F" name="Kondisi Baik" isAnimationActive={!isMobile} />
            <Bar dataKey="Rusak Sedang" fill="#F59E0B" name="Rusak Sedang" isAnimationActive={!isMobile} />
            <Bar dataKey="Rusak Berat" fill="#DC2626" name="Rusak Berat" isAnimationActive={!isMobile} />
            <Bar dataKey="Kurang RKB" fill="#0EA5E9" name="Kurang RKB" isAnimationActive={!isMobile} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

const IntervensiChartCard = React.memo(function IntervensiChartCard({
  chartWidth,
  rcKey,
  isMobile,
  intervensiChartData,
}) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>Intervensi Ruang Kelas Berdasarkan Kategori Sekolah</h3>
      </div>
      <div className={styles.chartContent}>
        <ResponsiveContainer width={chartWidth || "100%"} height={350} key={`rc-b-${rcKey}`}>
          <BarChart
            data={intervensiChartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            isAnimationActive={!isMobile}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="jenjang" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Rehabilitasi Ruang Kelas" fill="#56B789" isAnimationActive={!isMobile} />
            <Bar dataKey="Pembangunan RKB" fill="#F2B705" isAnimationActive={!isMobile} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

const Dashboard = () => {
  const { data, loading, error } = useDashboardData();

  // === Mobile detection
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined"
      ? window.matchMedia?.("(max-width: 768px)")?.matches ?? false
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mq = window.matchMedia("(max-width: 768px)");
    const onChange = (e) => setIsMobile(!!e.matches);

    mq.addEventListener?.("change", onChange);
    mq.addListener?.(onChange);

    return () => {
      mq.removeEventListener?.("change", onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  // === Measure chart container width (pakai callback ref agar tahan HMR)
  const [rcKey, setRcKey] = useState(0);
  const [chartWrapEl, setChartWrapEl] = useState(null);
  const [chartWidth, setChartWidth] = useState(null);
  const lastWidthRef = useRef(null);

  useEffect(() => {
    const el = chartWrapEl;
    if (!el) return;

    let raf = 0;

    const measure = () => {
      if (!el || !el.isConnected) return;
      const w = el.clientWidth || 360;

      if (lastWidthRef.current === w) return;
      lastWidthRef.current = w;

      setChartWidth(w);
      setRcKey((k) => k + 1);
    };

    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    if (typeof ResizeObserver === "undefined") {
      run();
      return () => cancelAnimationFrame(raf);
    }

    const ro = new ResizeObserver(run);
    ro.observe(el);
    run();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [chartWrapEl]);

  // === Layout dinamis
  const hLayout = useMemo(() => {
    const w = chartWidth || 360;
    const yAxisWidth = Math.min(180, Math.max(70, Math.floor(w * (isMobile ? 0.34 : 0.44))));
    const left = isMobile ? 6 : 60;
    const right = isMobile ? 24 : 100;
    const barSize = isMobile ? 16 : 24;
    const tickFont = isMobile ? 10 : 11;
    return { yAxisWidth, left, right, barSize, tickFont };
  }, [chartWidth, isMobile]);

  // === Filters
  const [kecamatanFilters, setKecamatanFilters] = useState({
    tipe: "berat", // berat | sedang | kurangRkb
    jumlah: 5,
    urutan: "teratas",
  });

  const [desaFilters, setDesaFilters] = useState({
    jenjang: "Semua Jenjang",
    kecamatan: "Semua Kecamatan",
    tipe: "berat",
    jumlah: 20,
    urutan: "teratas",
  });

  // === Handlers (stabil, tidak membuat fungsi baru di tiap render)
  const onKecTipeChange = useCallback((e) => {
    const v = e.target.value;
    setKecamatanFilters((prev) => (prev.tipe === v ? prev : { ...prev, tipe: v }));
  }, []);

  const onKecUrutanChange = useCallback((e) => {
    const v = e.target.value;
    setKecamatanFilters((prev) => (prev.urutan === v ? prev : { ...prev, urutan: v }));
  }, []);

  const onDesaJenjangChange = useCallback((e) => {
    const v = e.target.value;
    setDesaFilters((prev) => (prev.jenjang === v ? prev : { ...prev, jenjang: v }));
  }, []);

  const onDesaKecamatanChange = useCallback((e) => {
    const v = e.target.value;
    setDesaFilters((prev) => (prev.kecamatan === v ? prev : { ...prev, kecamatan: v }));
  }, []);

  const onDesaTipeChange = useCallback((e) => {
    const v = e.target.value;
    setDesaFilters((prev) => (prev.tipe === v ? prev : { ...prev, tipe: v }));
  }, []);

  const onDesaJumlahChange = useCallback((e) => {
    const raw = parseInt(e.target.value, 10);
    const next = Number.isFinite(raw) ? raw : 20;
    setDesaFilters((prev) => (prev.jumlah === next ? prev : { ...prev, jumlah: next }));
  }, []);

  const onDesaUrutanChange = useCallback((e) => {
    const v = e.target.value;
    setDesaFilters((prev) => (prev.urutan === v ? prev : { ...prev, urutan: v }));
  }, []);

  /**
   * ============================================================
   * Derivasi data dari Supabase
   * - Optimasi utama: normalisasi schools + parsing class_condition sekali saja
   * ============================================================
   */
  const {
    summary,
    conditionData,
    intervensiData,
    allKecamatan,
    normalizedSchools,
  } = useMemo(() => {
    if (loading || error || !data) {
      return {
        summary: {},
        conditionData: null,
        intervensiData: null,
        allKecamatan: [],
        normalizedSchools: [],
      };
    }

    const schoolTypesMap = data.schoolTypesMap || {};
    const schoolsRaw = Array.isArray(data.schools) ? data.schools : [];

    // --- Normalisasi schools untuk pemakaian lintas grafik/filter (1x loop) ---
    const normalized = new Array(schoolsRaw.length);
    const kecSet = new Set();

    // untuk fallback total jenjang
    const jenjangCount = { PAUD: 0, SD: 0, SMP: 0, PKBM: 0 };

    // untuk fallback conditionData bila kondisiSummary kosong
    const condFallback = {
      PAUD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      SD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      SMP: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      PKBM: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
    };

    for (let i = 0; i < schoolsRaw.length; i++) {
      const sc = schoolsRaw[i];

      const jenjang = getJenjangOfSchool(sc, schoolTypesMap);
      if (jenjangCount[jenjang] != null) jenjangCount[jenjang] += 1;

      const kec = (sc.kecamatan_name || sc.kecamatan || "").toString().trim();
      if (kec) kecSet.add(kec);

      const desa = (sc.village_name || sc.village || "").toString().trim();

      const { baik, sedang, berat, kurang } = readClassCond(sc.class_condition);

      normalized[i] = {
        jenjang,
        kecamatan: kec,
        desa,
        baik,
        sedang,
        berat,
        kurangRkb: kurang,
      };

      if (condFallback[jenjang]) {
        condFallback[jenjang].baik += baik;
        condFallback[jenjang].sedang += sedang;
        condFallback[jenjang].berat += berat;
        condFallback[jenjang].kurangRkb += kurang;
        condFallback[jenjang].total += baik + sedang + berat;
      }
    }

    // --- SUMMARY ---
    const s = data.stats || {};
    const summaryFromStats = {
      totalPaud: toNum(s.total_paud ?? s.totalPaud ?? s.paud ?? 0),
      totalSd: toNum(s.total_sd ?? s.totalSd ?? s.sd ?? 0),
      totalSmp: toNum(s.total_smp ?? s.totalSmp ?? s.smp ?? 0),
      totalPkbm: toNum(s.total_pkbm ?? s.totalPkbm ?? s.pkbm ?? 0),
      totalTenagaPendidik: toNum(s.total_teachers ?? s.totalTenagaPendidik ?? s.teachers ?? 0),
    };

    const needFallbackTotals =
      !summaryFromStats.totalPaud &&
      !summaryFromStats.totalSd &&
      !summaryFromStats.totalSmp &&
      !summaryFromStats.totalPkbm;

    if (needFallbackTotals && schoolsRaw.length) {
      summaryFromStats.totalPaud = jenjangCount.PAUD;
      summaryFromStats.totalSd = jenjangCount.SD;
      summaryFromStats.totalSmp = jenjangCount.SMP;
      summaryFromStats.totalPkbm = jenjangCount.PKBM;
    }

    // --- CONDITION DATA ---
    const kondisi = Array.isArray(data.kondisiSummary) ? data.kondisiSummary : [];

    let conditionData = {
      PAUD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      SD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      SMP: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      PKBM: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
    };

    if (kondisi.length > 0) {
      for (let i = 0; i < kondisi.length; i++) {
        const r = kondisi[i];
        const j = String(r.jenjang || r.level || r.code || "").toUpperCase();
        if (!conditionData[j]) continue;

        const baik = toNum(r.baik ?? r.good ?? r.classrooms_good ?? 0);
        const sedang = toNum(
          r.sedang ??
            r.moderate ??
            r.moderate_damage ??
            r.classrooms_moderate_damage ??
            0
        );
        const berat = toNum(
          r.berat ?? r.heavy ?? r.heavy_damage ?? r.classrooms_heavy_damage ?? 0
        );
        const kurang = toNum(r.kurang_rkb ?? r.kurangRkb ?? r.lacking_rkb ?? 0);

        conditionData[j] = {
          total: baik + sedang + berat,
          baik,
          sedang,
          berat,
          kurangRkb: kurang,
        };
      }
    } else if (schoolsRaw.length) {
      // gunakan agregasi fallback yang sudah dihitung saat normalisasi
      conditionData = condFallback;
    }

    // --- INTERVENSI DATA ---
    const keg = Array.isArray(data.kegiatanSummary) ? data.kegiatanSummary : [];
    const baseInt = {
      PAUD: { rehab: 0, pembangunan: 0 },
      SD: { rehab: 0, pembangunan: 0 },
      SMP: { rehab: 0, pembangunan: 0 },
      PKBM: { rehab: 0, pembangunan: 0 },
    };
    const intervensiData = { ...baseInt };

    if (
      keg.length > 0 &&
      ("pembangunan_rkb" in (keg[0] || {}) || "rehabilitasi_ruang_kelas" in (keg[0] || {}))
    ) {
      // pivot format
      for (let i = 0; i < keg.length; i++) {
        const r = keg[i];
        const j = String(r.jenjang || "").toUpperCase();
        if (!intervensiData[j]) continue;
        intervensiData[j].pembangunan += toNum(r.pembangunan_rkb ?? 0);
        intervensiData[j].rehab += toNum(r.rehabilitasi_ruang_kelas ?? 0);
      }
    } else if (keg.length > 0) {
      // long format
      for (let i = 0; i < keg.length; i++) {
        const r = keg[i];
        const j = String(r.jenjang || "").toUpperCase();
        if (!intervensiData[j]) continue;
        const nm = String(r.kegiatan || "").toLowerCase();
        const total = toNum(r.total_lokal ?? r.total ?? r.lokal ?? 0);
        if (nm.includes("rehab") || nm.includes("rehabil")) intervensiData[j].rehab += total;
        if (nm.includes("pembangunan")) intervensiData[j].pembangunan += total;
      }
    }

    // --- ALL KECAMATAN ---
    let allKecamatan = Array.isArray(data.allKecamatan) ? data.allKecamatan : [];
    if (!allKecamatan.length && kecSet.size) {
      allKecamatan = Array.from(kecSet).sort((a, b) => a.localeCompare(b, "id"));
    } else {
      allKecamatan = allKecamatan.slice().sort((a, b) => a.localeCompare(b, "id"));
    }

    return {
      summary: summaryFromStats,
      conditionData,
      intervensiData,
      allKecamatan,
      normalizedSchools: normalized,
    };
  }, [data, loading, error]);

  // === Data untuk chart kondisi
  const conditionChartData = useMemo(() => {
    if (!conditionData) return [];
    return [
      {
        jenjang: "PAUD",
        "Total Kelas": conditionData.PAUD.total,
        "Kondisi Baik": conditionData.PAUD.baik,
        "Rusak Sedang": conditionData.PAUD.sedang,
        "Rusak Berat": conditionData.PAUD.berat,
        "Kurang RKB": conditionData.PAUD.kurangRkb,
      },
      {
        jenjang: "SD",
        "Total Kelas": conditionData.SD.total,
        "Kondisi Baik": conditionData.SD.baik,
        "Rusak Sedang": conditionData.SD.sedang,
        "Rusak Berat": conditionData.SD.berat,
        "Kurang RKB": conditionData.SD.kurangRkb,
      },
      {
        jenjang: "SMP",
        "Total Kelas": conditionData.SMP.total,
        "Kondisi Baik": conditionData.SMP.baik,
        "Rusak Sedang": conditionData.SMP.sedang,
        "Rusak Berat": conditionData.SMP.berat,
        "Kurang RKB": conditionData.SMP.kurangRkb,
      },
      {
        jenjang: "PKBM",
        "Total Kelas": conditionData.PKBM.total,
        "Kondisi Baik": conditionData.PKBM.baik,
        "Rusak Sedang": conditionData.PKBM.sedang,
        "Rusak Berat": conditionData.PKBM.berat,
        "Kurang RKB": conditionData.PKBM.kurangRkb,
      },
    ];
  }, [conditionData]);

  // === Data untuk chart intervensi
  const intervensiChartData = useMemo(() => {
    if (!intervensiData) return [];
    return [
      {
        jenjang: "PAUD",
        "Rehabilitasi Ruang Kelas": intervensiData.PAUD.rehab,
        "Pembangunan RKB": intervensiData.PAUD.pembangunan,
      },
      {
        jenjang: "SD",
        "Rehabilitasi Ruang Kelas": intervensiData.SD.rehab,
        "Pembangunan RKB": intervensiData.SD.pembangunan,
      },
      {
        jenjang: "SMP",
        "Rehabilitasi Ruang Kelas": intervensiData.SMP.rehab,
        "Pembangunan RKB": intervensiData.SMP.pembangunan,
      },
      {
        jenjang: "PKBM",
        "Rehabilitasi Ruang Kelas": intervensiData.PKBM.rehab,
        "Pembangunan RKB": intervensiData.PKBM.pembangunan,
      },
    ];
  }, [intervensiData]);

  // === Formatter yang stabil (hindari fungsi baru di tiap render untuk Recharts)
  const topTooltipFormatter = useCallback((v, n) => [v?.toLocaleString?.() || 0, n], []);
  const topLabelFormatter = useCallback((l) => `Kecamatan: ${l}`, []);
  const yTickFormatter = useCallback(
    (v) => (isMobile && v.length > 25 ? `${v.slice(0, 22)}...` : v),
    [isMobile]
  );

  // === Top Kecamatan (dari normalizedSchools)
  const topKecamatanData = useMemo(() => {
    if (loading || error || !normalizedSchools?.length) return [];

    const field = getFieldByTipe(kecamatanFilters.tipe);
    const byJenjang = {
      PAUD: new Map(),
      SD: new Map(),
      SMP: new Map(),
      PKBM: new Map(),
    };

    for (let i = 0; i < normalizedSchools.length; i++) {
      const r = normalizedSchools[i];
      const map = byJenjang[r.jenjang];
      if (!map) continue;

      const kec = r.kecamatan;
      if (!kec) continue;

      const v = toNum(r[field]);
      if (v <= 0) continue;

      map.set(kec, (map.get(kec) || 0) + v);
    }

    const takeTop = (map, jenjang) => {
      const arr = [];
      map.forEach((value, kecamatanName) => {
        arr.push({ kecamatanName, value });
      });

      arr.sort((a, b) =>
        kecamatanFilters.urutan === "teratas" ? b.value - a.value : a.value - b.value
      );

      return arr.slice(0, 5).map((it) => ({
        name: `${it.kecamatanName} (${jenjang})`,
        PAUD: jenjang === "PAUD" ? it.value : 0,
        SD: jenjang === "SD" ? it.value : 0,
        SMP: jenjang === "SMP" ? it.value : 0,
        PKBM: jenjang === "PKBM" ? it.value : 0,
        sortValue: it.value,
        jenjang,
        kecamatan: it.kecamatanName,
      }));
    };

    return [
      ...takeTop(byJenjang.PAUD, "PAUD"),
      ...takeTop(byJenjang.SD, "SD"),
      ...takeTop(byJenjang.SMP, "SMP"),
      ...takeTop(byJenjang.PKBM, "PKBM"),
    ];
  }, [normalizedSchools, loading, error, kecamatanFilters.tipe, kecamatanFilters.urutan]);

  // === Top Desa (dari normalizedSchools)
  const topDesaData = useMemo(() => {
    if (loading || error || !normalizedSchools?.length) return [];

    const field = getFieldByTipe(desaFilters.tipe);
    const agg = new Map(); // key -> {name,kecamatan,displayName,value}

    for (let i = 0; i < normalizedSchools.length; i++) {
      const r = normalizedSchools[i];

      if (desaFilters.jenjang !== "Semua Jenjang" && desaFilters.jenjang !== r.jenjang) continue;

      const kec = r.kecamatan;
      if (desaFilters.kecamatan !== "Semua Kecamatan" && desaFilters.kecamatan !== kec) continue;

      const desa = r.desa;
      if (!desa || !kec) continue;

      const v = toNum(r[field]);
      if (v <= 0) continue;

      const key = `${desa} (${kec})`;
      const prev = agg.get(key);
      if (prev) {
        prev.value += v;
      } else {
        agg.set(key, { name: desa, kecamatan: kec, displayName: key, value: v });
      }
    }

    const arr = Array.from(agg.values());
    arr.sort((a, b) =>
      desaFilters.urutan === "teratas" ? b.value - a.value : a.value - b.value
    );

    return arr.slice(0, desaFilters.jumlah);
  }, [
    normalizedSchools,
    loading,
    error,
    desaFilters.jenjang,
    desaFilters.kecamatan,
    desaFilters.tipe,
    desaFilters.jumlah,
    desaFilters.urutan,
  ]);

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}>
        <h1>Dashboard Pendidikan</h1>
      </div>

      <SummaryCards summary={summary} />

      <div className={styles.chartsContainer}>
        <ConditionChartCard
          chartWidth={chartWidth}
          rcKey={rcKey}
          isMobile={isMobile}
          conditionChartData={conditionChartData}
        />
        <IntervensiChartCard
          chartWidth={chartWidth}
          rcKey={rcKey}
          isMobile={isMobile}
          intervensiChartData={intervensiChartData}
        />
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>
            Top 5 Kecamatan dengan Ruang Kelas {getTipeDisplayName(kecamatanFilters.tipe)} Terbanyak per Jenjang
          </h2>

          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Tampilkan Grafik:</label>
              <select value={kecamatanFilters.tipe} onChange={onKecTipeChange}>
                <option value="berat">Rusak Berat</option>
                <option value="sedang">Rusak Sedang</option>
                <option value="kurangRkb">Kurang RKB</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select value={kecamatanFilters.urutan} onChange={onKecUrutanChange}>
                <option value="teratas">Teratas</option>
                <option value="terbawah">Terbawah</option>
              </select>
            </div>

            <div className={styles.info}>
              <span>Menampilkan 5 kecamatan teratas per jenjang (Total: 20 data)</span>
            </div>
          </div>
        </div>

        <div className={styles.chartOverflow} ref={setChartWrapEl}>
          <ResponsiveContainer
            key={`rc-c-${rcKey}`}
            width={chartWidth || "100%"}
            height={Math.max(600, topKecamatanData.length * 35)}
          >
            <BarChart
              className="horizontal-bar-chart"
              data={topKecamatanData}
              layout="vertical"
              margin={{ top: 18, right: hLayout.right, left: hLayout.left, bottom: 18 }}
              barSize={hLayout.barSize}
              barGap={4}
              isAnimationActive={!isMobile}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: hLayout.tickFont, fill: "#6B7280" }}
                domain={[0, "dataMax + 10"]}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={hLayout.yAxisWidth}
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: "#374151",
                  textAnchor: "end",
                  dominantBaseline: "middle",
                }}
                tickFormatter={yTickFormatter}
              />
              <Tooltip
                formatter={topTooltipFormatter}
                labelFormatter={topLabelFormatter}
                contentStyle={TOOLTIP_CONTENT_STYLE}
              />
              <Legend wrapperStyle={{ paddingTop: "20px", fontSize: "12px" }} />

              <CustomBar dataKey="PAUD" fill="#2DD4BF" isAnimationActive={!isMobile} />
              <CustomBar dataKey="SD" fill="#1E7F4F" isAnimationActive={!isMobile} />
              <CustomBar dataKey="SMP" fill="#0EA5E9" isAnimationActive={!isMobile} />
              <CustomBar dataKey="PKBM" fill="#F2B705" isAnimationActive={!isMobile} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>
            Top {desaFilters.jumlah} Desa dengan Ruang Kelas {getTipeDisplayName(desaFilters.tipe)} Terbanyak
          </h2>

          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Jenjang:</label>
              <select value={desaFilters.jenjang} onChange={onDesaJenjangChange}>
                <option value="Semua Jenjang">Semua Jenjang</option>
                <option value="PAUD">PAUD</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="PKBM">PKBM</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Kecamatan:</label>
              <select value={desaFilters.kecamatan} onChange={onDesaKecamatanChange}>
                <option value="Semua Kecamatan">Semua Kecamatan</option>
                {allKecamatan.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Tipe:</label>
              <select value={desaFilters.tipe} onChange={onDesaTipeChange}>
                <option value="berat">Rusak Berat</option>
                <option value="sedang">Rusak Sedang</option>
                <option value="kurangRkb">Kurang RKB</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Jumlah:</label>
              <input
                type="number"
                min="1"
                max="50"
                value={desaFilters.jumlah}
                onChange={onDesaJumlahChange}
              />
            </div>

            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select value={desaFilters.urutan} onChange={onDesaUrutanChange}>
                <option value="teratas">Teratas</option>
                <option value="terbawah">Terbawah</option>
              </select>
            </div>
          </div>
        </div>

        <ResponsiveContainer
          width={chartWidth || "100%"}
          height={Math.max(500, topDesaData.length * 30)}
          key={`rc-d-${rcKey}`}
        >
          <BarChart
            className="horizontal-bar-chart"
            data={topDesaData}
            layout="vertical"
            margin={{ top: 18, right: hLayout.right, left: hLayout.left, bottom: 18 }}
            barSize={isMobile ? 16 : 20}
            isAnimationActive={!isMobile}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis
              type="category"
              dataKey="displayName"
              width={hLayout.yAxisWidth}
              interval={0}
              tick={{ fill: "#555", fontSize: 10 }}
            />
            <Tooltip />
            <Bar dataKey="value" fill="#1E7F4F" isAnimationActive={!isMobile}>
              <LabelList content={CustomLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
