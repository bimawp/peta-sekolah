import React, { useState, useEffect, useMemo } from 'react';
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

const FacilitiesPage = () => {
    const [currentView, setCurrentView] = useState('main');
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Enhanced states for improved functionality
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
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

    // Enhanced sorting function
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };

    // Sorted and paginated data
    const sortedAndPaginatedData = useMemo(() => {
        let sortableData = [...filteredSchoolData];
        if (sortConfig.key) {
            sortableData.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sortableData.slice(startIndex, endIndex);
    }, [filteredSchoolData, sortConfig, currentPage, itemsPerPage]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredSchoolData.length / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredSchoolData.length);

    // Clear search function
    const clearSearch = () => {
        setSearchQuery('');
        setCurrentPage(1);
    };

    // Pagination handlers
    const goToPage = (page) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
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

    // Filter effect
    useEffect(() => {
        if (schoolData.length === 0) return;
        let filtered = schoolData;
        if (selectedJenjang !== 'Semua Jenjang') filtered = filtered.filter(s => s.jenjang === selectedJenjang);
        if (selectedKecamatan !== 'Semua Kecamatan') filtered = filtered.filter(s => s.kecamatan === selectedKecamatan);
        if (selectedDesa !== 'Semua Desa') filtered = filtered.filter(s => s.desa === selectedDesa);
        if (searchQuery) {
            filtered = filtered.filter(s => 
                s.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                s.npsn?.includes(searchQuery)
            );
        }
        setFilteredSchoolData(filtered);
        generateChartData(filtered, schoolData, kegiatanData);
        setCurrentPage(1); // Reset to first page when filtering
    }, [schoolData, kegiatanData, selectedJenjang, selectedKecamatan, selectedDesa, searchQuery]);
    
    const resetAllFilters = () => {
        setSelectedJenjang('Semua Jenjang');
        setSelectedKecamatan('Semua Kecamatan');
        setSelectedDesa('Semua Desa');
        setSearchQuery('');
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

    // Badge component for jenjang
    const JenjangBadge = ({ jenjang }) => (
        <span className={`${styles.badge} ${styles[`badge${jenjang}`]}`}>
            {jenjang}
        </span>
    );

    // Sort icon component
    const SortIcon = ({ column }) => {
        if (sortConfig.key !== column) {
            return <span className={styles.sortIcon}>↕️</span>;
        }
        return (
            <span className={styles.sortIcon}>
                {sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
        );
    };

    // Loading component
    const LoadingSpinner = () => (
        <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Memuat data sekolah...</p>
        </div>
    );

    // Error component
    const ErrorMessage = ({ message }) => (
        <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <h3>Terjadi Kesalahan</h3>
            <p className={styles.errorMessage}>{message}</p>
            <button 
                className={styles.retryButton}
                onClick={() => window.location.reload()}
            >
                Muat Ulang Halaman
            </button>
        </div>
    );

    // Summary statistics component
    const SummaryStats = () => {
        const totalSekolah = filteredSchoolData.length;
        const totalToilet = filteredSchoolData.reduce((sum, s) => sum + s.totalToilet, 0);
        const sekolahTanpaToilet = filteredSchoolData.filter(s => s.totalToilet === 0).length;
        const toiletRusakBerat = filteredSchoolData.reduce((sum, s) => sum + s.toiletRusakBerat, 0);

        return (
            <section className={`${styles.card} ${styles.summaryCard}`}>
                <header className={styles.cardHeader}>
                    <h2>Ringkasan Data</h2>
                </header>
                <div className={styles.statsGrid}>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{totalSekolah}</div>
                        <div className={styles.statLabel}>Total Sekolah</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{totalToilet}</div>
                        <div className={styles.statLabel}>Total Unit Toilet</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{sekolahTanpaToilet}</div>
                        <div className={styles.statLabel}>Sekolah Tanpa Toilet</div>
                    </div>
                    <div className={styles.statItem}>
                        <div className={styles.statValue}>{toiletRusakBerat}</div>
                        <div className={styles.statLabel}>Unit Rusak Berat</div>
                    </div>
                </div>
            </section>
        );
    };

    // Main dashboard view
    const renderMainView = () => {
        if (loading) {
            return (
                <div className={styles.container}>
                    <div className={styles.card}>
                        <LoadingSpinner />
                    </div>
                </div>
            );
        }

        if (error) {
            return (
                <div className={styles.container}>
                    <div className={styles.card}>
                        <ErrorMessage message={error} />
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
                <SummaryStats />

                {/* Filters Section */}
                <section className={`${styles.card} ${styles.filtersCard}`}>
                    <header className={styles.cardHeader}>
                        <h2>Filter & Pencarian</h2>
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
                        
                        <div className={styles.searchRow}>
                            <div className={styles.searchGroup}>
                                <label className={styles.filterLabel}>Pencarian</label>
                                <div className={styles.searchInputWrapper}>
                                    <input
                                        type="text"
                                        className={styles.searchInput}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Cari nama sekolah atau NPSN..."
                                    />
                                    {searchQuery && (
                                        <button
                                            className={styles.clearSearchButton}
                                            onClick={clearSearch}
                                            title="Hapus pencarian"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            </div>
                            
                            <button
                                className={styles.resetFiltersButton}
                                onClick={resetAllFilters}
                            >
                                Reset Semua Filter
                            </button>
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

                {/* Data Table Section */}
                <section className={`${styles.card} ${styles.tableCard}`}>
                    <header className={styles.cardHeader}>
                        <div className={styles.tableHeaderContent}>
                            <h2>Data Sekolah ({filteredSchoolData.length} sekolah)</h2>
                            <div className={styles.tableControls}>
                                <div className={styles.itemsPerPageSelector}>
                                    <label>Tampilkan:</label>
                                    <select 
                                        value={itemsPerPage} 
                                        onChange={(e) => {
                                            setItemsPerPage(Number(e.target.value));
                                            setCurrentPage(1);
                                        }}
                                        className={styles.pageSelect}
                                    >
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                    </select>
                                    <span>per halaman</span>
                                </div>
                            </div>
                        </div>
                    </header>
                    
                    <div className={styles.tableWrapper}>
                        <div className={styles.tableScrollContainer}>
                            <table className={styles.dataTable}>
                                <thead className={styles.tableHead}>
                                    <tr>
                                        <th className={styles.tableHeader}>No</th>
                                        <th 
                                            className={`${styles.tableHeader} ${styles.sortableHeader}`}
                                            onClick={() => handleSort('npsn')}
                                        >
                                            NPSN <SortIcon column="npsn" />
                                        </th>
                                        <th 
                                            className={`${styles.tableHeader} ${styles.sortableHeader}`}
                                            onClick={() => handleSort('nama')}
                                        >
                                            Nama Sekolah <SortIcon column="nama" />
                                        </th>
                                        <th className={styles.tableHeader}>Jenjang</th>
                                        <th className={styles.tableHeader}>Tipe</th>
                                        <th className={styles.tableHeader}>Desa</th>
                                        <th className={styles.tableHeader}>Kecamatan</th>
                                        <th 
                                            className={`${styles.tableHeader} ${styles.sortableHeader}`}
                                            onClick={() => handleSort('toiletBaik')}
                                        >
                                            T. Baik <SortIcon column="toiletBaik" />
                                        </th>
                                        <th 
                                            className={`${styles.tableHeader} ${styles.sortableHeader}`}
                                            onClick={() => handleSort('toiletRusakSedang')}
                                        >
                                            T. R. Sedang <SortIcon column="toiletRusakSedang" />
                                        </th>
                                        <th 
                                            className={`${styles.tableHeader} ${styles.sortableHeader}`}
                                            onClick={() => handleSort('toiletRusakBerat')}
                                        >
                                            T. R. Berat <SortIcon column="toiletRusakBerat" />
                                        </th>
                                        <th 
                                            className={`${styles.tableHeader} ${styles.sortableHeader}`}
                                            onClick={() => handleSort('totalToilet')}
                                        >
                                            Total <SortIcon column="totalToilet" />
                                        </th>
                                        <th className={styles.tableHeader}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className={styles.tableBody}>
                                    {sortedAndPaginatedData.map((school, index) => (
                                        <tr key={school.npsn || index} className={styles.tableRow}>
                                            <td className={styles.tableCell}>
                                                {startItem + index}
                                            </td>
                                            <td className={styles.tableCell}>
                                                <span className={styles.npsn}>{school.npsn}</span>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <div className={styles.schoolNameCell}>
                                                    <span className={styles.schoolName}>{school.nama}</span>
                                                </div>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <JenjangBadge jenjang={school.jenjang} />
                                            </td>
                                            <td className={styles.tableCell}>
                                                <span className={styles.schoolType}>{school.tipe}</span>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <span className={styles.location}>{school.desa}</span>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <span className={styles.location}>{school.kecamatan}</span>
                                            </td>
                                            <td className={`${styles.tableCell} ${styles.numberCell}`}>
                                                <span className={styles.toiletGood}>{school.toiletBaik}</span>
                                            </td>
                                            <td className={`${styles.tableCell} ${styles.numberCell}`}>
                                                <span className={styles.toiletModerate}>{school.toiletRusakSedang}</span>
                                            </td>
                                            <td className={`${styles.tableCell} ${styles.numberCell}`}>
                                                <span className={styles.toiletBad}>{school.toiletRusakBerat}</span>
                                            </td>
                                            <td className={`${styles.tableCell} ${styles.numberCell}`}>
                                                <span className={styles.toiletTotal}>{school.totalToilet}</span>
                                            </td>
                                            <td className={styles.tableCell}>
                                                <button
                                                    className={styles.detailButton}
                                                    onClick={() => {
                                                        setSelectedSchool(school);
                                                        setCurrentView('detail');
                                                    }}
                                                >
                                                    Detail
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <footer className={styles.tableFooter}>
                            <div className={styles.paginationInfo}>
                                Menampilkan {startItem} - {endItem} dari {filteredSchoolData.length} sekolah
                            </div>
                            <div className={styles.paginationControls}>
                                <button
                                    className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
                                    onClick={() => goToPage(1)}
                                    disabled={currentPage === 1}
                                >
                                    Pertama
                                </button>
                                <button
                                    className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
                                    onClick={() => goToPage(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    Sebelumnya
                                </button>
                                
                                {/* Page numbers */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNumber;
                                    if (totalPages <= 5) {
                                        pageNumber = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNumber = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNumber = totalPages - 4 + i;
                                    } else {
                                        pageNumber = currentPage - 2 + i;
                                    }
                                    
                                    return (
                                        <button
                                            key={pageNumber}
                                            className={`${styles.paginationButton} ${currentPage === pageNumber ? styles.active : ''}`}
                                            onClick={() => goToPage(pageNumber)}
                                        >
                                            {pageNumber}
                                        </button>
                                    );
                                })}
                                
                                <button
                                    className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                                    onClick={() => goToPage(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                >
                                    Berikutnya
                                </button>
                                <button
                                    className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
                                    onClick={() => goToPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                >
                                    Terakhir
                                </button>
                            </div>
                        </footer>
                    )}
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
                return <DetailComponent school={selectedSchool.originalData} onBack={() => setCurrentView('main')} />;
            })()}
        </main>
    );
};

export default FacilitiesPage;