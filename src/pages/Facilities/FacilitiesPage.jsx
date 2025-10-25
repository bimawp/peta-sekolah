// src/pages/Facilities/FacilitiesPage.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
  memo,
  lazy,
} from "react";
import styles from "./FacilitiesPage.module.css";

const ChartsSection = lazy(() => import("./ChartsSection"));
import ChartSkeleton from "./ChartSkeleton";
import ErrorBoundary from "@/components/common/ErrorBoundary.jsx";

import SchoolDetailPaud from "../../components/schools/SchoolDetail/Paud/SchoolDetailPaud";
import SchoolDetailSd from "../../components/schools/SchoolDetail/Sd/SchoolDetailSd";
import SchoolDetailSmp from "../../components/schools/SchoolDetail/Smp/SchoolDetailSmp";
import SchoolDetailPkbm from "../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm";

import {
  getSdDetailByNpsn,
  getSmpDetailByNpsn,
  getPaudDetailByNpsn,
  getPkbmDetailByNpsn,
} from "@/services/api/detailApi";

import { httpJSON } from "@/utils/http"; // <<< gunakan helper global

/* =====================================================================
   Helpers: cache detail di sessionStorage agar hover "Detail" terasa cepat
===================================================================== */
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
  } catch {}
}

async function prefetchDetailByNpsn(jenjang, npsn) {
  if (!jenjang || !npsn) return;
  if (readDetailCache(jenjang, npsn)) return;
  try {
    let data = null;
    if (jenjang === "SD") data = await getSdDetailByNpsn(npsn);
    if (jenjang === "SMP") data = await getSmpDetailByNpsn(npsn);
    if (jenjang === "PAUD") data = await getPaudDetailByNpsn(npsn);
    if (jenjang === "PKBM") data = await getPkbmDetailByNpsn(npsn);
    if (data) writeDetailCache(jenjang, npsn, data);
  } catch {}
}

/** Prefetch modul detail (biar first render komponen detail lebih cepat di tab baru) */
async function prefetchDetailModule(jenjang) {
  try {
    if (jenjang === "SD") await import("@/components/schools/SchoolDetail/Sd/SchoolDetailSd");
    if (jenjang === "SMP") await import("@/components/schools/SchoolDetail/Smp/SchoolDetailSmp");
    if (jenjang === "PAUD") await import("@/components/schools/SchoolDetail/Paud/SchoolDetailPaud");
    if (jenjang === "PKBM") await import("@/components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm");
  } catch {}
}

