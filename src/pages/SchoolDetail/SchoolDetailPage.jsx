// src/pages/SchoolDetail/SchoolDetailPage.jsx - server-side filtering via RPC (tanpa ubah logika hitungan & map)

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Tooltip
} from 'recharts';

import 'leaflet/dist/leaflet.css';
import '../../services/utils/mapUtils.js';

import SimpleMap from '../../components/common/Map/SimpleMap';
import styles from './SchoolDetailPage.module.css';
import SchoolDetailPaud from '../../components/schools/SchoolDetail/Paud/SchoolDetailPaud';
import SchoolDetailSd from '../../components/schools/SchoolDetail/Sd/SchoolDetailSd';
import SchoolDetailSmp from '../../components/schools/SchoolDetail/Smp/SchoolDetailSmp';
import SchoolDetailPkbm from '../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm';

// Hydration (tidak mengubah hitungan)
import { useHydratedSchools } from '../../hooks/useHydratedSchools';
// URL sync helper
import { getPageFiltersFromURL, setPageFiltersToURL, DEFAULT_PAGE_FILTERS } from '../../utils/urlFilters';

// Data source (RPC)
import { loadSchoolDatasetRPC } from '../../services/dataSource';

// Error Boundary
class ErrorBoundary extends React.Component {
  constructor(props){ super(props); this.state={hasError:false,error:null}; }
  static getDerivedStateFromError(error){ return {hasError:true,error}; }
  componentDidCatch(error, info){ console.error('SchoolDetailPage Error:', error, info); }
  render(){
    if(this.state.hasError){
      return (
        <div className={styles.errorContainer}>
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>⚠️</div>
            <h2>Terjadi Kesalahan</h2>
            <p>Komponen tidak dapat dimuat.</p>
            <button className={styles.retryButton} onClick={()=>this.setState({hasError:false,error:null})}>Coba Lagi</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==== PieChart ====
const PieChartComponent = React.memo(({ title, data }) => {
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const total = (data || []).reduce((s,i)=>s+(Number(i?.value)||0),0);
  const validData = (data || []).filter(item => item && typeof item.value === 'number' && item.value >= 0);

  if (!validData.length) {
    return (
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div className={styles.noDataState}><div className={styles.noDataIcon}>📊</div><p>Tidak ada data</p></div>
      </div>
    );
  }

  const renderCustomLabel = (entry) => {
    const pct = total ? ((entry.value/total)*100).toFixed(1) : '0.0';
    return `${pct}%`;
  };
  const CustomTooltip = ({active,payload})=>{
    if(active && payload && payload.length){
      const d = payload[0];
      const pct = total ? ((d.value/total)*100).toFixed(1) : '0.0';
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipHeader}>
            <div className={styles.tooltipColorDot} style={{backgroundColor:d.payload.color}}></div>
            <span className={styles.tooltipLabel}>{d.name}</span>
          </div>
          <div className={styles.tooltipValue}>{Number(d.value||0).toLocaleString('id-ID')} ({pct}%)</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${styles.chartContainer} ${styles.fadeInUp}`}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={validData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120}
                 label={renderCustomLabel} labelLine={false} animationBegin={0} animationDuration={1200}
                 onMouseEnter={(_,i)=>setHoveredIndex(i)} onMouseLeave={()=>setHoveredIndex(-1)}>
              {validData.map((entry,idx)=>(
                <Cell key={idx} fill={entry.color} stroke={hoveredIndex===idx?'#fff':'none'} strokeWidth={hoveredIndex===idx?3:0}
                      style={{filter:hoveredIndex===idx?'brightness(1.1)':'brightness(1)',cursor:'pointer'}}/>
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip/>} />
            <Legend wrapperStyle={{paddingTop:'20px'}} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

// ==== BarChart ====
const BarChartComponent = React.memo(({ title, data, colors }) => {
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const safeData = (data || []).map(d => ({ ...d, value: Number(d?.value||0) }));
  const hasAny = safeData.some(d => d.value > 0);

  const CustomTooltip = ({active,payload,label})=>{
    if(active && payload && payload.length){
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipHeader}><span className={styles.tooltipLabel}>{label}</span></div>
          <div className={styles.tooltipValue}>{Number(payload[0].value||0).toLocaleString('id-ID')} unit</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${styles.chartContainer} ${styles.fadeInUp}`}>
      <h3 className={styles.chartTitle}>{title}</h3>
      {!hasAny && (
        <div className={styles.noDataState} style={{minHeight: 180}}>
          <div className={styles.noDataIcon}>📈</div>
          <p>Tidak ada data</p>
        </div>
      )}
      {hasAny && (
        <div className={styles.chartWrapperTall}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={safeData} margin={{ top:30, right:30, left:20, bottom:80 }}
                      onMouseMove={(s)=>{ if(s && s.activeTooltipIndex!==undefined) setHoveredIndex(s.activeTooltipIndex); }}
                      onMouseLeave={()=>setHoveredIndex(-1)}>
              <defs>
                {colors.map((c,i)=>(
                  <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={0.9}/>
                    <stop offset="100%" stopColor={c} stopOpacity={0.6}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{fontSize:12,fill:'#64748b'}} interval={0} angle={-25} textAnchor="end" height={100}/>
              <YAxis tickFormatter={(v)=>Number(v||0).toLocaleString('id-ID')} tick={{fontSize:12,fill:'#64748b'}} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="value" animationDuration={1500} animationBegin={300}>
                {safeData.map((_,i)=>(
                  <Cell key={i} fill={`url(#gradient-${i % colors.length})`} stroke={colors[i % colors.length]} strokeWidth={1}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

// ==== DataTable ====
const DataTable = React.memo(({ data, onDetailClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  const filteredData = useMemo(() => {
    let f = data || [];
    if (searchTerm) {
      f = f.filter(s =>
        (s.namaSekolah||'').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.npsn||'').toString().includes(searchTerm) ||
        (s.kecamatan||'').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sortField) {
      f = [...f].sort((a, b) => {
        let aVal = a[sortField]; let bVal = b[sortField];
        if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); }
        return sortDirection === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
    }
    return f;
  }, [data, searchTerm, sortField, sortDirection]);

  const { data: paginatedData, totalPages, totalItems } = useMemo(() => {
    const t = Math.ceil(filteredData.length / itemsPerPage);
    const s = (currentPage - 1) * itemsPerPage;
    return { data: filteredData.slice(s, s + itemsPerPage), totalPages: t > 0 ? t : 1, totalItems: filteredData.length };
  }, [filteredData, currentPage, itemsPerPage]);

  const handleSort = (field) => {
    if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const handleReset = useCallback(() => {
    setSearchTerm(''); setCurrentPage(1); setItemsPerPage(10); setSortField(''); setSortDirection('asc');
  }, []);
  useEffect(()=>{ setCurrentPage(1); },[searchTerm, itemsPerPage]);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableControls}>
        <div className={styles.searchContainer}>
          <div className={styles.searchIcon}>🔍</div>
          <input type="text" placeholder="Cari nama sekolah, NPSN..." value={searchTerm}
                 onChange={e=>setSearchTerm(e.target.value)} className={styles.searchInput}/>
          {searchTerm && (<button className={styles.clearSearch} onClick={()=>setSearchTerm('')}>✕</button>)}
        </div>
        <div className={styles.controlGroup}>
          <label>Tampilkan:</label>
          <select value={itemsPerPage} onChange={e=>setItemsPerPage(Number(e.target.value))} className={styles.itemsPerPageSelect}>
            <option value={5}>5</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
          </select>
          <button onClick={handleReset} className={styles.resetTableButton}>Reset</button>
        </div>
      </div>

      <div className={styles.tableScrollContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>NO</th>
              <th className={styles.sortableHeader} onClick={() => handleSort('npsn')}>
                NPSN {sortField === 'npsn' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('namaSekolah')}>
                NAMA SEKOLAH {sortField === 'namaSekolah' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th className={styles.sortableHeader} onClick={() => handleSort('jenjang')}>
                JENJANG {sortField === 'jenjang' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>TIPE</th><th>DESA</th><th>KECAMATAN</th>
              <th>SISWA</th><th>KLS BAIK</th><th>R. SEDANG</th><th>R. BERAT</th><th>KURANG RKB</th>
              <th>REHAB</th><th>PEMBANGUNAN</th><th>DETAIL</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? paginatedData.map((school, index) => (
              <tr key={`${school.npsn || index}-${index}`} className={styles.tableRow}>
                <td>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                <td><span className={styles.npsnBadge}>{school.npsn || '-'}</span></td>
                <td className={styles.schoolNameCell}>{school.namaSekolah || '-'}</td>
                <td><span className={`${styles.jenjangBadge} ${styles[school.jenjang?.toLowerCase?.() || '']}`}>{school.jenjang || '-'}</span></td>
                <td>{school.tipeSekolah || '-'}</td>
                <td>{school.desa || '-'}</td>
                <td>{school.kecamatan || '-'}</td>
                <td><span className={styles.numberBadge}>{Number(school.student_count||0)}</span></td>
                <td><span className={styles.conditionGood}>{Number(school.kondisiKelas?.baik||0)}</span></td>
                <td><span className={styles.conditionModerate}>{Number(school.kondisiKelas?.rusakSedang||0)}</span></td>
                <td><span className={styles.conditionBad}>{Number(school.kondisiKelas?.rusakBerat||0)}</span></td>
                <td><span className={styles.numberBadge}>{Number(school.kurangRKB||0)}</span></td>
                <td><span className={styles.numberBadge}>{Number(school.rehabRuangKelas||0)}</span></td>
                <td><span className={styles.numberBadge}>{Number(school.pembangunanRKB||0)}</span></td>
                <td>
                  <button className={styles.detailButton} onClick={() => onDetailClick && onDetailClick(school)}>
                    <span className={styles.detailIcon}>👁️</span> Detail
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="15" className={styles.noDataCell}>
                  <div className={styles.noDataState}>
                    <div className={styles.noDataIcon}>🔍</div>
                    <p>Tidak ada data</p>
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
            Menampilkan <strong>{paginatedData.length}</strong> dari <strong>{totalItems}</strong> data
          </span>
        </div>
        <div className={styles.pageButtons}>
          <button disabled={currentPage === 1} onClick={()=>setCurrentPage(1)} className={styles.pageButton}>⏮️</button>
          <button disabled={currentPage === 1} onClick={()=>setCurrentPage(p=>p-1)} className={styles.pageButton}>⬅️</button>
          <span className={styles.pageIndicator}><strong>{currentPage}</strong> / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={()=>setCurrentPage(p=>p+1)} className={styles.pageButton}>➡️</button>
          <button disabled={currentPage === totalPages} onClick={()=>setCurrentPage(totalPages)} className={styles.pageButton}>⏭️</button>
        </div>
      </div>
    </div>
  );
});

// ==== Main ====
const SchoolDetailPage = () => {
  const [schoolData, setSchoolData] = useState([]);
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('main');
  const [selectedSchool, setSelectedSchool] = useState(null);

  // === FILTER STATE (sinkron URL) ===
  const [filterJenjang, setFilterJenjang] = useState(DEFAULT_PAGE_FILTERS.jenjang);
  const [filterKecamatan, setFilterKecamatan] = useState(DEFAULT_PAGE_FILTERS.kecamatan);
  const [filterDesa, setFilterDesa] = useState(DEFAULT_PAGE_FILTERS.desa);

  const [jenjangList, setJenjangList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [mapView, setMapView] = useState({ center: [-7.21, 107.91], zoom: 11 });

  // INIT FILTER dari URL
  useEffect(() => {
    const f = getPageFiltersFromURL();
    setFilterJenjang(f.jenjang || DEFAULT_PAGE_FILTERS.jenjang);
    setFilterKecamatan(f.kecamatan || DEFAULT_PAGE_FILTERS.kecamatan);
    setFilterDesa(f.desa || DEFAULT_PAGE_FILTERS.desa);
  }, []);

  // Tulis FILTER ke URL
  useEffect(() => {
    setPageFiltersToURL({ jenjang: filterJenjang, kecamatan: filterKecamatan, desa: filterDesa });
  }, [filterJenjang, filterKecamatan, filterDesa]);

  const handleDetailClick = useCallback((school) => { setSelectedSchool(school); setCurrentView('detail'); }, []);
  const handleBackToMain = useCallback(() => { setCurrentView('main'); setSelectedSchool(null); }, []);

  const isValidCoordinate = useCallback((lat, lng) => (
    lat != null && lng != null &&
    typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180 &&
    (lat !== 0 || lng !== 0)
  ), []);

  // Muat GEOJSON sekali (untuk peta)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [kecGeo, desaGeo] = await Promise.all([
          fetch('/data/kecamatan.geojson').then(r => r.ok ? r.json() : null),
          fetch('/data/desa.geojson').then(r => r.ok ? r.json() : null),
        ]);
        if (!alive) return;
        setGeoData({ kecamatan: kecGeo, desa: desaGeo });
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  // Muat DATA SEKOLAH via RPC setiap filter berubah
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const filters = {
      level: (filterJenjang && filterJenjang !== 'Semua Jenjang') ? filterJenjang : null,
      kecamatan: (filterKecamatan && filterKecamatan !== 'Semua Kecamatan') ? filterKecamatan : null,
      village: (filterDesa && filterDesa !== 'Semua Desa') ? filterDesa : null,
    };

    (async () => {
      try {
        const merged = await loadSchoolDatasetRPC(filters);
        if (!alive) return;

        // valid points untuk peta
        const mergedValid = (merged || []).filter(s => {
          const c = s.coordinates;
          return Array.isArray(c) && c.length === 2 && isValidCoordinate(Number(c[0]), Number(c[1]));
        });

        setSchoolData(mergedValid);

        // Daftar dropdown dari dataset aktif (bisa diganti distinct RPC kalau mau full options)
        setJenjangList([...new Set(mergedValid.map(s => s.jenjang).filter(Boolean))].sort());
        setKecamatanList([...new Set(mergedValid.map(s => s.kecamatan).filter(Boolean))].sort());
        setDesaList([...new Set(mergedValid.map(s => s.desa).filter(Boolean))].sort());
      } catch (e) {
        console.error('[SchoolDetailPage] load error:', e);
        if (!alive) return;
        setError(e.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [filterJenjang, filterKecamatan, filterDesa, isValidCoordinate]);

  // Hydration untuk peta (tetap)
  const hydratedSchools = useHydratedSchools(schoolData);

  // Filter data untuk chart & tabel (tetap persis logika kamu)
  const filteredData = useMemo(() => {
    let data = [...schoolData];
    if (filterJenjang !== 'Semua Jenjang') data = data.filter(d => d.jenjang === filterJenjang);
    if (filterKecamatan !== 'Semua Kecamatan') data = data.filter(d => d.kecamatan === filterKecamatan);
    if (filterDesa !== 'Semua Desa') data = data.filter(d => d.desa === filterDesa);
    return data;
  }, [schoolData, filterJenjang, filterKecamatan, filterDesa]);

  // Data untuk PETA: hydrated + mengikuti filter halaman
  const mapData = useMemo(() => {
    let data = [...hydratedSchools];
    if (filterJenjang !== 'Semua Jenjang') data = data.filter(d => d.jenjang === filterJenjang);
    if (filterKecamatan !== 'Semua Kecamatan') data = data.filter(d => d.kecamatan === filterKecamatan);
    if (filterDesa !== 'Semua Desa') data = data.filter(d => d.desa === filterDesa);
    return data.filter(s => Array.isArray(s.coordinates) && s.coordinates.length === 2 && !Number.isNaN(+s.coordinates[0]) && !Number.isNaN(+s.coordinates[1]));
  }, [hydratedSchools, filterJenjang, filterKecamatan, filterDesa]);

  // === Hitungan chart (tanpa mengubah logika) ===
  const { chartData } = useMemo(() => {
    let unitBaik = 0, unitRusakSedang = 0, unitRusakBerat = 0;
    let rehabDilakukan = 0, pembangunanDilakukan = 0, totalKurangRKB = 0;

    filteredData.forEach(school => {
      unitBaik += Number(school?.kondisiKelas?.baik || 0);
      unitRusakSedang += Number(school?.kondisiKelas?.rusakSedang || 0);
      unitRusakBerat += Number(school?.kondisiKelas?.rusakBerat || 0);
      rehabDilakukan += Number(school?.rehabRuangKelas || 0);
      pembangunanDilakukan += Number(school?.pembangunanRKB || 0);
      totalKurangRKB += Number(school?.kurangRKB || 0);
    });

    const totalUnitKelas = unitBaik + unitRusakSedang + unitRusakBerat;
    const belumDirehab = Math.max(0, unitRusakBerat - rehabDilakukan);
    const belumDibangun = Math.max(0, totalKurangRKB - pembangunanDilakukan);
    const totalIntervensi = pembangunanDilakukan + rehabDilakukan;

    const charts = {
      pieDataList: [
        { title: "Kondisi Ruang Kelas", data: [
          { name: "Baik", value: unitBaik, color: "#10b981" },
          { name: "Rusak Sedang", value: unitRusakSedang, color: "#f59e0b" },
          { name: "Rusak Berat", value: unitRusakBerat, color: "#ef4444" },
        ]},
        { title: "Status Rehabilitasi", data: [
          { name: "Sudah Direhab", value: rehabDilakukan, color: "#06b6d4" },
          { name: "Belum Direhab", value: belumDirehab, color: "#f97316" },
        ]},
        { title: "Status Pembangunan", data: [
          { name: "Sudah Dibangun", value: pembangunanDilakukan, color: "#8b5cf6" },
          { name: "Belum Dibangun", value: belumDibangun, color: "#ec4899" },
        ]},
      ],
      barKondisiKelas: [
        { name: "Total Kelas", value: totalUnitKelas },
        { name: "Kondisi Baik", value: unitBaik },
        { name: "Rusak Sedang", value: unitRusakSedang },
        { name: "Rusak Berat", value: unitRusakBerat },
        { name: "Kurang RKB", value: totalKurangRKB },
      ],
      barIntervensiKelas: [
        { name: "Total Intervensi", value: totalIntervensi },
        { name: "Pembangunan RKB", value: pembangunanDilakukan },
        { name: "Rehab Ruang Kelas", value: rehabDilakukan },
      ],
    };
    return { chartData: charts };
  }, [filteredData]);

  const handleResetAllFilters = useCallback(() => {
    setFilterJenjang('Semua Jenjang'); setFilterKecamatan('Semua Kecamatan'); setFilterDesa('Semua Desa');
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.modernSpinner}><div className={styles.spinnerRing}></div><div className={styles.spinnerRing}></div><div className={styles.spinnerRing}></div></div>
          <h2 className={styles.loadingTitle}>Memuat Data Sekolah</h2>
          <p className={styles.loadingSubtitle}>Mengambil informasi terbaru...</p>
          <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorContent}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Gagal Memuat Data</h2>
          <p className={styles.errorMessage}>{error}</p>
          <button className={styles.retryButton} onClick={() => window.location.reload()}>🔄 Muat Ulang</button>
        </div>
      </div>
    );
  }

  const renderDetailView = () => {
    if (!selectedSchool) return null;
    let DetailComponent;
    switch (selectedSchool.jenjang) {
      case 'PAUD': DetailComponent = SchoolDetailPaud; break;
      case 'SD':   DetailComponent = SchoolDetailSd;   break;
      case 'SMP':  DetailComponent = SchoolDetailSmp;  break;
      case 'PKBM': DetailComponent = SchoolDetailPkbm; break;
      default: return <div className={styles.noDetailAvailable}>Detail tidak tersedia.</div>;
    }
    const detailData = { ...selectedSchool.originalData, kecamatan: selectedSchool.kecamatan };
    return <DetailComponent schoolData={detailData} onBack={handleBackToMain} />;
  };

  const renderMainView = () => (
    <div className={styles.pageContainer}>
      <header className={`${styles.pageHeader} ${styles.fadeInDown}`}>
        <div className={styles.headerContent}><h1 className={styles.pageTitle}>Detail Peta Sekolah</h1></div>
      </header>

      <main>
        <section className={`${styles.card} ${styles.mapCard} ${styles.fadeInUp}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h2 className={styles.cardTitle}><span className={styles.cardIcon}>🗺️</span>Peta Sebaran Sekolah</h2>
              <p className={styles.cardSubtitle}>Menampilkan {mapData.length} lokasi sekolah valid</p>
            </div>
            <div className={styles.mapLegend}>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{backgroundColor:'#10b981'}}></span><span>Baik</span></div>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{backgroundColor:'#f59e0b'}}></span><span>Perbaikan</span></div>
              <div className={styles.legendItem}><span className={styles.legendDot} style={{backgroundColor:'#ef4444'}}></span><span>Buruk</span></div>
            </div>
          </div>
          <div className={styles.mapContainer}>
            <div className={styles.mapWrapper}>
              <ErrorBoundary>
                <SimpleMap
                  schools={mapData}
                  geoData={geoData}
                  initialCenter={mapView.center}
                  initialZoom={mapView.zoom}
                />
              </ErrorBoundary>
            </div>
          </div>
        </section>

        <section className={`${styles.card} ${styles.fadeInUp}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h2 className={styles.cardTitle}><span className={styles.cardIcon}>🔍</span>Filter Statistik & Data</h2>
              <p className={styles.cardSubtitle}>Saring data untuk chart dan tabel di bawah ini</p>
            </div>
            <button onClick={handleResetAllFilters} className={styles.resetButton}><span className={styles.resetIcon}>🔄</span>Reset Filter</button>
          </div>
          <div className={styles.filterContainer}>
            <div className={styles.filterGroup}>
              <label htmlFor="filter-jenjang" className={styles.filterLabel}><span className={styles.labelIcon}>🎓</span>Jenjang</label>
              <select id="filter-jenjang" value={filterJenjang} onChange={e=>setFilterJenjang(e.target.value)} className={styles.filterSelect}>
                <option>Semua Jenjang</option>
                {jenjangList.map((jenjang, idx) => (<option key={idx} value={jenjang}>{jenjang}</option>))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="filter-kecamatan" className={styles.filterLabel}><span className={styles.labelIcon}>🏘️</span>Kecamatan</label>
              <select id="filter-kecamatan" value={filterKecamatan} onChange={e=>setFilterKecamatan(e.target.value)} className={styles.filterSelect}>
                <option>Semua Kecamatan</option>
                {kecamatanList.map((kec, idx) => (<option key={idx} value={kec}>{kec}</option>))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label htmlFor="filter-desa" className={styles.filterLabel}><span className={styles.labelIcon}>🏠</span>Desa/Kelurahan</label>
              <select id="filter-desa" value={filterDesa} onChange={e=>setFilterDesa(e.target.value)} className={styles.filterSelect}>
                <option>Semua Desa</option>
                {desaList.map((desa, idx) => (<option key={idx} value={desa}>{desa}</option>))}
              </select>
            </div>
          </div>
        </section>

        <section className={styles.chartsGrid}>
          {chartData.pieDataList.map((pie, idx) => (
            <ErrorBoundary key={idx}>
              <div className={`${styles.card} ${styles.fadeInUp}`} style={{animationDelay: `${idx * 0.1}s`}}>
                <PieChartComponent title={pie.title} data={pie.data} />
              </div>
            </ErrorBoundary>
          ))}
        </section>

        <section className={styles.chartsGrid}>
          <ErrorBoundary>
            <div className={`${styles.card} ${styles.fadeInUp}`}>
              <BarChartComponent title="Statistik Kondisi Ruang Kelas" data={chartData.barKondisiKelas}
                colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]}/>
            </div>
          </ErrorBoundary>
          <ErrorBoundary>
            <div className={`${styles.card} ${styles.fadeInUp}`}>
              <BarChartComponent title="Statistik Intervensi Ruang Kelas" data={chartData.barIntervensiKelas}
                colors={["#06b6d4", "#f97316", "#8b5cf6"]}/>
            </div>
          </ErrorBoundary>
        </section>

        <section className={`${styles.card} ${styles.fadeInUp}`}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitleGroup}>
              <h2 className={styles.cardTitle}><span className={styles.cardIcon}>📊</span>Data Detail Sekolah</h2>
              <p className={styles.cardSubtitle}>Tabel lengkap {filteredData.length} data sekolah berdasarkan filter</p>
            </div>
            <div className={styles.tableActions}>
              <button className={styles.exportButton}><span className={styles.exportIcon}>📥</span>Export Data</button>
            </div>
          </div>
          <ErrorBoundary>
            <DataTable data={filteredData} onDetailClick={handleDetailClick} />
          </ErrorBoundary>
        </section>
      </main>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className={styles.pageTransition}>
        {currentView === 'main' ? renderMainView() : renderDetailView()}
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(SchoolDetailPage);
