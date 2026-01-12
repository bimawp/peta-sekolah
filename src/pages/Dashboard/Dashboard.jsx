// src/pages/Dashboard/Dashboard.jsx
import React, { useState, useMemo, useEffect } from "react";
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

const getJenjangOfSchool = (s, schoolTypesMap) => {
  const code = schoolTypesMap?.[String(s?.school_type_id)];
  if (code) return code;

  const guess = String(s?.jenjang || s?.level || "").toUpperCase();
  if (["PAUD", "SD", "SMP", "PKBM"].includes(guess)) return guess;

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

  useEffect(() => {
    const el = chartWrapEl;
    if (!el) return;

    let raf = 0;

    const measure = () => {
      // guard: element bisa “stale” saat HMR
      if (!el || !el.isConnected) return;
      const w = el.clientWidth || 360;
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
    const yAxisWidth = Math.min(
      180,
      Math.max(70, Math.floor(w * (isMobile ? 0.34 : 0.44)))
    );
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

  /**
   * ============================================================
   * Derivasi data dari Supabase
   * ============================================================
   */
  const {
    summary,
    conditionData,
    intervensiData,
    allKecamatan,
    schools,
    schoolTypesMap,
  } = useMemo(() => {
    if (loading || error || !data) {
      return {
        summary: {},
        conditionData: null,
        intervensiData: null,
        allKecamatan: [],
        schools: [],
        schoolTypesMap: {},
      };
    }

    const schoolTypesMap = data.schoolTypesMap || {};
    const schools = Array.isArray(data.schools) ? data.schools : [];

    // --- SUMMARY ---
    const s = data.stats || {};
    const summaryFromStats = {
      totalPaud: toNum(s.total_paud ?? s.totalPaud ?? s.paud ?? 0),
      totalSd: toNum(s.total_sd ?? s.totalSd ?? s.sd ?? 0),
      totalSmp: toNum(s.total_smp ?? s.totalSmp ?? s.smp ?? 0),
      totalPkbm: toNum(s.total_pkbm ?? s.totalPkbm ?? s.pkbm ?? 0),
      totalTenagaPendidik: toNum(
        s.total_teachers ?? s.totalTenagaPendidik ?? s.teachers ?? 0
      ),
    };

    const needFallbackTotals =
      !summaryFromStats.totalPaud &&
      !summaryFromStats.totalSd &&
      !summaryFromStats.totalSmp &&
      !summaryFromStats.totalPkbm;

    if (needFallbackTotals && schools.length) {
      const cnt = { PAUD: 0, SD: 0, SMP: 0, PKBM: 0 };
      schools.forEach((sc) => {
        const j = getJenjangOfSchool(sc, schoolTypesMap);
        if (cnt[j] != null) cnt[j] += 1;
      });
      summaryFromStats.totalPaud = cnt.PAUD;
      summaryFromStats.totalSd = cnt.SD;
      summaryFromStats.totalSmp = cnt.SMP;
      summaryFromStats.totalPkbm = cnt.PKBM;
    }

    // --- CONDITION DATA ---
    const kondisi = Array.isArray(data.kondisiSummary) ? data.kondisiSummary : [];

    const baseCond = {
      PAUD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      SD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      SMP: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      PKBM: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
    };

    let conditionData = { ...baseCond };

    if (kondisi.length > 0) {
      kondisi.forEach((r) => {
        const j = String(r.jenjang || r.level || r.code || "").toUpperCase();
        if (!conditionData[j]) return;

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
      });
    } else if (schools.length) {
      schools.forEach((sc) => {
        const j = getJenjangOfSchool(sc, schoolTypesMap);
        if (!conditionData[j]) return;

        const { baik, sedang, berat, kurang } = readClassCond(sc.class_condition);
        conditionData[j].baik += baik;
        conditionData[j].sedang += sedang;
        conditionData[j].berat += berat;
        conditionData[j].kurangRkb += kurang;
        conditionData[j].total += baik + sedang + berat;
      });
    }

    // --- INTERVENSI DATA ---
    const keg = Array.isArray(data.kegiatanSummary) ? data.kegiatanSummary : [];
    const baseInt = {
      PAUD: { rehab: 0, pembangunan: 0 },
      SD: { rehab: 0, pembangunan: 0 },
      SMP: { rehab: 0, pembangunan: 0 },
      PKBM: { rehab: 0, pembangunan: 0 },
    };
    let intervensiData = { ...baseInt };

    if (
      keg.length > 0 &&
      ("pembangunan_rkb" in (keg[0] || {}) ||
        "rehabilitasi_ruang_kelas" in (keg[0] || {}))
    ) {
      // pivot format
      keg.forEach((r) => {
        const j = String(r.jenjang || "").toUpperCase();
        if (!intervensiData[j]) return;
        intervensiData[j].pembangunan += toNum(r.pembangunan_rkb ?? 0);
        intervensiData[j].rehab += toNum(r.rehabilitasi_ruang_kelas ?? 0);
      });
    } else if (keg.length > 0) {
      // long format
      keg.forEach((r) => {
        const j = String(r.jenjang || "").toUpperCase();
        if (!intervensiData[j]) return;
        const nm = String(r.kegiatan || "").toLowerCase();
        const total = toNum(r.total_lokal ?? r.total ?? r.lokal ?? 0);
        if (nm.includes("rehab") || nm.includes("rehabil")) intervensiData[j].rehab += total;
        if (nm.includes("pembangunan")) intervensiData[j].pembangunan += total;
      });
    }

    // --- ALL KECAMATAN ---
    let allKecamatan = Array.isArray(data.allKecamatan) ? data.allKecamatan : [];
    if (!allKecamatan.length && schools.length) {
      const set = new Set();
      schools.forEach((sc) => {
        const k = (sc.kecamatan_name || sc.kecamatan || "").toString().trim();
        if (k) set.add(k);
      });
      allKecamatan = Array.from(set).sort((a, b) => a.localeCompare(b, "id"));
    } else {
      allKecamatan = allKecamatan.slice().sort((a, b) => a.localeCompare(b, "id"));
    }

    return {
      summary: summaryFromStats,
      conditionData,
      intervensiData,
      allKecamatan,
      schools,
      schoolTypesMap,
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

  // === Top Kecamatan (dari schools.class_condition)
  const topKecamatanData = useMemo(() => {
    if (loading || error || !schools?.length) return [];

    const pickVal = (cc) => {
      const { sedang, berat, kurang } = readClassCond(cc);
      if (kecamatanFilters.tipe === "sedang") return sedang;
      if (kecamatanFilters.tipe === "kurangRkb") return kurang;
      return berat;
    };

    const byJenjang = { PAUD: {}, SD: {}, SMP: {}, PKBM: {} };

    schools.forEach((sc) => {
      const j = getJenjangOfSchool(sc, schoolTypesMap);
      if (!byJenjang[j]) return;

      const kec = (sc.kecamatan_name || sc.kecamatan || "").toString().trim();
      if (!kec) return;

      const v = pickVal(sc.class_condition);
      if (v <= 0) return;

      byJenjang[j][kec] = (byJenjang[j][kec] || 0) + v;
    });

    const takeTop = (obj, jenjang) => {
      const arr = Object.entries(obj).map(([kecamatanName, value]) => ({
        kecamatanName,
        value,
      }));
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
  }, [schools, schoolTypesMap, loading, error, kecamatanFilters]);

  // === Top Desa (dari schools.class_condition)
  const topDesaData = useMemo(() => {
    if (loading || error || !schools?.length) return [];

    const pickVal = (cc) => {
      const { sedang, berat, kurang } = readClassCond(cc);
      if (desaFilters.tipe === "sedang") return sedang;
      if (desaFilters.tipe === "kurangRkb") return kurang;
      return berat;
    };

    const agg = {}; // key -> {name,kecamatan,displayName,value}

    schools.forEach((sc) => {
      const j = getJenjangOfSchool(sc, schoolTypesMap);
      if (desaFilters.jenjang !== "Semua Jenjang" && desaFilters.jenjang !== j) return;

      const kec = (sc.kecamatan_name || sc.kecamatan || "").toString().trim();
      if (desaFilters.kecamatan !== "Semua Kecamatan" && desaFilters.kecamatan !== kec) return;

      const desa = (sc.village_name || sc.village || "").toString().trim();
      if (!desa || !kec) return;

      const v = pickVal(sc.class_condition);
      if (v <= 0) return;

      const key = `${desa} (${kec})`;
      if (!agg[key]) agg[key] = { name: desa, kecamatan: kec, displayName: key, value: 0 };
      agg[key].value += v;
    });

    const arr = Object.values(agg);
    arr.sort((a, b) =>
      desaFilters.urutan === "teratas" ? b.value - a.value : a.value - b.value
    );
    return arr.slice(0, desaFilters.jumlah);
  }, [schools, schoolTypesMap, loading, error, desaFilters]);

  // === Custom label
  const CustomLabel = (props) => {
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
  };

  const CustomBar = ({ fill, dataKey, ...props }) => (
    <Bar {...props} dataKey={dataKey} fill={fill} radius={[0, 4, 4, 0]} minPointSize={20}>
      <LabelList content={CustomLabel} />
    </Bar>
  );

  const getTipeDisplayName = (tipe) =>
    tipe === "berat"
      ? "Rusak Berat"
      : tipe === "sedang"
      ? "Rusak Sedang"
      : tipe === "kurangRkb"
      ? "Kurang RKB"
      : tipe;

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
              {summary.totalTenagaPendidik?.toLocaleString?.() ?? 0}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chartsContainer}>
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
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>
            Top 5 Kecamatan dengan Ruang Kelas {getTipeDisplayName(kecamatanFilters.tipe)} Terbanyak per Jenjang
          </h2>

          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Tampilkan Grafik:</label>
              <select
                value={kecamatanFilters.tipe}
                onChange={(e) =>
                  setKecamatanFilters({ ...kecamatanFilters, tipe: e.target.value })
                }
              >
                <option value="berat">Rusak Berat</option>
                <option value="sedang">Rusak Sedang</option>
                <option value="kurangRkb">Kurang RKB</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select
                value={kecamatanFilters.urutan}
                onChange={(e) =>
                  setKecamatanFilters({ ...kecamatanFilters, urutan: e.target.value })
                }
              >
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
                tick={{ fontSize: 10, fill: "#374151", textAnchor: "end", dominantBaseline: "middle" }}
                tickFormatter={(v) => (isMobile && v.length > 25 ? `${v.slice(0, 22)}...` : v)}
              />
              <Tooltip
                formatter={(v, n) => [v?.toLocaleString?.() || 0, n]}
                labelFormatter={(l) => `Kecamatan: ${l}`}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #E5E7EB",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                }}
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
              <select
                value={desaFilters.jenjang}
                onChange={(e) => setDesaFilters({ ...desaFilters, jenjang: e.target.value })}
              >
                <option value="Semua Jenjang">Semua Jenjang</option>
                <option value="PAUD">PAUD</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="PKBM">PKBM</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Kecamatan:</label>
              <select
                value={desaFilters.kecamatan}
                onChange={(e) => setDesaFilters({ ...desaFilters, kecamatan: e.target.value })}
              >
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
              <select
                value={desaFilters.tipe}
                onChange={(e) => setDesaFilters({ ...desaFilters, tipe: e.target.value })}
              >
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
                onChange={(e) =>
                  setDesaFilters({
                    ...desaFilters,
                    jumlah: parseInt(e.target.value, 10) || 20,
                  })
                }
              />
            </div>

            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select
                value={desaFilters.urutan}
                onChange={(e) => setDesaFilters({ ...desaFilters, urutan: e.target.value })}
              >
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
