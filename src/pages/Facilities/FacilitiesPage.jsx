import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    PieChart, Pie, Cell, Tooltip, Legend, LabelList
} from 'recharts';
import styles from './FacilitiesPage.module.css';
// Import komponen detail per jenjang
import SchoolDetailPaud from '../../components/schools/SchoolDetail/Paud/SchoolDetailPaud';
import SchoolDetailSd from '../../components/schools/SchoolDetail/Sd/SchoolDetailSd';
import SchoolDetailSmp from '../../components/schools/SchoolDetail/Smp/SchoolDetailSmp';
import SchoolDetailPkbm from '../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm';

///////////////////////////////////////////////////////////////
// === DataTable (disalin dari SchoolDetailPage.jsx, tanpa ubahan)
///////////////////////////////////////////////////////////////
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
///////////////////////////////////////////////////////////////

const FacilitiesPage = () => {
    const [currentView, setCurrentView] = useState('main');
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Enhanced states (tetap ada agar bagian lain tidak berubah)
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [searchType, setSearchType] = useState('semua');
    const [advancedSearch, setAdvancedSearch] = useState(false);
    const [searchFilters, setSearchFilters] = useState({
        npsn: '',
        nama: '',
        jenjang: ''
    });
    
    // Filter states
    const [selectedJenjang, setSelectedJenjang] = useState('Semua Jenjang');
    const [selectedKecamatan, setSelectedKecamatan] = useState('Semua Kecamatan');
    const [selectedDesa, setSelectedDesa] = useState('Semua Desa');
    
    // Data states
    const [schoolData, setSchoolData] = useState([]);
    const [kegiatanData, setKegiatanData] = useState([]);
    const [filteredSchoolData, setFilteredSchoolData] = useState([]);
    const [kecamatanOptions, setKecamatanOptions] = useState([]);
    const [desaOptions, setDesaOptions] = useState([]);
    
    // Chart data states
    const [kondisiPieData, setKondisiPieData] = useState([]);
    const [rehabilitasiPieData, setRehabilitasiPieData] = useState([]);
    const [pembangunanPieData, setPembangunanPieData] = useState([]);
    const [kondisiToiletData, setKondisiToiletData] = useState([]);
    const [intervensiToiletData, setIntervensiToiletData] = useState([]);

    // Fungsi untuk mengambil data dengan fallback
    const fetchWithFallback = async (localPath) => {
        const response = await fetch(localPath);
        if (!response.ok) throw new Error(`Fetch failed for ${localPath}`);
        return response.json();
    };

    // Fungsi untuk menormalkan data sekolah menjadi satu format yang konsisten
    const normalizeSchoolData = (school) => {
        let toiletBaik = 0, toiletRusakSedang = 0, toiletRusakBerat = 0;
        let tipe = school.type || school.status || 'Tidak Diketahui';
        if (school.jenjang === 'PAUD' || school.jenjang === 'PKBM') {
            tipe = 'Swasta';
        }

        if (school.jenjang === 'SMP') {
            const { teachers_toilet = {}, students_toilet = {} } = school;
            const tMale = teachers_toilet.male || {}; const tFemale = teachers_toilet.female || {};
            const sMale = students_toilet.male || {}; const sFemale = students_toilet.female || {};
            toiletBaik = (parseInt(tMale.good, 10) || 0) + (parseInt(tFemale.good, 10) || 0) + (parseInt(sMale.good, 10) || 0) + (parseInt(sFemale.good, 10) || 0);
            toiletRusakSedang = (parseInt(tMale.moderate_damage, 10) || 0) + (parseInt(tFemale.moderate_damage, 10) || 0) + (parseInt(sMale.moderate_damage, 10) || 0) + (parseInt(sFemale.moderate_damage, 10) || 0);
            toiletRusakBerat = (parseInt(tMale.heavy_damage, 10) || 0) + (parseInt(tFemale.heavy_damage, 10) || 0) + (parseInt(sMale.heavy_damage, 10) || 0) + (parseInt(sFemale.heavy_damage, 10) || 0);
        } else {
            const { toilets = {} } = school;
            toiletBaik = parseInt(toilets.good, 10) || 0;
            toiletRusakSedang = parseInt(toilets.moderate_damage, 10) || 0;
            toiletRusakBerat = parseInt(toilets.heavy_damage, 10) || 0;
        }
        return {
            npsn: String(school.npsn), nama: school.name, jenjang: school.jenjang, tipe, desa: school.village, kecamatan: school.kecamatan,
            toiletBaik, toiletRusakSedang, toiletRusakBerat, totalToilet: toiletBaik + toiletRusakSedang + toiletRusakBerat,
            originalData: school
        };
    };

    // Enhanced search function
    const performSearch = (data) => {
        if (!advancedSearch) {
            if (!searchQuery.trim()) return data;
            const query = searchQuery.toLowerCase().trim();
            return data.filter(school => {
                if (searchType === 'semua') {
                    return (
                        school.nama?.toLowerCase().includes(query) ||
                        school.npsn?.toLowerCase().includes(query) ||
                        school.jenjang?.toLowerCase().includes(query)
                    );
                } else if (searchType === 'npsn') {
                    return school.npsn?.toLowerCase().includes(query);
                } else if (searchType === 'nama') {
                    return school.nama?.toLowerCase().includes(query);
                } else if (searchType === 'jenjang') {
                    return school.jenjang?.toLowerCase().includes(query);
                }
                return false;
            });
        } else {
            return data.filter(school => {
                const matchNpsn = !searchFilters.npsn.trim() || 
                    school.npsn?.toLowerCase().includes(searchFilters.npsn.toLowerCase().trim());
                const matchNama = !searchFilters.nama.trim() || 
                    school.nama?.toLowerCase().includes(searchFilters.nama.toLowerCase().trim());
                const matchJenjang = !searchFilters.jenjang.trim() || 
                    school.jenjang?.toLowerCase().includes(searchFilters.jenjang.toLowerCase().trim());
                
                return matchNpsn && matchNama && matchJenjang;
            });
        }
    };

    // Data initialization
    useEffect(() => {
        const initializeData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [ 
                    paud, sd, smp, pkbm,
                    kegiatanPaud, kegiatanSd, kegiatanSmp, kegiatanPkbm
                ] = await Promise.all([
                    fetchWithFallback('/data/paud.json'),
                    fetchWithFallback('/data/sd_new.json'),
                    fetchWithFallback('/data/smp.json'),
                    fetchWithFallback('/data/pkbm.json'),
                    fetchWithFallback('/data/data_kegiatan_paud.json'),
                    fetchWithFallback('/data/data_kegiatan_sd.json'),
                    fetchWithFallback('/data/data_kegiatan_smp.json'),
                    fetchWithFallback('/data/data_kegiatan_pkbm.json')
                ]);
                
                const allRawData = [
                    ...Object.values(paud || {}).flat().map(s => ({ ...s, jenjang: 'PAUD', kecamatan: Object.keys(paud).find(k => paud[k].includes(s)) })),
                    ...Object.values(sd || {}).flat().map(s => ({ ...s, jenjang: 'SD', kecamatan: Object.keys(sd).find(k => sd[k].includes(s)) })),
                    ...Object.values(smp || {}).flat().map(s => ({ ...s, jenjang: 'SMP', kecamatan: Object.keys(smp).find(k => smp[k].includes(s)) })),
                    ...Object.values(pkbm || {}).flat().map(s => ({ ...s, jenjang: 'PKBM', kecamatan: Object.keys(pkbm).find(k => pkbm[k].includes(s)) }))
                ];

                const allKegiatanData = [
                    ...kegiatanPaud,
                    ...kegiatanSd,
                    ...kegiatanSmp,
                    ...kegiatanPkbm
                ]
                
                const allProcessedData = allRawData.map(normalizeSchoolData);
                setSchoolData(allProcessedData);
                setKegiatanData(allKegiatanData);
                
                const uniqueKecamatan = [...new Set(allProcessedData.map(s => s.kecamatan).filter(Boolean))].sort();
                const uniqueDesa = [...new Set(allProcessedData.map(s => s.desa).filter(Boolean))].sort();
                setKecamatanOptions(uniqueKecamatan);
                setDesaOptions(uniqueDesa);

            } catch (error) {
                setError(`Failed to load data: ${error.message}`);
            } finally {
                setLoading(false);
            }
        };
        initializeData();
    }, []);

    // Enhanced filter effect with search integration
    useEffect(() => {
        if (schoolData.length === 0) return;
        let filtered = schoolData;
        
        // Apply dropdown filters first
        if (selectedJenjang !== 'Semua Jenjang') filtered = filtered.filter(s => s.jenjang === selectedJenjang);
        if (selectedKecamatan !== 'Semua Kecamatan') filtered = filtered.filter(s => s.kecamatan === selectedKecamatan);
        if (selectedDesa !== 'Semua Desa') filtered = filtered.filter(s => s.desa === selectedDesa);
        
        // Apply search filters
        filtered = performSearch(filtered);
        
        setFilteredSchoolData(filtered);
        generateChartData(filtered, schoolData, kegiatanData);
        setCurrentPage(1); // Reset to first page when filtering
    }, [schoolData, kegiatanData, selectedJenjang, selectedKecamatan, selectedDesa, searchQuery, searchType, searchFilters, advancedSearch]);
    
    const resetAllFilters = () => {
        setSelectedJenjang('Semua Jenjang');
        setSelectedKecamatan('Semua Kecamatan');
        setSelectedDesa('Semua Desa');
        setSearchQuery('');
        setSearchFilters({ npsn: '', nama: '', jenjang: '' });
        setSearchType('semua');
        setAdvancedSearch(false);
        setSortConfig({ key: null, direction: 'asc' });
        setCurrentPage(1);
    };

    // Custom chart components
    const renderLabelInside = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, actualCount }) => {
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
            const { name, actualCount, percent } = data.payload;
            if (percent === undefined) return null;
            return (
                <div className={styles.customTooltip}>
                    <div className={styles.tooltipContent}>
                        <span className={styles.tooltipLabel}>{name}</span>
                        <span className={styles.tooltipValue}>{actualCount} unit ({percent.toFixed(1)}%)</span>
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
                        <span className={styles.tooltipValue}>{payload[0].value} unit</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Generate chart data function
    const generateChartData = (data, allSchoolData, allKegiatanData) => {
        const pembangunanDilakukan = allKegiatanData.filter(k => k.Kegiatan === 'Pembangunan Toilet').length;
        const rehabDilakukan = allKegiatanData.filter(k => k.Kegiatan === 'Rehab Toilet' || k.Kegiatan === 'Rehab Ruang Toilet').length;

        const sekolahTanpaToilet = allSchoolData.filter(s => s.totalToilet === 0).length;
        const kebutuhanRehabilitasi = allSchoolData.filter(s => s.toiletRusakBerat > 0).length;
        
        const rekap = {
            sekolah_tanpa_toilet: sekolahTanpaToilet,
            pembangunan_dilakukan: pembangunanDilakukan,
            kebutuhan_rehabilitasi: kebutuhanRehabilitasi,
            rehab_dilakukan: rehabDilakukan,
            intervensi_pembangunan: pembangunanDilakukan,
            intervensi_rehab: rehabDilakukan,
        };
        
        const kebutuhan_belum_dibangun = rekap.sekolah_tanpa_toilet - rekap.pembangunan_dilakukan;

        const pieDataMapper = (d) => ({...d, actualCount: d.value});

        const totalPembangunan = rekap.sekolah_tanpa_toilet;
        setPembangunanPieData([
            { name: 'Kebutuhan Toilet (Belum dibangun)', value: kebutuhan_belum_dibangun, percent: (kebutuhan_belum_dibangun/totalPembangunan)*100, color: '#FF6B6B' },
            { name: 'Pembangunan dilakukan', value: rekap.pembangunan_dilakukan, percent: (rekap.pembangunan_dilakukan/totalPembangunan)*100, color: '#4ECDC4' }
        ].map(pieDataMapper));

        const totalRehabilitasi = rekap.kebutuhan_rehabilitasi + rekap.rehab_dilakukan;
        setRehabilitasiPieData([
            { name: 'Rusak Berat (Belum Direhab)', value: rekap.kebutuhan_rehabilitasi, percent: (rekap.kebutuhan_rehabilitasi/totalRehabilitasi)*100, color: '#FF6B6B' },
            { name: 'Rehab Dilakukan', value: rekap.rehab_dilakukan, percent: (rekap.rehab_dilakukan/totalRehabilitasi)*100, color: '#4ECDC4' }
        ].filter(d => d.value > 0).map(pieDataMapper));

        setIntervensiToiletData([
            { name: 'Total Intervensi', value: rekap.intervensi_pembangunan + rekap.intervensi_rehab, color: '#667eea' },
            { name: 'Pembangunan Toilet', value: rekap.intervensi_pembangunan, color: '#4ECDC4' },
            { name: 'Rehab Toilet', value: rekap.intervensi_rehab, color: '#FFD93D' }
        ]);

        let totalToiletBaik = 0, totalToiletRusakSedang = 0, totalToiletRusakBerat = 0;
        data.forEach(school => {
            totalToiletBaik += school.toiletBaik;
            totalToiletRusakSedang += school.toiletRusakSedang;
            totalToiletRusakBerat += school.toiletRusakBerat;
        });
        const totalToiletCount = totalToiletBaik + totalToiletRusakSedang + totalToiletRusakBerat;

        setKondisiToiletData([
            { name: "Total Unit", value: totalToiletCount, color: "#667eea" },
            { name: "Unit Baik", value: totalToiletBaik, color: "#4ECDC4" },
            { name: "Unit Rusak Sedang", value: totalToiletRusakSedang, color: "#FFD93D" },
            { name: "Unit Rusak Berat", value: totalToiletRusakBerat, color: "#FF6B6B" },
            { name: "Sekolah Tanpa Toilet", value: data.filter(s => s.totalToilet === 0).length, color: "#ff8787" },
        ]);

        if (totalToiletCount > 0) {
            setKondisiPieData([
                { name: 'Baik', value: totalToiletBaik, percent: (totalToiletBaik/totalToiletCount)*100, color: '#4ECDC4' },
                { name: 'Rusak Sedang', value: totalToiletRusakSedang, percent: (totalToiletRusakSedang/totalToiletCount)*100, color: '#FFD93D' },
                { name: 'Rusak Berat', value: totalToiletRusakBerat, percent: (totalToiletRusakBerat/totalToiletCount)*100, color: '#FF6B6B' }
            ].map(pieDataMapper));
        } else {
            setKondisiPieData([{ name: 'Tidak Ada Data', value: 1, actualCount: 0, percent: 100, color: '#95A5A6' }]);
        }
    };

    // === mapping data -> bentuk yang dipakai DataTable asli ===
    const mappedTableData = useMemo(() => {
      return (filteredSchoolData || []).map(s => ({
        npsn: s.npsn,
        namaSekolah: s.nama,
        jenjang: s.jenjang,
        tipeSekolah: s.tipe,
        desa: s.desa,
        kecamatan: s.kecamatan,
        student_count: 0, // tidak tersedia di dataset toilet
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

    // === onDetailClick: NAVIGASI seperti SchoolDetailPage.jsx (per NPSN + jenjang) ===
    const handleDetailClickNavigate = useCallback((row) => {
      const npsn = row?.npsn;
      const jenjang = String(row?.jenjang || '').toUpperCase();
      if (!npsn) { alert('NPSN sekolah tidak ditemukan.'); return; }

      if (jenjang === 'PAUD') { window.location.assign(`/paud/school_detail?npsn=${encodeURIComponent(npsn)}`); return; }
      if (jenjang === 'SD')   { window.location.assign(`/sd/school_detail?npsn=${encodeURIComponent(npsn)}`);   return; }
      if (jenjang === 'SMP')  { window.location.assign(`/smp/school_detail?npsn=${encodeURIComponent(npsn)}`);  return; }
      if (jenjang === 'PKBM') { window.location.assign(`/pkbm/school_detail?npsn=${encodeURIComponent(npsn)}`); return; }

      // fallback generic (jika ada rute lain)
      window.location.assign(`/detail-sekolah?jenjang=${encodeURIComponent(jenjang)}&npsn=${encodeURIComponent(npsn)}`);
    }, []);

    // Main dashboard view (tak diubah, selain bagian tabel menggunakan DataTable + handler baru)
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
                {/* Page Header */}
                <header className={`${styles.card} ${styles.pageHeader}`}>
                    <div className={styles.headerContent}>
                        <h1 className={styles.pageTitle}>
                            Dashboard Fasilitas Toilet Sekolah
                        </h1>
                        <p className={styles.pageSubtitle}>
                            Analisis kondisi dan kebutuhan toilet sekolah di wilayah kerja
                        </p>
                    </div>
                </header>

                {/* Summary Statistics */}
                <section className={`${styles.card} ${styles.summaryCard}`}>
                    <header className={styles.cardHeader}>
                        <h2>Ringkasan Data</h2>
                    </header>
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>{filteredSchoolData.length}</div>
                            <div className={styles.statLabel}>Total Sekolah</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>{filteredSchoolData.reduce((sum, s) => sum + s.totalToilet, 0)}</div>
                            <div className={styles.statLabel}>Total Unit Toilet</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>{filteredSchoolData.filter(s => s.totalToilet === 0).length}</div>
                            <div className={styles.statLabel}>Sekolah Tanpa Toilet</div>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statValue}>{filteredSchoolData.reduce((sum, s) => sum + s.toiletRusakBerat, 0)}</div>
                            <div className={styles.statLabel}>Unit Rusak Berat</div>
                        </div>
                    </div>
                </section>

                {/* Basic Filters Section - Only for Charts */}
                <section className={`${styles.card} ${styles.filtersCard}`}>
                    <header className={styles.cardHeader}>
                        <h2>Filter untuk Grafik</h2>
                    </header>
                    <div className={styles.filtersContent}>
                        <div className={styles.filtersRow}>
                            <div className={styles.filterGroup}>
                                <label className={styles.filterLabel}>Jenjang Pendidikan</label>
                                <select 
                                    className={styles.filterSelect}
                                    value={selectedJenjang} 
                                    onChange={(e) => setSelectedJenjang(e.target.value)}
                                >
                                    <option value="Semua Jenjang">Semua Jenjang</option>
                                    <option value="PAUD">PAUD</option>
                                    <option value="SD">SD</option>
                                    <option value="SMP">SMP</option>
                                    <option value="PKBM">PKBM</option>
                                </select>
                            </div>
                            
                            <div className={styles.filterGroup}>
                                <label className={styles.filterLabel}>Kecamatan</label>
                                <select 
                                    className={styles.filterSelect}
                                    value={selectedKecamatan} 
                                    onChange={(e) => setSelectedKecamatan(e.target.value)}
                                >
                                    <option value="Semua Kecamatan">Semua Kecamatan</option>
                                    {kecamatanOptions.map(k => (
                                        <option key={k} value={k}>{k}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className={styles.filterGroup}>
                                <label className={styles.filterLabel}>Desa/Kelurahan</label>
                                <select 
                                    className={styles.filterSelect}
                                    value={selectedDesa} 
                                    onChange={(e) => setSelectedDesa(e.target.value)}
                                >
                                    <option value="Semua Desa">Semua Desa</option>
                                    {desaOptions.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        
                        <div className={styles.filterActions}>
                            <button
                                className={styles.resetFiltersButton}
                                onClick={resetAllFilters}
                            >
                                Reset Semua Filter
                            </button>
                            <div className={styles.searchResultsInfo}>
                                {(selectedJenjang !== 'Semua Jenjang' || 
                                  selectedKecamatan !== 'Semua Kecamatan' || 
                                  selectedDesa !== 'Semua Desa') && (
                                    <span className={styles.resultsText}>
                                        Filter aktif: {filteredSchoolData.length} dari {schoolData.length} sekolah
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Charts Section */}
                <section className={styles.chartsSection}>
                    {/* Pie Charts */}
                    <div className={styles.pieChartsGrid}>
                        <div className={`${styles.card} ${styles.chartCard}`}>
                            <header className={styles.chartHeader}>
                                <h3>Kondisi Unit Toilet</h3>
                            </header>
                            <div className={styles.chartWrapper}>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie 
                                            data={kondisiPieData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            outerRadius={90}
                                            labelLine={false} 
                                            label={renderLabelInside}
                                        >
                                            {kondisiPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={customPieTooltip} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        <div className={`${styles.card} ${styles.chartCard}`}>
                            <header className={styles.chartHeader}>
                                <h3>Status Rehabilitasi</h3>
                            </header>
                            <div className={styles.chartWrapper}>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie 
                                            data={rehabilitasiPieData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            outerRadius={90}
                                            labelLine={false} 
                                            label={renderLabelInside}
                                        >
                                            {rehabilitasiPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={customPieTooltip} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        <div className={`${styles.card} ${styles.chartCard}`}>
                            <header className={styles.chartHeader}>
                                <h3>Status Pembangunan</h3>
                            </header>
                            <div className={styles.chartWrapper}>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie 
                                            data={pembangunanPieData} 
                                            dataKey="value" 
                                            nameKey="name" 
                                            cx="50%" 
                                            cy="50%" 
                                            outerRadius={90}
                                            labelLine={false} 
                                            label={renderLabelInside}
                                        >
                                            {pembangunanPieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={customPieTooltip} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Bar Charts */}
                    <div className={styles.barChartsGrid}>
                        <div className={`${styles.card} ${styles.chartCard}`}>
                            <header className={styles.chartHeader}>
                                <h3>Kondisi Unit Toilet</h3>
                            </header>
                            <div className={styles.chartWrapper}>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={kondisiToiletData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis 
                                            dataKey="name" 
                                            angle={-45} 
                                            textAnchor="end" 
                                            interval={0} 
                                            tick={{ fontSize: 12 }}
                                            height={80}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip content={customBarTooltip} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="value" position="top" fontSize={12} />
                                            {kondisiToiletData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                        
                        <div className={`${styles.card} ${styles.chartCard}`}>
                            <header className={styles.chartHeader}>
                                <h3>Kategori Intervensi</h3>
                            </header>
                            <div className={styles.chartWrapper}>
                                <ResponsiveContainer width="100%" height={320}>
                                    <BarChart data={intervensiToiletData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis 
                                            dataKey="name" 
                                            angle={-45} 
                                            textAnchor="end" 
                                            interval={0} 
                                            tick={{ fontSize: 12 }}
                                            height={80}
                                        />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip content={customBarTooltip} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            <LabelList dataKey="value" position="top" fontSize={12} />
                                            {intervensiToiletData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Data Table Section — pakai DataTable dari SchoolDetailPage.jsx */}
                <section className={`${styles.card} ${styles.tableCard}`}>
                    <header className={styles.cardHeader}>
                        <div className={styles.tableHeaderContent}>
                            <h2>Data Sekolah</h2>
                        </div>
                    </header>

                    <div className={styles.chartContent}>
                        <DataTable
                          data={mappedTableData}
                          onDetailClick={handleDetailClickNavigate}  // <<< NAVIGASI PER NPSN
                        />
                    </div>
                </section>
            </div>
        );
    };
    
    return (
        <main className={styles.pageWrapper}>
            {currentView === 'main' && renderMainView()}
            {currentView === 'detail' && selectedSchool && (() => {
                let DetailComponent;
                switch (selectedSchool.jenjang) {
                    case 'PAUD': DetailComponent = SchoolDetailPaud; break;
                    case 'SD': DetailComponent = SchoolDetailSd; break;
                    case 'SMP': DetailComponent = SchoolDetailSmp; break;
                    case 'PKBM': DetailComponent = SchoolDetailPkbm; break;
                    default: return (
                        <div className={styles.container}>
                            <div className={styles.card}>
                                <h2>Detail tidak tersedia</h2>
                                <button 
                                    className={styles.backButton}
                                    onClick={() => setCurrentView('main')}
                                >
                                    Kembali ke Dashboard
                                </button>
                            </div>
                        </div>
                    );
                }
                return <DetailComponent schoolData={{ ...selectedSchool.originalData, kecamatan: selectedSchool.kecamatan }} onBack={() => setCurrentView('main')} />;
            })()}
        </main>
    );
};

export default FacilitiesPage;
