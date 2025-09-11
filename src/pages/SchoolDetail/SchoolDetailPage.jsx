// SchoolDetailPage.js - Enhanced Responsive & Interactive Version
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Tooltip, LabelList, AnimationBeginTiming
} from 'recharts';
import Map from '../Map/Map';
import styles from './SchoolDetailPage.module.css';
import SchoolDetailPaud from '../../components/schools/SchoolDetail/Paud/SchoolDetailPaud';
import SchoolDetailSd from '../../components/schools/SchoolDetail/Sd/SchoolDetailSd';
import SchoolDetailSmp from '../../components/schools/SchoolDetail/Smp/SchoolDetailSmp';
import SchoolDetailPkbm from '../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm';

// ====================================================================
// Enhanced Components dengan animasi dan interaktivitas
// ====================================================================

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    
    componentDidCatch(error, errorInfo) {
        console.error('SchoolDetailPage Error:', error, errorInfo);
    }
    
    render() {
        if (this.state.hasError) {
            return (
                <div className={styles.errorContainer}>
                    <div className={styles.errorContent}>
                        <div className={styles.errorIcon}>⚠️</div>
                        <h2>Terjadi Kesalahan</h2>
                        <p>Komponen tidak dapat dimuat dengan baik</p>
                        <button 
                            className={styles.retryButton}
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            Coba Lagi
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Enhanced PieChart with animations and better interactivity
const PieChartComponent = ({ title, data }) => {
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    
    const validData = data.filter(item => item && typeof item.value === 'number' && item.value > 0);
    
    if (validData.length === 0) {
        return (
            <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>{title}</h3>
                <div className={styles.noDataState}>
                    <div className={styles.noDataIcon}>📊</div>
                    <p>Tidak ada data untuk ditampilkan</p>
                </div>
            </div>
        );
    }

    const renderCustomLabel = (entry) => {
        const percent = ((entry.value / validData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
        return `${percent}%`;
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const total = validData.reduce((sum, item) => sum + item.value, 0);
            const percent = ((data.value / total) * 100).toFixed(1);
            
            return (
                <div className={styles.customTooltip}>
                    <div className={styles.tooltipHeader}>
                        <div 
                            className={styles.tooltipColorDot} 
                            style={{ backgroundColor: data.payload.color }}
                        ></div>
                        <span className={styles.tooltipLabel}>{data.name}</span>
                    </div>
                    <div className={styles.tooltipValue}>
                        {data.value.toLocaleString('id-ID')} ({percent}%)
                    </div>
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
                        <Pie
                            data={validData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={120}
                            fill="#8884d8"
                            label={renderCustomLabel}
                            labelLine={false}
                            animationBegin={0}
                            animationDuration={1200}
                            onMouseEnter={(_, index) => setHoveredIndex(index)}
                            onMouseLeave={() => setHoveredIndex(-1)}
                        >
                            {validData.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={entry.color}
                                    stroke={hoveredIndex === index ? '#ffffff' : 'none'}
                                    strokeWidth={hoveredIndex === index ? 3 : 0}
                                    style={{
                                        filter: hoveredIndex === index ? 'brightness(1.1)' : 'brightness(1)',
                                        cursor: 'pointer'
                                    }}
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend 
                            wrapperStyle={{ paddingTop: '20px' }}
                            iconType="circle"
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Enhanced BarChart with animations and gradient effects
const BarChartComponent = ({ title, data, colors }) => {
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    
    if (!data || data.length === 0) {
        return (
            <div className={styles.chartContainer}>
                <h3 className={styles.chartTitle}>{title}</h3>
                <div className={styles.noDataState}>
                    <div className={styles.noDataIcon}>📈</div>
                    <p>Tidak ada data untuk ditampilkan</p>
                </div>
            </div>
        );
    }

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className={styles.customTooltip}>
                    <div className={styles.tooltipHeader}>
                        <span className={styles.tooltipLabel}>{label}</span>
                    </div>
                    <div className={styles.tooltipValue}>
                        {payload[0].value.toLocaleString('id-ID')} unit
                    </div>
                </div>
            );
        }
        return null;
    };

    const CustomBar = (props) => {
        const { fill, index, ...rest } = props;
        const isHovered = hoveredIndex === index;
        
        return (
            <Bar
                {...rest}
                fill={fill}
                style={{
                    filter: isHovered ? 'brightness(1.2) saturate(1.2)' : 'brightness(1)',
                    transition: 'all 0.3s ease'
                }}
            />
        );
    };

    return (
        <div className={`${styles.chartContainer} ${styles.fadeInUp}`}>
            <h3 className={styles.chartTitle}>{title}</h3>
            <div className={styles.chartWrapperTall}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={data} 
                        margin={{ top: 30, right: 30, left: 20, bottom: 80 }}
                        onMouseMove={(state) => {
                            if (state && state.activeTooltipIndex !== undefined) {
                                setHoveredIndex(state.activeTooltipIndex);
                            }
                        }}
                        onMouseLeave={() => setHoveredIndex(-1)}
                    >
                        <defs>
                            {colors.map((color, index) => (
                                <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.9}/>
                                    <stop offset="100%" stopColor={color} stopOpacity={0.6}/>
                                </linearGradient>
                            ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="name" 
                            tick={{ fontSize: 12, fill: '#64748b' }} 
                            interval={0} 
                            angle={-25} 
                            textAnchor="end"
                            height={100}
                        />
                        <YAxis 
                            tickFormatter={(value) => value.toLocaleString('id-ID')}
                            tick={{ fontSize: 12, fill: '#64748b' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar 
                            dataKey="value" 
                            animationDuration={1500}
                            animationBegin={300}
                        >
                            {data.map((entry, index) => (
                                <Cell 
                                    key={`cell-bar-${index}`} 
                                    fill={`url(#gradient-${index % colors.length})`}
                                    stroke={colors[index % colors.length]}
                                    strokeWidth={1}
                                />
                            ))}
                            <LabelList 
                                dataKey="value" 
                                position="top" 
                                formatter={(value) => value.toLocaleString('id-ID')} 
                                style={{ 
                                    fontSize: '11px', 
                                    fontWeight: 'bold',
                                    fill: '#374151'
                                }} 
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// Enhanced DataTable with better animations and interactions
const DataTable = React.memo(({ data, onDetailClick }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [sortField, setSortField] = useState('');
    const [sortDirection, setSortDirection] = useState('asc');

    const filteredData = useMemo(() => {
        let filtered = data;
        
        if (searchTerm) {
            filtered = data.filter(school => {
                const namaSekolah = school.namaSekolah || '';
                const npsn = school.npsn || '';
                const kecamatan = school.kecamatan || '';
                return namaSekolah.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       npsn.toString().includes(searchTerm) ||
                       kecamatan.toLowerCase().includes(searchTerm.toLowerCase());
            });
        }

        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                let aVal = a[sortField];
                let bVal = b[sortField];
                
                if (typeof aVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }
                
                if (sortDirection === 'asc') {
                    return aVal > bVal ? 1 : -1;
                } else {
                    return aVal < bVal ? 1 : -1;
                }
            });
        }

        return filtered;
    }, [data, searchTerm, sortField, sortDirection]);

    const { data: paginatedData, totalPages, totalItems } = useMemo(() => {
        const total = Math.ceil(filteredData.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        return { 
            data: filteredData.slice(startIndex, startIndex + itemsPerPage), 
            totalPages: total > 0 ? total : 1, 
            totalItems: filteredData.length 
        };
    }, [filteredData, currentPage, itemsPerPage]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const handleReset = useCallback(() => { 
        setSearchTerm(''); 
        setCurrentPage(1); 
        setItemsPerPage(10);
        setSortField('');
        setSortDirection('asc');
    }, []);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage]);

    return (
        <div className={styles.tableContainer}>
            <div className={styles.tableControls}>
                <div className={styles.searchContainer}>
                    <div className={styles.searchIcon}>🔍</div>
                    <input 
                        type="text" 
                        placeholder="Cari nama sekolah, NPSN, atau kecamatan..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        className={styles.searchInput} 
                    />
                    {searchTerm && (
                        <button 
                            className={styles.clearSearch}
                            onClick={() => setSearchTerm('')}
                        >
                            ✕
                        </button>
                    )}
                </div>
                <div className={styles.controlGroup}>
                    <label>Tampilkan:</label>
                    <select 
                        value={itemsPerPage} 
                        onChange={e => setItemsPerPage(Number(e.target.value))} 
                        className={styles.itemsPerPageSelect}
                    >
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                    </select>
                    <button onClick={handleReset} className={styles.resetTableButton}>Reset</button>
                </div>
            </div>
            
            <div className={styles.tableScrollContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>NO</th>
                            <th 
                                className={styles.sortableHeader}
                                onClick={() => handleSort('npsn')}
                            >
                                NPSN {sortField === 'npsn' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th 
                                className={styles.sortableHeader}
                                onClick={() => handleSort('namaSekolah')}
                            >
                                NAMA SEKOLAH {sortField === 'namaSekolah' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th 
                                className={styles.sortableHeader}
                                onClick={() => handleSort('jenjang')}
                            >
                                JENJANG {sortField === 'jenjang' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th>TIPE</th>
                            <th 
                                className={styles.sortableHeader}
                                onClick={() => handleSort('desa')}
                            >
                                DESA {sortField === 'desa' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th 
                                className={styles.sortableHeader}
                                onClick={() => handleSort('kecamatan')}
                            >
                                KECAMATAN {sortField === 'kecamatan' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
                            <th 
                                className={styles.sortableHeader}
                                onClick={() => handleSort('student_count')}
                            >
                                SISWA {sortField === 'student_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                            </th>
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
                        {paginatedData.length > 0 ? paginatedData.map((school, index) => (
                            <tr key={`${school.npsn || index}-${index}`} className={styles.tableRow}>
                                <td>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                                <td><span className={styles.npsnBadge}>{school.npsn || '-'}</span></td>
                                <td className={styles.schoolNameCell}>{school.namaSekolah || '-'}</td>
                                <td><span className={`${styles.jenjangBadge} ${styles[school.jenjang?.toLowerCase()]}`}>{school.jenjang || '-'}</span></td>
                                <td>{school.tipeSekolah || '-'}</td>
                                <td>{school.desa || '-'}</td>
                                <td>{school.kecamatan || '-'}</td>
                                <td><span className={styles.numberBadge}>{school.student_count || 0}</span></td>
                                <td><span className={styles.conditionGood}>{(school.kondisiKelas?.baik || 0)}</span></td>
                                <td><span className={styles.conditionModerate}>{(school.kondisiKelas?.rusakSedang || 0)}</span></td>
                                <td><span className={styles.conditionBad}>{(school.kondisiKelas?.rusakBerat || 0)}</span></td>
                                <td><span className={styles.numberBadge}>{school.kurangRKB || 0}</span></td>
                                <td><span className={styles.numberBadge}>{school.rehabRuangKelas || 0}</span></td>
                                <td><span className={styles.numberBadge}>{school.pembangunanRKB || 0}</span></td>
                                <td>
                                    <button 
                                        className={styles.detailButton} 
                                        onClick={() => onDetailClick && onDetailClick(school)}
                                    >
                                        <span className={styles.detailIcon}>👁️</span>
                                        Detail
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="15" className={styles.noDataCell}>
                                    <div className={styles.noDataState}>
                                        <div className={styles.noDataIcon}>🔍</div>
                                        <p>Tidak ada data yang sesuai dengan pencarian</p>
                                        {searchTerm && (
                                            <button onClick={() => setSearchTerm('')} className={styles.clearSearchButton}>
                                                Hapus Filter
                                            </button>
                                        )}
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
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(1)} 
                        className={styles.pageButton}
                    >
                        ⏮️ Pertama
                    </button>
                    <button 
                        disabled={currentPage === 1} 
                        onClick={() => setCurrentPage(p => p - 1)} 
                        className={styles.pageButton}
                    >
                        ⬅️ Sebelumnya
                    </button>
                    <span className={styles.pageIndicator}>
                        Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong>
                    </span>
                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(p => p + 1)} 
                        className={styles.pageButton}
                    >
                        Berikutnya ➡️
                    </button>
                    <button 
                        disabled={currentPage === totalPages} 
                        onClick={() => setCurrentPage(totalPages)} 
                        className={styles.pageButton}
                    >
                        Terakhir ⏭️
                    </button>
                </div>
            </div>
        </div>
    );
});

// Main Component dengan enhanced animations
const SchoolDetailPage = () => {
    // State management tetap sama seperti sebelumnya
    const [schoolData, setSchoolData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentView, setCurrentView] = useState('main');
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [filterJenjang, setFilterJenjang] = useState('Semua Jenjang');
    const [filterKecamatan, setFilterKecamatan] = useState('Semua Kecamatan');
    const [filterDesa, setFilterDesa] = useState('Semua Desa');
    const [jenjangList, setJenjangList] = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [desaByKecamatan, setDesaByKecamatan] = useState({});

    // Semua logika useCallback dan useEffect tetap sama seperti kode asli
    const handleDetailClick = useCallback((school) => { 
        setSelectedSchool(school); 
        setCurrentView('detail'); 
    }, []);
    
    const handleBackToMain = useCallback(() => { 
        setCurrentView('main'); 
        setSelectedSchool(null); 
    }, []);
    
    const isValidCoordinate = useCallback((lat, lng) => (
        typeof lat === 'number' && typeof lng === 'number' && 
        !isNaN(lat) && !isNaN(lng) && 
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && 
        lat !== 0 && lng !== 0
    ), []);
    
    const transformDataForMap = useCallback((data) => {
        return data.map(school => {
          const lat = parseFloat(school.coordinates?.[0]);
          const lng = parseFloat(school.coordinates?.[1]);
          if (!isValidCoordinate(lat, lng)) return null;
          return {
            nama: school.namaSekolah, npsn: school.npsn, alamat: school.alamat || '-', 
            kecamatan: school.kecamatan, desa: school.desa, lintang: lat, bujur: lng, 
            jenjang: school.jenjang,
            fasilitas: school.kondisiKelas ? { 
                baik: school.kondisiKelas.baik, 
                rusakSedang: school.kondisiKelas.rusakSedang, 
                rusakBerat: school.kondisiKelas.rusakBerat 
            } : null
          };
        }).filter(Boolean);
    }, [isValidCoordinate]);
      
    const loadJSON = useCallback(async (fullPath) => {
        try {
            const response = await fetch(`https://peta-sekolah.vercel.app/${fullPath}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status} for ${fullPath}`);
            return await response.json();
        } catch (error) {
            console.error(`Gagal memuat ${fullPath}:`, error);
            return null;
        }
    }, []);

    // useEffect untuk loading data tetap sama...
    useEffect(() => {
        const loadAllData = async () => {
            try {
              setLoading(true);
              setError(null);
              const [paudData, sdData, smpData, pkbmData, kegiatanPaudData, kegiatanSdData, kegiatanSmpData, kegiatanPkbmData] = await Promise.all([
                loadJSON('paud/data/paud.json'), loadJSON('sd/data/sd_new.json'), loadJSON('smp/data/smp.json'), loadJSON('pkbm/data/pkbm.json'),
                loadJSON('paud/data/data_kegiatan.json'), loadJSON('sd/data/data_kegiatan.json'), loadJSON('smp/data/data_kegiatan.json'), loadJSON('pkbm/data/data_kegiatan.json')
              ]);
              
              const combinedSchoolData = [];
              const processSchoolData = (data, jenjang) => {
                if (!data) return;
                Object.entries(data).forEach(([kecamatan, schools]) => {
                  if (Array.isArray(schools)) {
                    schools.forEach(school => {
                      if (school && typeof school === 'object') {
                        combinedSchoolData.push({
                          npsn: school.npsn || `${jenjang}-${Math.random()}`, 
                          namaSekolah: school.name || school.namaSekolah || 'Tidak diketahui', 
                          jenjang: jenjang, 
                          tipeSekolah: school.type || school.status || '-', 
                          desa: school.village || '-', 
                          kecamatan: kecamatan, 
                          student_count: parseInt(school.student_count) || 0, 
                          coordinates: Array.isArray(school.coordinates) ? school.coordinates : [0, 0],
                          kondisiKelas: { 
                            baik: parseInt(school.class_condition?.classrooms_good) || 0, 
                            rusakSedang: parseInt(school.class_condition?.classrooms_moderate_damage) || 0, 
                            rusakBerat: parseInt(school.class_condition?.classrooms_heavy_damage) || 0, 
                          },
                          kurangRKB: parseInt(school.class_condition?.lacking_rkb) || 0,
                        });
                      }
                    });
                  }
                });
              };
              
              processSchoolData(paudData, 'PAUD'); 
              processSchoolData(sdData, 'SD'); 
              processSchoolData(smpData, 'SMP'); 
              processSchoolData(pkbmData, 'PKBM');
              
              const combinedKegiatanData = [
                ...(Array.isArray(kegiatanPaudData) ? kegiatanPaudData : []), 
                ...(Array.isArray(kegiatanSdData) ? kegiatanSdData : []), 
                ...(Array.isArray(kegiatanSmpData) ? kegiatanSmpData : []), 
                ...(Array.isArray(kegiatanPkbmData) ? kegiatanPkbmData : [])
              ];
              
              const kegiatanMap = {};
              combinedKegiatanData.forEach(kegiatan => {
                if (kegiatan && kegiatan.npsn) {
                  const npsn = String(kegiatan.npsn);
                  if (!kegiatanMap[npsn]) { 
                    kegiatanMap[npsn] = { rehabRuangKelas: 0, pembangunanRKB: 0 }; 
                  }
                  const lokalCount = parseInt(kegiatan.Lokal) || 0;
                  if (kegiatan.Kegiatan?.includes('Rehab')) { 
                    kegiatanMap[npsn].rehabRuangKelas += lokalCount; 
                  }
                  if (kegiatan.Kegiatan?.includes('Pembangunan')) { 
                    kegiatanMap[npsn].pembangunanRKB += lokalCount; 
                  }
                }
              });
              
              const mergedSchoolData = combinedSchoolData.map((school) => { 
                const kegiatanData = kegiatanMap[String(school.npsn)] || { rehabRuangKelas: 0, pembangunanRKB: 0 }; 
                return { ...school, ...kegiatanData }; 
              });
              
              setSchoolData(mergedSchoolData);
              setJenjangList([...new Set(mergedSchoolData.map(s => s.jenjang).filter(Boolean))].sort());
              setKecamatanList([...new Set(mergedSchoolData.map(s => s.kecamatan).filter(Boolean))].sort());
              
              const desaByKec = {};
              mergedSchoolData.forEach(school => { 
                if (school.kecamatan && school.desa) { 
                  if (!desaByKec[school.kecamatan]) desaByKec[school.kecamatan] = new Set(); 
                  desaByKec[school.kecamatan].add(school.desa); 
                } 
              });
              Object.keys(desaByKec).forEach(kec => { 
                desaByKec[kec] = Array.from(desaByKec[kec]).sort(); 
              });
              setDesaByKecamatan(desaByKec);
              
            } catch (error) { 
              setError(error.message); 
            } finally { 
              setLoading(false); 
            }
        };
        loadAllData();
    }, [loadJSON]);
      
    useEffect(() => {
        let data = [...schoolData];
        if (filterJenjang !== 'Semua Jenjang') data = data.filter(d => d.jenjang === filterJenjang);
        if (filterKecamatan !== 'Semua Kecamatan') data = data.filter(d => d.kecamatan === filterKecamatan);
        if (filterDesa !== 'Semua Desa') data = data.filter(d => d.desa === filterDesa);
        setFilteredData(data);
    }, [schoolData, filterJenjang, filterKecamatan, filterDesa]);
    
    const { statistics, chartData } = useMemo(() => {
        let unitBaik = 0, unitRusakSedang = 0, unitRusakBerat = 0;
        let rehabDilakukan = 0, pembangunanDilakukan = 0, totalKurangRKB = 0;
        
        filteredData.forEach(school => {
          unitBaik += school.kondisiKelas.baik;
          unitRusakSedang += school.kondisiKelas.rusakSedang;
          unitRusakBerat += school.kondisiKelas.rusakBerat;
          rehabDilakukan += school.rehabRuangKelas;
          pembangunanDilakukan += school.pembangunanRKB;
          totalKurangRKB += school.kurangRKB;
        });
        
        const totalUnitKelas = unitBaik + unitRusakSedang + unitRusakBerat;
        const belumDirehab = Math.max(0, unitRusakBerat - rehabDilakukan);
        const belumDibangun = Math.max(0, totalKurangRKB - pembangunanDilakukan);
        const totalIntervensi = pembangunanDilakukan + rehabDilakukan;
        
        const stats = { totalSekolah: filteredData.length };
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
        return { statistics: stats, chartData: charts };
    }, [filteredData]);

    const handleKecamatanChange = useCallback((e) => { 
        setFilterKecamatan(e.target.value); 
        setFilterDesa('Semua Desa'); 
    }, []);
    
    const handleResetAllFilters = useCallback(() => { 
        setFilterJenjang('Semua Jenjang'); 
        setFilterKecamatan('Semua Kecamatan'); 
        setFilterDesa('Semua Desa'); 
    }, []);
    
    const schoolsForMap = useMemo(() => transformDataForMap(filteredData), [filteredData, transformDataForMap]);

    // Enhanced Loading Component
    if (loading) { 
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingContent}>
                    <div className={styles.modernSpinner}>
                        <div className={styles.spinnerRing}></div>
                        <div className={styles.spinnerRing}></div>
                        <div className={styles.spinnerRing}></div>
                    </div>
                    <h2 className={styles.loadingTitle}>Memuat Data Sekolah</h2>
                    <p className={styles.loadingSubtitle}>Sedang mengambil informasi terbaru...</p>
                    <div className={styles.loadingBar}>
                        <div className={styles.loadingProgress}></div>
                    </div>
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
                    <button 
                        className={styles.retryButton} 
                        onClick={() => window.location.reload()}
                    >
                        🔄 Muat Ulang
                    </button>
                </div>
            </div>
        ); 
    }

    const renderDetailView = () => {
        if (!selectedSchool) return null;
        let DetailComponent = null;
        switch (selectedSchool.jenjang) {
          case 'PAUD': DetailComponent = SchoolDetailPaud; break; 
          case 'SD': DetailComponent = SchoolDetailSd; break; 
          case 'SMP': DetailComponent = SchoolDetailSmp; break; 
          case 'PKBM': DetailComponent = SchoolDetailPkbm; break; 
          default: return <div className={styles.noDetailAvailable}>Detail tidak tersedia untuk jenjang ini</div>;
        }
        return <DetailComponent school={selectedSchool} onBack={handleBackToMain} />;
    };

    const renderMainView = () => (
        <div className={styles.pageContainer}>
            {/* Simplified Header - Left Aligned Title Only */}
            <header className={`${styles.pageHeader} ${styles.fadeInDown}`}>
                <div className={styles.headerContent}>
                    <h1 className={styles.pageTitle}>Detail Peta Sekolah</h1>
                </div>
            </header>

            <main>
                {/* Enhanced Filter Section */}
                <section className={`${styles.card} ${styles.fadeInUp}`}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitleGroup}>
                            <h2 className={styles.cardTitle}>
                                <span className={styles.cardIcon}>🔍</span>
                                Filter & Pencarian Data
                            </h2>
                            <p className={styles.cardSubtitle}>Saring data sesuai kebutuhan analisis Anda</p>
                        </div>
                        <button onClick={handleResetAllFilters} className={styles.resetButton}>
                            <span className={styles.resetIcon}>🔄</span>
                            Reset Filter
                        </button>
                    </div>
                    <div className={styles.filterContainer}>
                        <div className={styles.filterGroup}>
                            <label htmlFor="filter-jenjang" className={styles.filterLabel}>
                                <span className={styles.labelIcon}>🎓</span>
                                Jenjang Pendidikan
                            </label>
                            <select 
                                id="filter-jenjang" 
                                value={filterJenjang} 
                                onChange={e => setFilterJenjang(e.target.value)} 
                                className={styles.filterSelect}
                            >
                                <option value="Semua Jenjang">Semua Jenjang</option>
                                {jenjangList.map((jenjang, idx) => (
                                    <option key={idx} value={jenjang}>{jenjang}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label htmlFor="filter-kecamatan" className={styles.filterLabel}>
                                <span className={styles.labelIcon}>🏘️</span>
                                Kecamatan
                            </label>
                            <select 
                                id="filter-kecamatan" 
                                value={filterKecamatan} 
                                onChange={handleKecamatanChange} 
                                className={styles.filterSelect}
                            >
                                <option value="Semua Kecamatan">Semua Kecamatan</option>
                                {kecamatanList.map((kec, idx) => (
                                    <option key={idx} value={kec}>{kec}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <label htmlFor="filter-desa" className={styles.filterLabel}>
                                <span className={styles.labelIcon}>🏠</span>
                                Desa/Kelurahan
                            </label>
                            <select 
                                id="filter-desa" 
                                value={filterDesa} 
                                onChange={e => setFilterDesa(e.target.value)} 
                                disabled={filterKecamatan === 'Semua Kecamatan'} 
                                className={styles.filterSelect}
                            >
                                <option value="Semua Desa">Semua Desa</option>
                                {filterKecamatan !== 'Semua Kecamatan' && 
                                 desaByKecamatan[filterKecamatan]?.map((desa, idx) => (
                                    <option key={idx} value={desa}>{desa}</option>
                                ))}
                            </select>
                            {filterKecamatan === 'Semua Kecamatan' && (
                                <small className={styles.filterHint}>
                                    💡 Pilih kecamatan terlebih dahulu
                                </small>
                            )}
                        </div>
                    </div>
                </section>
                
                {/* Enhanced Map Section with container */}
                <section className={`${styles.card} ${styles.mapCard} ${styles.fadeInUp}`}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitleGroup}>
                            <h2 className={styles.cardTitle}>
                                <span className={styles.cardIcon}>🗺️</span>
                                Peta Sebaran Sekolah
                            </h2>
                            <p className={styles.cardSubtitle}>
                                Visualisasi geografis {schoolsForMap.length} lokasi sekolah yang valid
                            </p>
                        </div>
                        <div className={styles.mapLegend}>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{backgroundColor: '#10b981'}}></span>
                                <span>Kondisi Baik</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{backgroundColor: '#f59e0b'}}></span>
                                <span>Perlu Perbaikan</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{backgroundColor: '#ef4444'}}></span>
                                <span>Kondisi Buruk</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.mapContainer}>
                        <div className={styles.mapWrapper}>
                            <ErrorBoundary>
                                <Map schools={schoolsForMap} />
                            </ErrorBoundary>
                        </div>
                    </div>
                </section>

                {/* Enhanced Charts Grid */}
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
                            <BarChartComponent 
                                title="Statistik Kondisi Ruang Kelas" 
                                data={chartData.barKondisiKelas} 
                                colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]} 
                            />
                        </div>
                    </ErrorBoundary>
                    <ErrorBoundary>
                        <div className={`${styles.card} ${styles.fadeInUp}`}>
                            <BarChartComponent 
                                title="Statistik Intervensi Ruang Kelas" 
                                data={chartData.barIntervensiKelas} 
                                colors={["#06b6d4", "#f97316", "#8b5cf6"]} 
                            />
                        </div>
                    </ErrorBoundary>
                </section>

                {/* Enhanced Data Table */}
                <section className={`${styles.card} ${styles.fadeInUp}`}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardTitleGroup}>
                            <h2 className={styles.cardTitle}>
                                <span className={styles.cardIcon}>📊</span>
                                Data Detail Sekolah
                            </h2>
                            <p className={styles.cardSubtitle}>
                                Tabel lengkap {filteredData.length} data sekolah dengan informasi detail
                            </p>
                        </div>
                        <div className={styles.tableActions}>
                            <button className={styles.exportButton}>
                                <span className={styles.exportIcon}>📥</span>
                                Export Data
                            </button>
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