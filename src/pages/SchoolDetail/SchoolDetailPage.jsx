// src/pages/SchoolDetail/SchoolDetailPage.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

import { useHydratedSchools } from '../../hooks/useHydratedSchools';
import { getPageFiltersFromURL, setPageFiltersToURL, DEFAULT_PAGE_FILTERS } from '../../utils/urlFilters';
import supabase from '@/services/supabaseClient';

// DETAIL API
import { getSdDetailByNpsn, getSmpDetailByNpsn, getPaudDetailByNpsn, getPkbmDetailByNpsn } from '../../services/api/detailApi';

// ============ UTIL ============
const isValidCoordinate = (lng, lat) =>
  Number.isFinite(lng) &&
  Number.isFinite(lat) &&
  lng >= -180 && lng <= 180 &&
  lat >= -90 && lat <= 90;

const CHUNK_SIZE = 200;
const PAGE_SIZE  = 1000;
const chunk = (arr, n = CHUNK_SIZE) => {
  if (!Array.isArray(arr) || !arr.length) return [];
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

// helper: ambil query param
function qp(name) {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const v = params.get(name);
  return v && String(v).trim() !== '' ? v : null;
}

// ============ ERROR BOUNDARY ============
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('SchoolDetailPage Error:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.error}>
          <div>⚠️ Terjadi kesalahan. <button className={styles.resetTableButton} onClick={() => this.setState({ hasError: false, error: null })}>Coba lagi</button></div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============ PIE CHART ============
const PieChartComponent = React.memo(({ title, data }) => {
  const [hoveredIndex, setHoveredIndex] = useState(-1);
  const safe = (data || []).map(d => ({ ...d, value: Number(d?.value || 0) }));
  const total = safe.reduce((s, i) => s + i.value, 0);
  const validData = safe.filter(i => i.value >= 0);

  if (!validData.length) {
    return (
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}><h3>{title}</h3></div>
        <div className={styles.chartEmpty}>
          <img className={styles.chartEmptyIcon} alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E" />
          Tidak ada data
        </div>
      </div>
    );
  }

  const renderCustomLabel = (entry) => {
    const pct = total ? ((entry.value / total) * 100).toFixed(1) : '0.0';
    return `${pct}%`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      const pct = total ? ((d.value / total) * 100).toFixed(1) : '0.0';
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipHeader}>
            <div className={styles.tooltipColorDot} style={{ backgroundColor: d.payload.color }} />
            <span className={styles.tooltipLabel}>{d.name}</span>
          </div>
          <div className={styles.tooltipValue}>
            {Number(d.value || 0).toLocaleString('id-ID')} ({pct}%)
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}><h3>{title}</h3></div>
      <div className={styles.chartContent}>
        <ResponsiveContainer width="100%" height={360}>
          <PieChart>
            <Pie
              data={validData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={renderCustomLabel}
              labelLine={false}
              animationBegin={0}
              animationDuration={1200}
              onMouseEnter={(_, i) => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(-1)}
            >
              {validData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.color}
                  stroke={hoveredIndex === idx ? '#fff' : 'none'}
                  strokeWidth={hoveredIndex === idx ? 3 : 0}
                  style={{ filter: hoveredIndex === idx ? 'brightness(1.1)' : 'brightness(1)', cursor: 'pointer' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '12px' }} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

// ============ BAR CHART ============
const BarChartComponent = React.memo(({ title, data, colors }) => {
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const safeData = (data || []).map(d => ({ ...d, value: Number(d?.value || 0) }));
  const hasAny = safeData.some(d => d.value > 0);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <div className={styles.tooltipHeader}><span className={styles.tooltipLabel}>{label}</span></div>
          <div className={styles.tooltipValue}>{Number(payload[0].value || 0).toLocaleString('id-ID')} unit</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}><h3>{title}</h3></div>
      {!hasAny ? (
        <div className={styles.chartEmpty}>
          <img className={styles.chartEmptyIcon} alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23E2E8F0'/%3E%3C/svg%3E" />
          Tidak ada data
        </div>
      ) : (
        <div className={styles.chartOverflow}>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={safeData}
              margin={{ top: 24, right: 30, left: 20, bottom: 60 }}
              onMouseMove={(s) => { if (s && s.activeTooltipIndex !== undefined) setHoveredIndex(s.activeTooltipIndex); }}
              onMouseLeave={() => setHoveredIndex(-1)}
              className="horizontal-bar-chart"
            >
              <defs>
                {colors.map((c, i) => (
                  <linearGradient key={i} id={`gradient-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                    <stop offset="100%" stopColor={c} stopOpacity={0.6} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" height={80} />
              <YAxis tickFormatter={(v) => Number(v || 0).toLocaleString('id-ID')} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" animationDuration={1500} animationBegin={300}>
                {safeData.map((_, i) => (
                  <Cell key={i} fill={`url(#gradient-${i % colors.length})`} stroke={colors[i % colors.length]} strokeWidth={1} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
});

// ============ DATA TABLE ============
const DataTable = React.memo(({ data, onDetailClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');

  // Log data yang diterima
  useEffect(() => {
    console.log('[DataTable] Received data:', data?.length, 'schools');
  }, [data]);

  const filteredData = useMemo(() => {
    let f = data || [];
    if (searchTerm) {
      f = f.filter(s =>
        (s.namaSekolah || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.npsn || '').toString().includes(searchTerm) ||
        (s.kecamatan || '').toLowerCase().includes(searchTerm.toLowerCase())
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

  useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage]);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableControls}>
        <div className={styles.searchContainer}>
          <div className={styles.searchIcon}>🔍</div>
          <input type="text" placeholder="Cari nama sekolah, NPSN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={styles.searchInput} />
          {searchTerm && (<button className={styles.clearSearch} onClick={() => setSearchTerm('')}>✕</button>)}
        </div>
        <div className={styles.controlGroup}>
          <label>Tampilkan:</label>
          <select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className={styles.itemsPerPageSelect}>
            <option value={5}>5</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
          </select>
          <button onClick={() => { setSearchTerm(''); setCurrentPage(1); setItemsPerPage(10); setSortField(''); setSortDirection('asc'); }} className={styles.resetTableButton}>
            Reset
          </button>
        </div>
      </div>

      <div className={styles.tableScrollContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>NO</th>
              <th className={styles.sortableHeader} onClick={() => handleSort('npsn')}>NPSN {sortField === 'npsn' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
              <th className={styles.sortableHeader} onClick={() => handleSort('namaSekolah')}>NAMA SEKOLAH {sortField === 'namaSekolah' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
              <th className={styles.sortableHeader} onClick={() => handleSort('jenjang')}>JENJANG {sortField === 'jenjang' && (sortDirection === 'asc' ? '↑' : '↓')}</th>
              <th>TIPE</th><th>DESA</th><th>KECAMATAN</th>
              <th>SISWA</th><th>KLS BAIK</th><th>R. SEDANG</th><th>R. BERAT</th>
              <th>KURANG RKB</th><th>REHAB</th><th>PEMBANGUNAN</th><th>DETAIL</th>
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
                <td><span className={styles.numberBadge}>{Number(school.student_count || 0)}</span></td>
                <td><span className={styles.conditionGood}>{Number(school.kondisiKelas?.baik || 0)}</span></td>
                <td><span className={styles.conditionModerate}>{Number(school.kondisiKelas?.rusakSedang || 0)}</span></td>
                <td><span className={styles.conditionBad}>{Number(school.kondisiKelas?.rusakBerat || 0)}</span></td>
                <td><span className={styles.numberBadge}>{Number(school.kurangRKB || 0)}</span></td>
                <td><span className={styles.numberBadge}>{Number(school.rehabRuangKelas || 0)}</span></td>
                <td><span className={styles.numberBadge}>{Number(school.pembangunanRKB || 0)}</span></td>
                <td>
                  <button
                    className={styles.detailButton}
                    onClick={() => onDetailClick && onDetailClick(school)}
                  >
                    <span className={styles.detailIcon}>👁️</span> Detail
                  </button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="15" className={styles.noDataCell}><div className={styles.chartEmpty}><img className={styles.chartEmptyIcon} alt="" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Ccircle cx='24' cy='24' r='20' fill='%23E2E8F0'/%3E%3C/svg%3E" />Tidak ada data</div></td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <div className={styles.paginationInfo}><span className={styles.pageInfo}>Menampilkan <strong>{paginatedData.length}</strong> dari <strong>{totalItems}</strong> data</span></div>
        <div className={styles.pageButtons}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className={styles.pageButton}>⏮️</button>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles.pageButton}>⬅️</button>
          <span className={styles.pageIndicator}><strong>{currentPage}</strong> / {totalPages}</span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles.pageButton}>➡️</button>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className={styles.pageButton}>⏭️</button>
        </div>
      </div>
    </div>
  );
});

// ============ MAIN ============
const SchoolDetailPage = () => {
  const [schoolData, setSchoolData] = useState([]);
  const [geoData, setGeoData] = useState({ kecamatan: null, desa: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentView, setCurrentView] = useState('main');

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const detailCache = useRef(new Map()); // cache by key

  // FILTER (bar atas)
  const [filterJenjang, setFilterJenjang] = useState(DEFAULT_PAGE_FILTERS.jenjang);
  const [filterKecamatan, setFilterKecamatan] = useState(DEFAULT_PAGE_FILTERS.kecamatan);
  const [filterDesa, setFilterDesa] = useState(DEFAULT_PAGE_FILTERS.desa);
  const [kondisiFilter, setKondisiFilter] = useState('Semua Kondisi');

  // daftar pilihan
  const [jenjangList, setJenjangList] = useState(['PAUD', 'SD', 'SMP', 'PKBM']);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [mapView] = useState({ center: [-7.21, 107.91], zoom: 11 });

  // angka rollup intervensi global
  const [intervensiSum, setIntervensiSum] = useState({ rehab_unit: 0, pembangunan_unit: 0 });

  // INIT Filters from URL
  useEffect(() => {
    const f = getPageFiltersFromURL();
    setFilterJenjang(f.jenjang || DEFAULT_PAGE_FILTERS.jenjang);
    setFilterKecamatan(f.kecamatan || DEFAULT_PAGE_FILTERS.kecamatan);
    setFilterDesa(f.desa || DEFAULT_PAGE_FILTERS.desa);
  }, []);

  // Sync filters to URL
  useEffect(() => {
    setPageFiltersToURL({ jenjang: filterJenjang, kecamatan: filterKecamatan, desa: filterDesa });
  }, [filterJenjang, filterKecamatan, filterDesa]);

  // ---------- handleDetailClick ----------
  const handleDetailClick = useCallback((school) => {
    const npsn = school?.npsn;
    const jenjang = String(school?.jenjang || school?.level || '').toUpperCase();

    if (!npsn) { alert('NPSN sekolah tidak ditemukan.'); return; }

    if (jenjang === 'PAUD') { window.location.assign(`/paud/school_detail?npsn=${encodeURIComponent(npsn)}`); return; }
    if (jenjang === 'SD')   { window.location.assign(`/sd/school_detail?npsn=${encodeURIComponent(npsn)}`);   return; }
    if (jenjang === 'SMP')  { window.location.assign(`/smp/school_detail?npsn=${encodeURIComponent(npsn)}`);  return; }
    if (jenjang === 'PKBM') { window.location.assign(`/pkbm/school_detail?npsn=${encodeURIComponent(npsn)}`); return; }

    window.location.assign(`/detail-sekolah?jenjang=${encodeURIComponent(jenjang)}&npsn=${encodeURIComponent(npsn)}`);
  }, []);

  const handleBackToMain = useCallback(() => {
    setCurrentView('main');
    setSelectedSchool(null);
    setSelectedDetail(null);
    setDetailError(null);
    setDetailLoading(false);
  }, []);

  // ---------- MASTER: kecamatan & desa ----------
  const fetchKecamatanMaster = useCallback(async () => {
    const { data, error } = await supabase
      .from('kecamatan')
      .select('name')
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map(d => d.name).filter(Boolean);
  }, []);

  const fetchAllDesaDistinct = useCallback(async () => {
    // Ambil distinct village seluruh schools (tidak terpengaruh filter)
    // Note: tidak gunakan head:true agar kompatibel di semua setup
    const { data, error } = await supabase
      .from('schools')
      .select('village')
      .not('village', 'is', null);
    if (error) throw error;
    return [...new Set((data || []).map(r => r.village).filter(Boolean))].sort();
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [kList, dList] = await Promise.all([fetchKecamatanMaster(), fetchAllDesaDistinct()]);
        if (!alive) return;
        setKecamatanList(kList);
        setDesaList(dList);
      } catch (e) {
        console.warn('Gagal load master kec/desa:', e);
      }
    })();
    return () => { alive = false; };
  }, [fetchKecamatanMaster, fetchAllDesaDistinct]);

  // ---------- FETCH: schools (pagination aman) ----------
  const fetchSchoolsByFilters = useCallback(async ({ levelValue, kecamatanValue, villageValue }) => {
    console.log('[fetchSchoolsByFilters] Starting fetch with filters:', { levelValue, kecamatanValue, villageValue });
    
    // STRATEGI BARU: Ambil semua data tanpa pagination dulu untuk cek total
    const { count: totalCount, error: countError } = await supabase
      .from('schools')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('[fetchSchoolsByFilters] Count error:', countError);
    } else {
      console.log('[fetchSchoolsByFilters] Total rows in database:', totalCount);
    }

    const base = () => {
      let q = supabase
        .from('schools')
        .select('id,npsn,name,jenjang,level,kecamatan,village,lat,lng,updated_at,student_count,type', { count: 'exact' })
        .order('id', { ascending: true });
      
      // PERBAIKAN: Hanya tambahkan filter jika ada nilai yang valid
      if (levelValue)     q = q.or(`jenjang.eq.${levelValue},level.eq.${levelValue}`);
      if (kecamatanValue) q = q.eq('kecamatan', kecamatanValue);
      if (villageValue)   q = q.eq('village', villageValue);
      
      return q;
    };

    const out = [];
    let currentOffset = 0;
    let iteration = 0;
    const maxIterations = 20;

    while (iteration < maxIterations) {
      const fromIndex = currentOffset;
      const toIndex = currentOffset + PAGE_SIZE - 1;
      
      console.log(`[fetchSchoolsByFilters] Iteration ${iteration + 1}: Fetching range [${fromIndex}, ${toIndex}]`);
      
      const { data, error, count } = await base().range(fromIndex, toIndex);
      
      if (error) {
        console.error('[fetchSchoolsByFilters] Error:', error);
        throw error;
      }
      
      const rows = data || [];
      console.log(`[fetchSchoolsByFilters] Iteration ${iteration + 1}: Received ${rows.length} rows, Total count from query: ${count}`);
      
      if (rows.length === 0) {
        console.log('[fetchSchoolsByFilters] No more data, breaking loop');
        break;
      }
      
      out.push(...rows);
      
      // Jika jumlah rows kurang dari PAGE_SIZE, artinya ini batch terakhir
      if (rows.length < PAGE_SIZE) {
        console.log('[fetchSchoolsByFilters] Last batch received, breaking loop');
        break;
      }
      
      // Update offset untuk iterasi berikutnya
      currentOffset += rows.length;
      iteration++;
      
      // Jika sudah mencapai count dari database, stop
      if (count && out.length >= count) {
        console.log('[fetchSchoolsByFilters] Reached total count, breaking loop');
        break;
      }
    }

    if (iteration >= maxIterations) {
      console.warn(`[fetchSchoolsByFilters] Reached max iterations (${maxIterations})`);
    }

    console.log(`[fetchSchoolsByFilters] Total fetched: ${out.length} schools in ${iteration + 1} iterations`);

    const mapped = out.map((s) => {
      const lng = Number(s?.lng);
      const lat = Number(s?.lat);

      // normalisasi jenjang -> 4 fixed
      let jenjangNorm = (s?.jenjang ?? s?.level ?? '').toString().trim().toUpperCase();
      if (!['PAUD', 'SD', 'SMP', 'PKBM'].includes(jenjangNorm)) {
        const raw = jenjangNorm;
        if (['TK','KB','SPS','SPS/KB','TAMAN KANAK','KELOMPOK BERMAIN'].some(x => raw.includes(x))) jenjangNorm = 'PAUD';
      }

      return {
        ...s,
        jenjang: jenjangNorm || null,
        desa: s?.village ?? null,
        tipeSekolah: s?.type || '-',
        student_count: Number(s?.student_count || 0),
        coordinates: (isValidCoordinate(lng, lat) ? [lng, lat] : null),
        namaSekolah: s?.name || null,
      };
    });

    console.log(`[fetchSchoolsByFilters] After mapping: ${mapped.length} schools`);
    
    // Warning jika kurang dari expected
    if (!levelValue && !kecamatanValue && !villageValue) {
      if (mapped.length < 4842) {
        console.warn(`[fetchSchoolsByFilters] ⚠️ KURANG DATA: Hanya ${mapped.length} dari 4842 expected`);
        console.warn(`[fetchSchoolsByFilters] Database total: ${totalCount}, Fetched: ${out.length}, Mapped: ${mapped.length}`);
      } else {
        console.log(`[fetchSchoolsByFilters] ✅ Berhasil fetch semua ${mapped.length} sekolah`);
      }
    }

    return mapped;
  }, []);

  // ---------- FETCH: kegiatan (list) ----------
  const fetchKegiatan = useCallback(async (ids) => {
    if (!ids?.length) return [];
    const res = await Promise.all(
      chunk(ids).map(async (c) => {
        const { data, error } = await supabase
          .from('kegiatan')
          .select('id,school_id,kegiatan,lokal,created_at,updated_at')
          .in('school_id', c);
        if (error) throw error;
        return data || [];
      })
    );
    return res.flat();
  }, []);

  // ---------- FETCH: class_conditions (list) ----------
  const fetchClassConditions = useCallback(async (ids) => {
    if (!ids?.length) return [];
    const res = await Promise.all(
      chunk(ids).map(async (c) => {
        const { data, error } = await supabase
          .from('class_conditions')
          .select(`
            id,
            school_id,
            classrooms_good,
            classrooms_moderate_damage,
            classrooms_heavy_damage,
            total_room,
            lacking_rkb,
            total_mh,
            updated_at
          `)
          .in('school_id', c);
        if (error) throw error;
        return data || [];
      })
    );
    return res.flat();
  }, []);

  // ---------- FETCH: intervensi rollup (global) ----------
  const fetchIntervensiRollup = useCallback(async () => {
    const { data, error } = await supabase
      .from('v_intervensi_rollup')
      .select('rehab_unit,pembangunan_unit')
      .single();
    if (error) throw error;
    return data || { rehab_unit: 0, pembangunan_unit: 0 };
  }, []);

  // ---------- MERGE LIST ----------
  const mergeDataset = useCallback((schools, kegiatan, classConds) => {
    const kegBySid = new Map();
    const intervensiFlag = new Map();
    for (const k of (kegiatan || [])) {
      if (!kegBySid.has(k.school_id)) kegBySid.set(k.school_id, []);
      kegBySid.get(k.school_id).push(k);

      const prev = intervensiFlag.get(k.school_id) || { rehab: 0, pembangunan: 0 };
      const jenis = String(k.kegiatan || '').toLowerCase();
      if (jenis === 'rehab') prev.rehab = 1;
      if (jenis === 'pembangunan') prev.pembangunan = 1;
      intervensiFlag.set(k.school_id, prev);
    }

    const ccBySid = new Map();
    for (const c of (classConds || [])) ccBySid.set(c.school_id, c);

    return (schools || []).map((s) => {
      const cc = ccBySid.get(s.id) || null;
      const inter = intervensiFlag.get(s.id) || { rehab: 0, pembangunan: 0 };

      return {
        ...s,
        kondisiKelas: {
          baik: Number(cc?.classrooms_good || 0),
          rusakSedang: Number(cc?.classrooms_moderate_damage || 0),
          rusakBerat: Number(cc?.classrooms_heavy_damage || 0),
        },
        kurangRKB: Number(cc?.lacking_rkb || 0),
        rehabRuangKelas: Number(inter.rehab || 0),
        pembangunanRKB: Number(inter.pembangunan || 0),
        kegiatan: kegBySid.get(s.id) || [],
        class_conditions: cc,
      };
    });
  }, []);

  // ---------- DETAIL FETCH ----------
  const fetchSchoolDetail = useCallback(async (schoolId) => {
    const { data, error } = await supabase
      .from('schools')
      .select(`
        id, npsn, name, address, village, kecamatan, type, level,
        st_male, st_female, student_count,
        lat, lng, updated_at, created_at, jenjang, jenjang2,
        class_conditions (*),
        kegiatan (*),
        rombel (*),
        toilets (*),
        furniture (*),
        furniture_computer (*),
        teacher_room (*),
        laboratory (*),
        library (*),
        official_residences (*),
        ape (*),
        uks (*),
        playground_area (*),
        building_status (*)
      `)
      .eq('id', schoolId)
      .single();

    if (error) throw error;

    const cc = (data?.class_conditions?.[0]) || data?.class_conditions || null;
    const mergedDetail = {
      ...data,
      namaSekolah: data?.name,
      desa: data?.village,
      koordinat: (isValidCoordinate(Number(data?.lng), Number(data?.lat)) ? [Number(data.lng), Number(data.lat)] : null),
      kondisiKelas: {
        baik: Number(cc?.classrooms_good || 0),
        rusakSedang: Number(cc?.classrooms_moderate_damage || 0),
        rusakBerat: Number(cc?.classrooms_heavy_damage || 0),
        total: Number(cc?.total_room || 0),
        kurangRKB: Number(cc?.lacking_rkb || 0),
      },
      rombel: data?.rombel,
      toilets: data?.toilets,
      furniture: data?.furniture,
      furniture_computer: data?.furniture_computer,
      teacher_room: data?.teacher_room,
      laboratory: data?.laboratory,
      library: data?.library,
      official_residences: data?.official_residences,
      ape: data?.ape,
      uks: data?.uks,
      playground_area: data?.playground_area,
      building_status: data?.building_status,
      kegiatan: data?.kegiatan,
    };

    return mergedDetail;
  }, []);

  // ---------- GEOJSON ----------
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
      } catch { /* noop */ }
    })();
    return () => { alive = false; };
  }, []);

  // ---------- LOAD LIST DATA ----------
  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);

    const levelValue     = (filterJenjang && filterJenjang !== 'Semua Jenjang') ? filterJenjang : null;
    const kecamatanValue = (filterKecamatan && filterKecamatan !== 'Semua Kecamatan') ? filterKecamatan : null;
    const villageValue   = (filterDesa && filterDesa !== 'Semua Desa') ? filterDesa : null;

    (async () => {
      try {
        const schools = await fetchSchoolsByFilters({ levelValue, kecamatanValue, villageValue });
        if (!alive) return;

        if (!schools.length) {
          setSchoolData([]); setIntervensiSum({ rehab_unit: 0, pembangunan_unit: 0 }); setLoading(false);
          return;
        }

        const ids = schools.map(s => s.id);
        const [keg, cc, roll] = await Promise.all([ fetchKegiatan(ids), fetchClassConditions(ids), fetchIntervensiRollup() ]);
        if (!alive) return;

        const merged = mergeDataset(schools, keg, cc);

        setSchoolData(merged);
        setIntervensiSum(roll);

        // PAKSA 4 JENJANG
        setJenjangList(['PAUD','SD','SMP','PKBM']);
      } catch (e) {
        console.error('[SchoolDetailPage] load error:', e);
        if (!alive) return;
        setError(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [filterJenjang, filterKecamatan, filterDesa, fetchSchoolsByFilters, fetchKegiatan, fetchClassConditions, fetchIntervensiRollup, mergeDataset]);

  // ---------- Hydration (untuk detail), mapData pakai schoolData ----------
  const hydratedSchools = useHydratedSchools(schoolData);

  // ---------- Filter (chart & tabel) ----------
  const filteredData = useMemo(() => {
    let data = [...schoolData];
    
    console.log('[filteredData] Starting with:', data.length, 'schools');
    console.log('[filteredData] Filters:', { filterJenjang, filterKecamatan, filterDesa, kondisiFilter });
    
    if (filterJenjang !== 'Semua Jenjang') {
      const before = data.length;
      data = data.filter(d => d.jenjang === filterJenjang);
      console.log(`[filteredData] After jenjang filter (${filterJenjang}):`, data.length, '(removed', before - data.length, ')');
    }
    
    if (filterKecamatan !== 'Semua Kecamatan') {
      const before = data.length;
      data = data.filter(d => d.kecamatan === filterKecamatan);
      console.log(`[filteredData] After kecamatan filter (${filterKecamatan}):`, data.length, '(removed', before - data.length, ')');
    }
    
    if (filterDesa !== 'Semua Desa') {
      const before = data.length;
      data = data.filter(d => d.desa === filterDesa);
      console.log(`[filteredData] After desa filter (${filterDesa}):`, data.length, '(removed', before - data.length, ')');
    }

    if (kondisiFilter !== 'Semua Kondisi') {
      const before = data.length;
      if (kondisiFilter === 'Baik') data = data.filter(d => Number(d?.kondisiKelas?.baik || 0) > 0);
      if (kondisiFilter === 'Rusak Sedang') data = data.filter(d => Number(d?.kondisiKelas?.rusakSedang || 0) > 0);
      if (kondisiFilter === 'Rusak Berat') data = data.filter(d => Number(d?.kondisiKelas?.rusakBerat || 0) > 0);
      if (kondisiFilter === 'Kurang RKB') data = data.filter(d => Number(d?.kurangRKB || 0) > 0);
      console.log(`[filteredData] After kondisi filter (${kondisiFilter}):`, data.length, '(removed', before - data.length, ')');
    }
    
    console.log('[filteredData] Final result:', data.length, 'schools');
    
    // Log distribusi jenjang untuk debugging
    const jenjangCount = {};
    schoolData.forEach(s => {
      const j = s.jenjang || 'NULL';
      jenjangCount[j] = (jenjangCount[j] || 0) + 1;
    });
    console.log('[filteredData] Jenjang distribution in schoolData:', jenjangCount);
    
    return data;
  }, [schoolData, filterJenjang, filterKecamatan, filterDesa, kondisiFilter]);

  // ---------- Data MAP ----------
  const mapData = useMemo(() => {
    let data = [...schoolData];
    
    console.log('[mapData] Starting with:', data.length, 'schools');
    
    if (filterJenjang   !== 'Semua Jenjang')   data = data.filter(d => d.jenjang   === filterJenjang);
    if (filterKecamatan !== 'Semua Kecamatan') data = data.filter(d => d.kecamatan === filterKecamatan);
    if (filterDesa      !== 'Semua Desa')      data = data.filter(d => d.desa      === filterDesa);

    if (kondisiFilter !== 'Semua Kondisi') {
      if (kondisiFilter === 'Baik') data = data.filter(d => Number(d?.kondisiKelas?.baik || 0) > 0);
      if (kondisiFilter === 'Rusak Sedang') data = data.filter(d => Number(d?.kondisiKelas?.rusakSedang || 0) > 0);
      if (kondisiFilter === 'Rusak Berat') data = data.filter(d => Number(d?.kondisiKelas?.rusakBerat || 0) > 0);
      if (kondisiFilter === 'Kurang RKB') data = data.filter(d => Number(d?.kurangRKB || 0) > 0);
    }

    const beforeCoordFilter = data.length;
    const validCoords = data.filter(s =>
      Array.isArray(s.coordinates) && s.coordinates.length === 2 &&
      !Number.isNaN(+s.coordinates[0]) && !Number.isNaN(+s.coordinates[1])
    );
    
    const invalidCoords = beforeCoordFilter - validCoords.length;
    console.log(`[mapData] After coordinate filter: ${validCoords.length} valid (removed ${invalidCoords} with invalid coordinates)`);
    
    if (invalidCoords > 0) {
      console.log(`[mapData] ⚠️ ${invalidCoords} sekolah tidak memiliki koordinat valid dan tidak ditampilkan di peta`);
    }

    return validCoords;
  }, [schoolData, filterJenjang, filterKecamatan, filterDesa, kondisiFilter]);

  // ---------- Hitung data chart ----------
  const { chartData } = useMemo(() => {
    let unitBaik = 0, unitRusakSedang = 0, unitRusakBerat = 0;
    let totalKurangRKB = 0;

    filteredData.forEach(school => {
      unitBaik          += Number(school?.kondisiKelas?.baik || 0);
      unitRusakSedang   += Number(school?.kondisiKelas?.rusakSedang || 0);
      unitRusakBerat    += Number(school?.kondisiKelas?.rusakBerat || 0);
      totalKurangRKB    += Number(school?.kurangRKB || 0);
    });

    const rehabSekolahCount       = Number(intervensiSum?.rehab_unit || 0);
    const pembangunanSekolahCount = Number(intervensiSum?.pembangunan_unit || 0);

    const totalUnitKelas = unitBaik + unitRusakSedang + unitRusakBerat;
    const belumDirehab   = Math.max(0, unitRusakBerat - rehabSekolahCount);
    const belumDibangun  = Math.max(0, totalKurangRKB - pembangunanSekolahCount);
    const totalIntervensi = rehabSekolahCount + pembangunanSekolahCount;

    return {
      chartData: {
        pieDataList: [
          {
            title: "Kondisi Ruang Kelas",
            data: [
              { name: "Baik",         value: unitBaik,        color: "#16A34A" },
              { name: "Rusak Sedang", value: unitRusakSedang, color: "#F59E0B" },
              { name: "Rusak Berat",  value: unitRusakBerat,  color: "#DC2626" },
            ]
          },
          {
            title: "Rehabilitasi Ruang Kelas",
            data: [
              { name: "Rehab",       value: rehabSekolahCount, color: "#0EA5E9" },
              { name: "Belum Rehab", value: belumDirehab,      color: "#F59E0B" },
            ]
          },
          {
            title: "Intervensi Ruang Kelas",
            data: [
              { name: "Pembangunan dilakukan", value: pembangunanSekolahCount, color: "#8b5cf6" },
              { name: "Kebutuhan RKB",         value: belumDibangun,           color: "#F2B705" },
            ]
          },
        ],
        barKondisiKelas: [
          { name: "Total Kelas",    value: totalUnitKelas },
          { name: "Kondisi baik",   value: unitBaik },
          { name: "Rusak Sedang",   value: unitRusakSedang },
          { name: "Rusak Berat",    value: unitRusakBerat },
          { name: "Kurang RKB",     value: totalKurangRKB },
        ],
        barIntervensiKelas: [
          { name: "Total Intervensi",   value: totalIntervensi },
          { name: "Pembangunan RKB",    value: pembangunanSekolahCount },
          { name: "Rehab Ruang Kelas",  value: rehabSekolahCount },
        ],
      }
    };
  }, [filteredData, intervensiSum]);

  const handleResetAllFilters = useCallback(() => {
    setFilterJenjang('Semua Jenjang');
    setFilterKecamatan('Semua Kecamatan');
    setFilterDesa('Semua Desa');
    setKondisiFilter('Semua Kondisi');
  }, []);

  // ---------- LOAD DETAIL SAAT MASUK DETAIL ----------
  useEffect(() => {
    const run = async () => {
      if (currentView !== 'detail' || !selectedSchool) return;
      setDetailError(null);

      const jenjang = String(selectedSchool?.jenjang || selectedSchool?.level || '').toUpperCase();
      const cacheKey = `${jenjang}:${selectedSchool?.npsn || selectedSchool?.id}`;
      if (detailCache.current.has(cacheKey)) {
        setSelectedDetail(detailCache.current.get(cacheKey));
        return;
      }

      setDetailLoading(true);
      try {
        let detail;
        const npsn = selectedSchool.npsn;

        if (jenjang === 'SD')       detail = await getSdDetailByNpsn(npsn);
        else if (jenjang === 'SMP') detail = await getSmpDetailByNpsn(npsn);
        else if (jenjang === 'PAUD')detail = await getPaudDetailByNpsn(npsn);
        else if (jenjang === 'PKBM')detail = await getPkbmDetailByNpsn(npsn);
        else                        detail = await fetchSchoolDetail(selectedSchool.id);

        if (!detail) throw new Error('Detail sekolah tidak ditemukan.');

        const hydratedBasic = hydratedSchools.find(h => h.id === selectedSchool.id) || selectedSchool;

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
        console.error('[SchoolDetailPage] fetch detail error:', e);
        setDetailError(e?.message || String(e));
      } finally {
        setDetailLoading(false);
      }
    };
    run();
  }, [currentView, selectedSchool, hydratedSchools, fetchSchoolDetail]);

  // ---------- AUTO-OPEN dari URL ----------
  useEffect(() => {
    const qJenjang = qp('jenjang');
    if (qJenjang && qJenjang !== filterJenjang) setFilterJenjang(qJenjang);
  }, [filterJenjang]);

  useEffect(() => {
    const qNpsn = qp('npsn');
    if (!qNpsn || !schoolData.length) return;
    const target = schoolData.find(s => String(s.npsn) === String(qNpsn));
    if (target) { setSelectedSchool(target); setCurrentView('detail'); }
  }, [schoolData]);

  // ---------- RENDER ----------
  if (loading) return <div className={styles.loading}>Memuat Data Sekolah…</div>;
  if (error)   return <div className={styles.error}>⚠️ {error}</div>;

  const renderDetailView = () => {
    if (detailLoading) return <div className={styles.loading}>Memuat Detail Sekolah…</div>;
    if (detailError) {
      return (
        <div className={styles.error}>
          <div>⚠️ {detailError}</div>
          <div style={{ marginTop: 8 }}>
            <button className={styles.resetTableButton} onClick={() => detailCache.current.delete(selectedSchool?.id) || setSelectedDetail(null)}>🔁 Coba Lagi</button>{' '}
            <button className={styles.resetTableButton} onClick={handleBackToMain}>⬅️ Kembali</button>
          </div>
        </div>
      );
    }
    const detailObj = selectedDetail;
    if (!detailObj) return null;

    let DetailComponent;
    switch (detailObj.jenjang) {
      case 'PAUD': DetailComponent = SchoolDetailPaud; break;
      case 'SD':   DetailComponent = SchoolDetailSd;   break;
      case 'SMP':  DetailComponent = SchoolDetailSmp;  break;
      case 'PKBM': DetailComponent = SchoolDetailPkbm; break;
      default:     return (<div className={styles.error}>Detail tidak tersedia untuk jenjang ini.</div>);
    }
    return <DetailComponent schoolData={detailObj} onBack={handleBackToMain} />;
  };

  const renderMainView = () => (
    <div className={styles.dashboard}>
      <header className={styles.dashboardHeader}>
        <h1>Detail Peta Sekolah</h1>
        <div style={{ fontSize: '14px', color: '#666', marginTop: '8px' }}>
          Total: {schoolData.length} sekolah • Filtered: {filteredData.length} sekolah • Map: {mapData.length} sekolah
        </div>
      </header>

      {/* FILTER BAR (ATAS) */}
      <section className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>🗺️ Peta Sebaran Sekolah</h2>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Jenjang</label>
              <select
                value={filterJenjang}
                onChange={e => setFilterJenjang(e.target.value)}
              >
                <option>Semua Jenjang</option>
                {jenjangList.map((jenjang, idx) => (
                  <option key={idx} value={jenjang}>{jenjang}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Kecamatan</label>
              <select
                value={filterKecamatan}
                onChange={e => setFilterKecamatan(e.target.value)}
              >
                <option>Semua Kecamatan</option>
                {kecamatanList.map((kec, idx) => (
                  <option key={idx} value={kec}>{kec}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Desa/Kelurahan</label>
              <select
                value={filterDesa}
                onChange={e => setFilterDesa(e.target.value)}
              >
                <option>Semua Desa</option>
                {desaList.map((desa, idx) => (
                  <option key={idx} value={desa}>{desa}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label>Kondisi</label>
              <select
                value={kondisiFilter}
                onChange={e => setKondisiFilter(e.target.value)}
              >
                <option>Semua Kondisi</option>
                <option>Baik</option>
                <option>Rusak Sedang</option>
                <option>Rusak Berat</option>
                <option>Kurang RKB</option>
              </select>
            </div>

            <button onClick={handleResetAllFilters} className={styles.resetTableButton}>
              🔄 Reset Filter
            </button>
          </div>
        </div>

        <div className={styles.chartContent}>
          <div className={styles.mapWrapper} style={{ position: 'relative', height: 520 }}>
            <ErrorBoundary>
              <SimpleMap
                schools={mapData}
                geoData={geoData}
                initialCenter={mapView.center}
                initialZoom={mapView.zoom}
                totalSchools={schoolData.length}
                totalKecamatan={kecamatanList.length}
              />
            </ErrorBoundary>
          </div>
        </div>
      </section>

      {/* PIE CHARTS */}
      <section className={styles.chartsContainer}>
        {chartData.pieDataList.map((pie, idx) => (
          <ErrorBoundary key={idx}>
            <div className={styles.chartCard}>
              <PieChartComponent title={pie.title} data={pie.data} />
            </div>
          </ErrorBoundary>
        ))}
      </section>

      {/* BAR CHARTS */}
      <section className={styles.chartsContainer}>
        <ErrorBoundary>
          <div className={styles.chartCard}>
            <BarChartComponent
              title="Statistik Kondisi Ruang Kelas"
              data={chartData.barKondisiKelas}
              colors={["#3b82f6", "#16A34A", "#F59E0B", "#DC2626", "#8b5cf6"]}
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

      {/* TABLE */}
      <section className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>📊 Data Detail Sekolah</h2>
        </div>
        <div className={styles.chartContent}>
          <ErrorBoundary>
            <DataTable data={filteredData} onDetailClick={handleDetailClick} />
          </ErrorBoundary>
        </div>
      </section>
    </div>
  );

  return (
    <ErrorBoundary>
      <div>
        {currentView === 'main' ? renderMainView() : renderDetailView()}
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(SchoolDetailPage);