/* =====================================================================
   DataTable
===================================================================== */
const DataTable = memo(function DataTable({
  data,
  onDetailClick,
  onDetailPrefetch,
  onDetailModulePrefetch,
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");

  const scrollRef = React.useRef(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [data, searchTerm, sortField, sortDirection, currentPage, itemsPerPage]);

  const filteredData = useMemo(() => {
    let f = data || [];
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      f = f.filter(
        (s) =>
          (s.namaSekolah || "").toLowerCase().includes(q) ||
          String(s.npsn || "").includes(searchTerm) ||
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
  }, [data, searchTerm, sortField, sortDirection]);

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
  }, [searchTerm, itemsPerPage]);

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

      <div className={styles.tableScrollContainer} ref={scrollRef}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>NO</th>
              <th
                className={styles.sortableHeader}
                onClick={() => handleSort("npsn")}
              >
                NPSN {sortField === "npsn" && (sortDirection === "asc" ? "↑" : "↓")}
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
                JENJANG {sortField === "jenjang" && (sortDirection === "asc" ? "↑" : "↓")}
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
                const jenjang = String(school?.jenjang || "").toUpperCase();
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
                        onMouseEnter={() => {
                          onDetailPrefetch && onDetailPrefetch(jenjang, npsn);
                          onDetailModulePrefetch && onDetailModulePrefetch(jenjang);
                        }}
                        onFocus={() => {
                          onDetailPrefetch && onDetailPrefetch(jenjang, npsn);
                          onDetailModulePrefetch && onDetailModulePrefetch(jenjang);
                        }}
                        onClick={() =>
                          onDetailClick && onDetailClick(school)
                        }
                      >
                        <span className={styles.detailIcon}>👁️</span> Detail
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

/* =====================================================================
   Halaman utama
===================================================================== */
const FacilitiesPage = () => {
  const [currentView, setCurrentView] = useState("main");
  const [selectedSchool, setSelectedSchool] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedJenjang, setSelectedJenjang] = useState("Semua Jenjang");
  const [selectedKecamatan, setSelectedKecamatan] = useState("Semua Kecamatan");
  const [selectedDesa, setSelectedDesa] = useState("Semua Desa");

  const [schoolData, setSchoolData] = useState([]);
  const [kegiatanData, setKegiatanData] = useState([]);
  const [filteredSchoolData, setFilteredSchoolData] = useState([]);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [desaOptions, setDesaOptions] = useState([]);

  const [kondisiPieData, setKondisiPieData] = useState([]);
  const [rehabilitasiPieData, setRehabilitasiPieData] = useState([]);
  const [pembangunanPieData, setPembangunanPieData] = useState([]);
  const [kondisiToiletData, setKondisiToiletData] = useState([]);
  const [intervensiToiletData, setIntervensiToiletData] = useState([]);

  // Flatten cepat dataset berkelompok { "Kec. XXX": [rows...] } → rows dengan label jenjang & kecamatan
  const flattenGrouped = (grouped, jenjangLabel) => {
    if (!grouped || typeof grouped !== "object") return [];
    const out = [];
    for (const [kecName, arr] of Object.entries(grouped)) {
      if (!Array.isArray(arr)) continue;
      for (const row of arr) {
        out.push({
          ...row,
          jenjang: jenjangLabel,
          kecamatan: row.kecamatan || kecName,
        });
      }
    }
    return out;
  };

  // Normalisasi 1 row sekolah
  const normalizeSchoolData = (school) => {
    let toiletBaik = 0,
      toiletRusakSedang = 0,
      toiletRusakBerat = 0;
    let tipe = school.type || school.status || "Tidak Diketahui";

    if (school.jenjang === "PAUD" || school.jenjang === "PKBM") {
      tipe = "Swasta";
    }

    if (school.jenjang === "SMP") {
      const { teachers_toilet = {}, students_toilet = {} } = school;
      const tMale = teachers_toilet.male || {};
      const tFemale = teachers_toilet.female || {};
      const sMale = students_toilet.male || {};
      const sFemale = students_toilet.female || {};
      toiletBaik =
        (parseInt(tMale.good, 10) || 0) +
        (parseInt(tFemale.good, 10) || 0) +
        (parseInt(sMale.good, 10) || 0) +
        (parseInt(sFemale.good, 10) || 0);
      toiletRusakSedang =
        (parseInt(tMale.moderate_damage, 10) || 0) +
        (parseInt(tFemale.moderate_damage, 10) || 0) +
        (parseInt(sMale.moderate_damage, 10) || 0) +
        (parseInt(sFemale.moderate_damage, 10) || 0);
      toiletRusakBerat =
        (parseInt(tMale.heavy_damage, 10) || 0) +
        (parseInt(tFemale.heavy_damage, 10) || 0) +
        (parseInt(sMale.heavy_damage, 10) || 0) +
        (parseInt(sFemale.heavy_damage, 10) || 0);
    } else {
      const { toilets = {} } = school;
      toiletBaik = parseInt(toilets.good, 10) || 0;
      toiletRusakSedang = parseInt(toilets.moderate_damage, 10) || 0;
      toiletRusakBerat = parseInt(toilets.heavy_damage, 10) || 0;
    }

    return {
      npsn: String(school.npsn),
      nama: school.name,
      jenjang: school.jenjang,
      tipe,
      desa: school.village,
      kecamatan: school.kecamatan,
      toiletBaik,
      toiletRusakSedang,
      toiletRusakBerat,
      totalToilet: toiletBaik + toiletRusakSedang + toiletRusakBerat,
      originalData: school,
    };
  };

  // Search
  const performSearch = (data) => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();
    return data.filter(
      (s) =>
        s.nama?.toLowerCase().includes(q) ||
        s.npsn?.toLowerCase().includes(q) ||
        s.jenjang?.toLowerCase().includes(q) ||
        s.kecamatan?.toLowerCase().includes(q) ||
        s.desa?.toLowerCase().includes(q)
    );
  };

  // INIT (pakai httpJSON untuk SWR konsisten)
  useEffect(() => {
    let cancelled = false;
    const initializeData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          paudRes,
          sdRes,
          smpRes,
          pkbmRes,
          kegiatanPaudRes,
          kegiatanSdRes,
          kegiatanSmpRes,
          kegiatanPkbmRes,
        ] = await Promise.all([
          httpJSON("/data/paud.json"),
          httpJSON("/data/sd_new.json"),
          httpJSON("/data/smp.json"),
          httpJSON("/data/pkbm.json"),
          httpJSON("/data/data_kegiatan_paud.json"),
          httpJSON("/data/data_kegiatan_sd.json"),
          httpJSON("/data/data_kegiatan_smp.json"),
          httpJSON("/data/data_kegiatan_pkbm.json"),
        ]);

        if (cancelled) return;

        const paud = paudRes?.data || paudRes;     // httpJSON mengembalikan {data, ...}
        const sd = sdRes?.data || sdRes;
        const smp = smpRes?.data || smpRes;
        const pkbm = pkbmRes?.data || pkbmRes;

        const kegiatanPaud = kegiatanPaudRes?.data || kegiatanPaudRes || [];
        const kegiatanSd = kegiatanSdRes?.data || kegiatanSdRes || [];
        const kegiatanSmp = kegiatanSmpRes?.data || kegiatanSmpRes || [];
        const kegiatanPkbm = kegiatanPkbmRes?.data || kegiatanPkbmRes || [];

        const allRawData = [
          ...flattenGrouped(paud, "PAUD"),
          ...flattenGrouped(sd, "SD"),
          ...flattenGrouped(smp, "SMP"),
          ...flattenGrouped(pkbm, "PKBM"),
        ];

        const allKegiatanData = [
          ...kegiatanPaud,
          ...kegiatanSd,
          ...kegiatanSmp,
          ...kegiatanPkbm,
        ];

        const allProcessedData = allRawData.map(normalizeSchoolData);
        setSchoolData(allProcessedData);
        setKegiatanData(allKegiatanData);

        // opsi filter
        const uniqueKecamatan = [
          ...new Set(allProcessedData.map((s) => s.kecamatan).filter(Boolean)),
        ].sort();
        const uniqueDesa = [
          ...new Set(allProcessedData.map((s) => s.desa).filter(Boolean)),
        ].sort();
        setKecamatanOptions(uniqueKecamatan);
        setDesaOptions(uniqueDesa);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError(`Failed to load data: ${e.message}`);
          setLoading(false);
        }
      }
    };
    initializeData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Refilter + charts
  useEffect(() => {
    if (schoolData.length === 0) return;

    let filtered = schoolData;
    if (selectedJenjang !== "Semua Jenjang")
      filtered = filtered.filter((s) => s.jenjang === selectedJenjang);
    if (selectedKecamatan !== "Semua Kecamatan")
      filtered = filtered.filter((s) => s.kecamatan === selectedKecamatan);
    if (selectedDesa !== "Semua Desa")
      filtered = filtered.filter((s) => s.desa === selectedDesa);

    filtered = performSearch(filtered);
    setFilteredSchoolData(filtered);

    // hitung chart async microtask agar UI tak jank
    setTimeout(() => {
      const t0 = performance.now?.() ?? Date.now();
      generateChartData(filtered, schoolData, kegiatanData);
      const t1 = performance.now?.() ?? Date.now();
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.log(
          `[Perf] generateChartData ${(t1 - t0).toFixed(1)}ms • sample=${filtered?.length ?? 0}`
        );
      }
    }, 0);
  }, [
    schoolData,
    kegiatanData,
    selectedJenjang,
    selectedKecamatan,
    selectedDesa,
    searchQuery,
  ]);

  const resetAllFilters = () => {
    setSelectedJenjang("Semua Jenjang");
    setSelectedKecamatan("Semua Kecamatan");
    setSelectedDesa("Semua Desa");
    setSearchQuery("");
  };

  // label/tooltip pie & bar
  const renderLabelInside = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, actualCount,
  }) => {
    if (!actualCount) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
        <tspan x={x} dy="-0.3em">{`${percent.toFixed(1)}%`}</tspan>
        <tspan x={x} dy="1.2em">({actualCount})</tspan>
      </text>
    );
  };

  const customPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const { name, actualCount, percent } = data?.payload || {};
      if (percent === undefined) return null;
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipContent}>
            <span className={styles.tooltipLabel}>{name}</span>
            <span className={styles.tooltipValue}>
              {actualCount} unit ({percent.toFixed(1)}%)
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const customBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipContent}>
            <span className={styles.tooltipLabel}>{label}</span>
            <span className={styles.tooltipValue}>
              {payload[0].value} unit
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Generate charts
  const generateChartData = (data, allSchoolData, allKegiatanData) => {
    const pembangunanDilakukan = (allKegiatanData || []).filter(
      (k) => k.Kegiatan === "Pembangunan Toilet"
    ).length;
    const rehabDilakukan = (allKegiatanData || []).filter(
      (k) => k.Kegiatan === "Rehab Toilet" || k.Kegiatan === "Rehab Ruang Toilet"
    ).length;

    const sekolahTanpaToilet = (allSchoolData || []).filter(
      (s) => s.totalToilet === 0
    ).length;
    const kebutuhanRehabilitasi = (allSchoolData || []).filter(
      (s) => s.toiletRusakBerat > 0
    ).length;

    const rekap = {
      sekolah_tanpa_toilet: sekolahTanpaToilet,
      pembangunan_dilakukan: pembangunanDilakukan,
      kebutuhan_rehabilitasi: kebutuhanRehabilitasi,
      rehab_dilakukan: rehabDilakukan,
      intervensi_pembangunan: pembangunanDilakukan,
      intervensi_rehab: rehabDilakukan,
    };

    const kebutuhan_belum_dibangun =
      rekap.sekolah_tanpa_toilet - rekap.pembangunan_dilakukan;

    const pieDataMapper = (d) => ({ ...d, actualCount: d.value });

    const totalPembangunan = rekap.sekolah_tanpa_toilet || 1;
    setPembangunanPieData(
      [
        {
          name: "Kebutuhan Toilet (Belum dibangun)",
          value: Math.max(0, kebutuhan_belum_dibangun),
          percent:
            (Math.max(0, kebutuhan_belum_dibangun) / totalPembangunan) * 100,
          color: "#FF6B6B",
        },
        {
          name: "Pembangunan dilakukan",
          value: rekap.pembangunan_dilakukan,
          percent: (rekap.pembangunan_dilakukan / totalPembangunan) * 100,
          color: "#4ECDC4",
        },
      ].map(pieDataMapper)
    );

    const totalRehabilitasi =
      rekap.kebutuhan_rehabilitasi + rekap.rehab_dilakukan || 1;
    setRehabilitasiPieData(
      [
        {
          name: "Rusak Berat (Belum Direhab)",
          value: rekap.kebutuhan_rehabilitasi,
          percent:
            (rekap.kebutuhan_rehabilitasi / totalRehabilitasi) * 100,
          color: "#FF6B6B",
        },
        {
          name: "Rehab Dilakukan",
          value: rekap.rehab_dilakukan,
          percent: (rekap.rehab_dilakukan / totalRehabilitasi) * 100,
          color: "#4ECDC4",
        },
      ]
        .filter((d) => d.value > 0)
        .map(pieDataMapper)
    );

    setIntervensiToiletData([
      { name: "Total Intervensi", value: rekap.intervensi_pembangunan + rekap.intervensi_rehab, color: "#667eea" },
      { name: "Pembangunan Toilet", value: rekap.intervensi_pembangunan, color: "#4ECDC4" },
      { name: "Rehab Toilet", value: rekap.intervensi_rehab, color: "#FFD93D" },
    ]);

    let totalToiletBaik = 0, totalToiletRusakSedang = 0, totalToiletRusakBerat = 0;
    data.forEach((s) => {
      totalToiletBaik += s.toiletBaik;
      totalToiletRusakSedang += s.toiletRusakSedang;
      totalToiletRusakBerat += s.toiletRusakBerat;
    });
    const totalToiletCount = totalToiletBaik + totalToiletRusakSedang + totalToiletRusakBerat;

    setKondisiToiletData([
      { name: "Total Unit", value: totalToiletCount, color: "#667eea" },
      { name: "Unit Baik", value: totalToiletBaik, color: "#4ECDC4" },
      { name: "Unit Rusak Sedang", value: totalToiletRusakSedang, color: "#FFD93D" },
      { name: "Unit Rusak Berat", value: totalToiletRusakBerat, color: "#FF6B6B" },
      { name: "Sekolah Tanpa Toilet", value: data.filter((s) => s.totalToilet === 0).length, color: "#ff8787" },
    ]);

    if (totalToiletCount > 0) {
      setKondisiPieData(
        [
          { name: "Baik", value: totalToiletBaik, percent: (totalToiletBaik / totalToiletCount) * 100, color: "#4ECDC4" },
          { name: "Rusak Sedang", value: totalToiletRusakSedang, percent: (totalToiletRusakSedang / totalToiletCount) * 100, color: "#FFD93D" },
          { name: "Rusak Berat", value: totalToiletRusakBerat, percent: (totalToiletRusakBerat / totalToiletCount) * 100, color: "#FF6B6B" },
        ].map(pieDataMapper)
      );
    } else {
      setKondisiPieData([
        { name: "Tidak Ada Data", value: 1, actualCount: 0, percent: 100, color: "#95A5A6" },
      ]);
    }
  };

  // data tabel
  const mappedTableData = useMemo(() => {
    return (filteredSchoolData || []).map((s) => ({
      npsn: s.npsn,
      namaSekolah: s.nama,
      jenjang: s.jenjang,
      tipeSekolah: s.tipe,
      desa: s.desa,
      kecamatan: s.kecamatan,
      student_count: 0,
      kondisiKelas: {
        baik: Number(s.toiletBaik || 0),
        rusakSedang: Number(s.toiletRusakSedang || 0),
        rusakBerat: Number(s.toiletRusakBerat || 0),
      },
      kurangRKB: 0,
      rehabRuangKelas: 0,
      pembangunanRKB: 0,
    }));
  }, [filteredSchoolData]);

  const handleDetailClickNavigate = useCallback((row) => {
    const npsn = row?.npsn;
    const jenjang = String(row?.jenjang || "").toUpperCase();
    if (!npsn) {
      alert("NPSN sekolah tidak ditemukan.");
      return;
    }
    let url = `/detail-sekolah?npsn=${encodeURIComponent(
      npsn
    )}&jenjang=${encodeURIComponent(jenjang)}`;
    if (jenjang === "PAUD")
      url = `/paud/school_detail?npsn=${encodeURIComponent(npsn)}`;
    if (jenjang === "SD")
      url = `/sd/school_detail?npsn=${encodeURIComponent(npsn)}`;
    if (jenjang === "SMP")
      url = `/smp/school_detail?npsn=${encodeURIComponent(npsn)}`;
    if (jenjang === "PKBM")
      url = `/pkbm/school_detail?npsn=${encodeURIComponent(npsn)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const handlePrefetchDetail = useCallback((jenjang, npsn) => {
    prefetchDetailByNpsn(jenjang, npsn);
  }, []);

  const handlePrefetchModule = useCallback((jenjang) => {
    prefetchDetailModule(jenjang);
  }, []);

  // FILTER BAR (inline)
  const jenjangOptions = ["Semua Jenjang", "PAUD", "SD", "SMP", "PKBM"];
  const desaOptionsFiltered = useMemo(() => {
    if (selectedKecamatan === "Semua Kecamatan") return ["Semua Desa", ...desaOptions];
    const set = new Set(
      schoolData
        .filter((s) => s.kecamatan === selectedKecamatan)
        .map((s) => s.desa)
        .filter(Boolean)
    );
    return ["Semua Desa", ...Array.from(set).sort()];
  }, [selectedKecamatan, desaOptions, schoolData]);

  const FiltersBar = () => (
    <section className={`${styles.card} ${styles.filtersCard || ""}`}>
      <header className={styles.cardHeader}><h2>Filter Data</h2></header>
      <div
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          alignItems: "end",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Filter Jenjang</label>
          <select
            value={selectedJenjang}
            onChange={(e) => setSelectedJenjang(e.target.value)}
            className={styles.itemsPerPageSelect}
            style={{ width: "100%" }}
          >
            {jenjangOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Filter Kecamatan</label>
          <select
            value={selectedKecamatan}
            onChange={(e) => {
              setSelectedKecamatan(e.target.value);
              setSelectedDesa("Semua Desa");
            }}
            className={styles.itemsPerPageSelect}
            style={{ width: "100%" }}
          >
            {["Semua Kecamatan", ...kecamatanOptions].map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Filter Desa</label>
          <select
            value={selectedDesa}
            onChange={(e) => setSelectedDesa(e.target.value)}
            className={styles.itemsPerPageSelect}
            style={{ width: "100%" }}
          >
            {desaOptionsFiltered.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: 12, marginBottom: 6 }}>Pencarian Cepat</label>
          <input
            type="text"
            placeholder="Cari nama sekolah / NPSN / desa / kecamatan…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            style={{ width: "100%" }}
          />
        </div>

        <div>
          <button
            onClick={resetAllFilters}
            className={styles.resetTableButton}
            style={{ width: "100%", marginTop: 6 }}
          >
            Reset Semua Filter
          </button>
        </div>
      </div>
    </section>
  );

  const renderMainView = () => {
    if (loading) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.loadingContainer}>
              <div className={styles.loadingSpinner}></div>
              <p className={styles.loadingText}>Memuat data sekolah...</p>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3>Terjadi Kesalahan</h3>
              <p className={styles.errorMessage}>{error}</p>
              <button
                className={styles.retryButton}
                onClick={() => window.location.reload()}
              >
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.container}>
        <header className={`${styles.card} ${styles.pageHeader}`}>
          <div className={styles.headerContent}>
            <h1 className={styles.pageTitle}>Dashboard Fasilitas Toilet Sekolah</h1>
            <p className={styles.pageSubtitle}>
              Analisis kondisi dan kebutuhan toilet sekolah di wilayah kerja
            </p>
          </div>
        </header>

        {/* FILTER BAR */}
        <FiltersBar />

        {/* CHARTS */}
        <ErrorBoundary>
          <Suspense
            fallback={
              <section className={styles.chartsSection}>
                <div className={styles.pieChartsGrid}>
                  <div className={`${styles.card} ${styles.chartCard}`}>
                    <header className={styles.chartHeader}><h3>Kondisi Unit Toilet</h3></header>
                    <div className={styles.chartWrapper}><ChartSkeleton height={280} /></div>
                  </div>
                  <div className={`${styles.card} ${styles.chartCard}`}>
                    <header className={styles.chartHeader}><h3>Status Rehabilitasi</h3></header>
                    <div className={styles.chartWrapper}><ChartSkeleton height={280} /></div>
                  </div>
                  <div className={`${styles.card} ${styles.chartCard}`}>
                    <header className={styles.chartHeader}><h3>Status Pembangunan</h3></header>
                    <div className={styles.chartWrapper}><ChartSkeleton height={280} /></div>
                  </div>
                </div>
                <div className={styles.barChartsGrid}>
                  <div className={`${styles.card} ${styles.chartCard}`}>
                    <header className={styles.chartHeader}><h3>Kondisi Unit Toilet</h3></header>
                    <div className={styles.chartWrapper}><ChartSkeleton height={320} /></div>
                  </div>
                  <div className={`${styles.card} ${styles.chartCard}`}>
                    <header className={styles.chartHeader}><h3>Kategori Intervensi</h3></header>
                    <div className={styles.chartWrapper}><ChartSkeleton height={320} /></div>
                  </div>
                </div>
              </section>
            }
          >
            <ChartsSection
              kondisiPieData={kondisiPieData}
              rehabilitasiPieData={rehabilitasiPieData}
              pembangunanPieData={pembangunanPieData}
              kondisiToiletData={kondisiToiletData}
              intervensiToiletData={intervensiToiletData}
              customPieTooltip={customPieTooltip}
              customBarTooltip={customBarTooltip}
              renderLabelInside={renderLabelInside}
            />
          </Suspense>
        </ErrorBoundary>

        {/* TABLE */}
        <section className={`${styles.card} ${styles.tableCard}`}>
          <header className={styles.cardHeader}>
            <div className={styles.tableHeaderContent}>
              <h2>Data Sekolah</h2>
            </div>
          </header>

          <div className={styles.chartContent}>
            <DataTable
              data={mappedTableData}
              onDetailClick={handleDetailClickNavigate}
              onDetailPrefetch={handlePrefetchDetail}
              onDetailModulePrefetch={handlePrefetchModule}
            />
          </div>
        </section>
      </div>
    );
  };

  return (
    <main className={styles.pageWrapper}>
      {currentView === "main" && renderMainView()}

      {/* Opsi render detail lokal (tidak dipakai saat open tab baru) */}
      {currentView === "detail" &&
        selectedSchool &&
        (() => {
          let DetailComponent;
          switch (selectedSchool.jenjang) {
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
                <div className={styles.container}>
                  <div className={styles.card}>
                    <h2>Detail tidak tersedia</h2>
                  </div>
                </div>
              );
          }
          return (
            <DetailComponent
              schoolData={{
                ...selectedSchool.originalData,
                kecamatan: selectedSchool.kecamatan,
              }}
            />
          );
        })()}
    </main>
  );
};

export default FacilitiesPage;
