// src/pages/SchoolDetail/SchoolDetailPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, Tooltip
} from 'recharts';
import { getSchoolById } from '../../services/api/schoolApi.js';
import useSchoolMapDashboardData from '../../hooks/useSchoolMapDashboardData';
import 'leaflet/dist/leaflet.css';
import '../../services/utils/mapUtils.js';
import SimpleMap from '../../components/common/Map/SimpleMap';
import styles from './SchoolDetailPage.module.css';
import SchoolDetailPaud from '../../components/schools/SchoolDetail/Paud/SchoolDetailPaud';
import SchoolDetailSd from '../../components/schools/SchoolDetail/Sd/SchoolDetailSd';
import SchoolDetailSmp from '../../components/schools/SchoolDetail/Smp/SchoolDetailSmp';
import SchoolDetailPkbm from '../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm';
import SuspenseLoader from '../../components/common/SuspenseLoader/SuspenseLoader.jsx';

// ====================================================================================
// SEMUA KOMPONEN BAWAAN ANDA (ErrorBoundary, PieChartComponent, etc.) DIKEMBALIKAN
// KE VERSI ASLI YANG STABIL DAN TIDAK DIUBAH
// ====================================================================================
class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null }; }
    static getDerivedStateFromError(error) { return { hasError: true, error }; }
    componentDidCatch(error, errorInfo) { console.error('SchoolDetailPage Error:', error, errorInfo); }
    render() {
        if (this.state.hasError) { return (<div className={styles.errorContainer}><div className={styles.errorContent}><div className={styles.errorIcon}>⚠️</div><h2>Terjadi Kesalahan</h2><p>Komponen tidak dapat dimuat.</p><button className={styles.retryButton} onClick={() => this.setState({ hasError: false, error: null })}>Coba Lagi</button></div></div>); }
        return this.props.children;
    }
}
const PieChartComponent = React.memo(({ title, data }) => {
    const [hoveredIndex, setHoveredIndex] = useState(-1);
    const validData = data.filter(item => item && typeof item.value === 'number' && item.value > 0);
    if (validData.length === 0) { return (<div className={styles.chartContainer}><h3 className={styles.chartTitle}>{title}</h3><div className={styles.noDataState}><div className={styles.noDataIcon}>📊</div><p>Tidak ada data</p></div></div>); }
    const renderCustomLabel = (entry) => { const percent = ((entry.value / validData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1); return `${percent}%`; };
    const CustomTooltip = ({ active, payload }) => { if (active && payload && payload.length) { const d = payload[0]; const total = validData.reduce((s, i) => s + i.value, 0); const p = ((d.value / total) * 100).toFixed(1); return (<div className={styles.customTooltip}><div className={styles.tooltipHeader}><div className={styles.tooltipColorDot} style={{ backgroundColor: d.payload.color }}></div><span className={styles.tooltipLabel}>{d.name}</span></div><div className={styles.tooltipValue}>{d.value.toLocaleString('id-ID')} ({p}%)</div></div>); } return null; };
    return (<div className={`${styles.chartContainer} ${styles.fadeInUp}`}><h3 className={styles.chartTitle}>{title}</h3><div className={styles.chartWrapper}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={validData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#8884d8" label={renderCustomLabel} labelLine={false} animationBegin={0} animationDuration={1200} onMouseEnter={(_, index) => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(-1)}>{validData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} stroke={hoveredIndex === index ? '#ffffff' : 'none'} strokeWidth={hoveredIndex === index ? 3 : 0} style={{ filter: hoveredIndex === index ? 'brightness(1.1)' : 'brightness(1)', cursor: 'pointer' }} />))}</Pie><Tooltip content={<CustomTooltip />} /><Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" /></PieChart></ResponsiveContainer></div></div>);
});
const BarChartComponent = React.memo(({ title, data, colors }) => {
    if (!data || data.length === 0) { return (<div className={styles.chartContainer}><h3 className={styles.chartTitle}>{title}</h3><div className={styles.noDataState}><div className={styles.noDataIcon}>📈</div><p>Tidak ada data</p></div></div>); }
    const CustomTooltip = ({ active, payload, label }) => { if (active && payload && payload.length) { return (<div className={styles.customTooltip}><div className={styles.tooltipHeader}><span className={styles.tooltipLabel}>{label}</span></div><div className={styles.tooltipValue}>{payload[0].value.toLocaleString('id-ID')} unit</div></div>); } return null; };
    return (<div className={`${styles.chartContainer} ${styles.fadeInUp}`}><h3 className={styles.chartTitle}>{title}</h3><div className={styles.chartWrapperTall}><ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 30, right: 30, left: 20, bottom: 80 }}><defs>{colors.map((color, index) => (<linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.9}/><stop offset="100%" stopColor={color} stopOpacity={0.6}/></linearGradient>))}</defs><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} angle={-25} textAnchor="end" height={100} /><YAxis tickFormatter={(value) => value.toLocaleString('id-ID')} tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="value" animationDuration={1500} animationBegin={300}>{data.map((entry, index) => (<Cell key={`cell-bar-${index}`} fill={`url(#gradient-${index % colors.length})`} stroke={colors[index % colors.length]} strokeWidth={1} />))}</Bar></BarChart></ResponsiveContainer></div></div>);
});
const DataTable = React.memo(({ data, onDetailClick }) => {
    const [currentPage, setCurrentPage] = useState(1); const [searchTerm, setSearchTerm] = useState(''); const [itemsPerPage, setItemsPerPage] = useState(10); const [sortField, setSortField] = useState(''); const [sortDirection, setSortDirection] = useState('asc');
    const filteredData = useMemo(() => { let f = data; if (searchTerm) { f = data.filter(s => (s.namaSekolah||'').toLowerCase().includes(searchTerm.toLowerCase()) || (s.npsn||'').toString().includes(searchTerm) || (s.kecamatan||'').toLowerCase().includes(searchTerm.toLowerCase())); } if (sortField) { f = [...f].sort((a, b) => { let aVal = a[sortField]; let bVal = b[sortField]; if (typeof aVal === 'string') { aVal = aVal.toLowerCase(); bVal = bVal.toLowerCase(); } if (sortDirection === 'asc') return aVal > bVal ? 1 : -1; else return aVal < bVal ? 1 : -1; }); } return f; }, [data, searchTerm, sortField, sortDirection]);
    const { data: paginatedData, totalPages, totalItems } = useMemo(() => { const t = Math.ceil(filteredData.length / itemsPerPage); const s = (currentPage - 1) * itemsPerPage; return { data: filteredData.slice(s, s + itemsPerPage), totalPages: t > 0 ? t : 1, totalItems: filteredData.length }; }, [filteredData, currentPage, itemsPerPage]);
    const handleSort = (field) => { if (sortField === field) setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); else { setSortField(field); setSortDirection('asc'); } };
    const handleReset = useCallback(() => { setSearchTerm(''); setCurrentPage(1); setItemsPerPage(10); setSortField(''); setSortDirection('asc'); }, []);
    useEffect(() => { setCurrentPage(1); }, [searchTerm, itemsPerPage]);
    return (<div className={styles.tableContainer}><div className={styles.tableControls}><div className={styles.searchContainer}><div className={styles.searchIcon}>🔍</div><input type="text" placeholder="Cari nama sekolah, NPSN..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={styles.searchInput} />{searchTerm && (<button className={styles.clearSearch} onClick={() => setSearchTerm('')}>✕</button>)}</div><div className={styles.controlGroup}><label>Tampilkan:</label><select value={itemsPerPage} onChange={e => setItemsPerPage(Number(e.target.value))} className={styles.itemsPerPageSelect}><option value={5}>5</option><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select><button onClick={handleReset} className={styles.resetTableButton}>Reset</button></div></div><div className={styles.tableScrollContainer}><table className={styles.table}><thead><tr><th>NO</th><th className={styles.sortableHeader} onClick={() => handleSort('npsn')}>NPSN {sortField === 'npsn' && (sortDirection === 'asc' ? '↑' : '↓')}</th><th className={styles.sortableHeader} onClick={() => handleSort('namaSekolah')}>NAMA SEKOLAH {sortField === 'namaSekolah' && (sortDirection === 'asc' ? '↑' : '↓')}</th><th className={styles.sortableHeader} onClick={() => handleSort('jenjang')}>JENJANG {sortField === 'jenjang' && (sortDirection === 'asc' ? '↑' : '↓')}</th><th>TIPE</th><th>DESA</th><th>KECAMATAN</th><th>SISWA</th><th>KLS BAIK</th><th>R. SEDANG</th><th>R. BERAT</th><th>KURANG RKB</th><th>REHAB</th><th>PEMBANGUNAN</th><th>DETAIL</th></tr></thead><tbody>{paginatedData.length > 0 ? paginatedData.map((school, index) => (<tr key={`${school.npsn || index}-${index}`} className={styles.tableRow}><td>{((currentPage - 1) * itemsPerPage) + index + 1}</td><td><span className={styles.npsnBadge}>{school.npsn || '-'}</span></td><td className={styles.schoolNameCell}>{school.namaSekolah || '-'}</td><td><span className={`${styles.jenjangBadge} ${styles[school.jenjang?.toLowerCase()]}`}>{school.jenjang || '-'}</span></td><td>{school.tipeSekolah || '-'}</td><td>{school.desa || '-'}</td><td>{school.kecamatan || '-'}</td><td><span className={styles.numberBadge}>{school.student_count || 0}</span></td><td><span className={styles.conditionGood}>{(school.kondisiKelas?.baik || 0)}</span></td><td><span className={styles.conditionModerate}>{(school.kondisiKelas?.rusakSedang || 0)}</span></td><td><span className={styles.conditionBad}>{(school.kondisiKelas?.rusakBerat || 0)}</span></td><td><span className={styles.numberBadge}>{school.kurangRKB || 0}</span></td><td><span className={styles.numberBadge}>{school.rehabRuangKelas || 0}</span></td><td><span className={styles.numberBadge}>{school.pembangunanRKB || 0}</span></td><td><button className={styles.detailButton} onClick={() => onDetailClick && onDetailClick(school)}><span className={styles.detailIcon}>👁️</span> Detail</button></td></tr>)) : (<tr><td colSpan="15" className={styles.noDataCell}><div className={styles.noDataState}><div className={styles.noDataIcon}>🔍</div><p>Tidak ada data</p>{searchTerm && (<button onClick={() => setSearchTerm('')} className={styles.clearSearchButton}>Hapus Filter</button>)}</div></td></tr>)}</tbody></table></div><div className={styles.pagination}><div className={styles.paginationInfo}><span className={styles.pageInfo}>Menampilkan <strong>{paginatedData.length}</strong> dari <strong>{totalItems}</strong> data</span></div><div className={styles.pageButtons}><button disabled={currentPage === 1} onClick={() => setCurrentPage(1)} className={styles.pageButton}>⏮️</button><button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className={styles.pageButton}>⬅️</button><span className={styles.pageIndicator}><strong>{currentPage}</strong> / {totalPages}</span><button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className={styles.pageButton}>➡️</button><button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)} className={styles.pageButton}>⏭️</button></div></div></div>);
});

const SchoolDetailPage = () => {
    const { schoolData: allSchoolData, geoData, loading, error, jenjangList, kecamatanList, desaList } = useSchoolMapDashboardData();
    const [currentView, setCurrentView] = useState('main');
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [filterJenjang, setFilterJenjang] = useState('Semua Jenjang');
    const [filterKecamatan, setFilterKecamatan] = useState('Semua Kecamatan');
    const [filterDesa, setFilterDesa] = useState('Semua Desa');
    const [mapView] = useState({ center: [-7.21, 107.91], zoom: 11 });

    const handleDetailClick = useCallback(async (school) => {
        setCurrentView('detail');
        setIsDetailLoading(true);
        try {
            const detailedData = await getSchoolById(school.npsn);
            setSelectedSchool(detailedData);
        } catch (err) {
            console.error("Gagal memuat detail sekolah:", err);
            setCurrentView('main');
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    const handleBackToMain = useCallback(() => {
        setCurrentView('main');
        setSelectedSchool(null);
    }, []);

    const filteredData = useMemo(() => {
        let data = [...allSchoolData];
        if (filterJenjang !== 'Semua Jenjang') data = data.filter(d => d.jenjang === filterJenjang);
        if (filterKecamatan !== 'Semua Kecamatan') data = data.filter(d => d.kecamatan === filterKecamatan);
        if (filterDesa !== 'Semua Desa') data = data.filter(d => d.desa === filterDesa);
        return data;
    }, [allSchoolData, filterJenjang, filterKecamatan, filterDesa]);

    const schoolsForMap = useMemo(() => {
        return filteredData.map(school => ({
            nama: school.namaSekolah, npsn: school.npsn, alamat: school.originalData?.address || '-',
            kecamatan: school.kecamatan, desa: school.desa, coordinates: school.coordinates,
            jenjang: school.jenjang, fasilitas: school.kondisiKelas, originalData: school.originalData
        }));
    }, [filteredData]);
    
    // ===================================================================
    // INILAH SATU-SATUNYA BARIS YANG DIPERBAIKI DARI KODE ASLI ANDA
    // ===================================================================
    const chartData = useMemo(() => {
        let unitBaik = 0, unitRusakSedang = 0, unitRusakBerat = 0, rehabDilakukan = 0, pembangunanDilakukan = 0, totalKurangRKB = 0;
        filteredData.forEach(school => {
            unitBaik += school.kondisiKelas.baik; unitRusakSedang += school.kondisiKelas.rusakSedang; unitRusakBerat += school.kondisiKelas.rusakBerat;
            rehabDilakukan += school.rehabRuangKelas; pembangunanDilakukan += school.pembangunanRKB; totalKurangRKB += school.kurangRKB;
        });
        const totalUnitKelas = unitBaik + unitRusakSedang + unitRusakBerat;
        const belumDirehab = Math.max(0, unitRusakBerat - rehabDilakukan);
        const belumDibangun = Math.max(0, totalKurangRKB - pembangunanDilakukan);
        const totalIntervensi = pembangunanDilakukan + rehabDilakukan;
        
        // Perbaikan di sini: Langsung return object-nya
        return {
            pieDataList: [
                { title: "Kondisi Ruang Kelas", data: [{ name: "Baik", value: unitBaik, color: "#10b981" }, { name: "Rusak Sedang", value: unitRusakSedang, color: "#f59e0b" }, { name: "Rusak Berat", value: unitRusakBerat, color: "#ef4444" }] },
                { title: "Status Rehabilitasi", data: [{ name: "Sudah Direhab", value: rehabDilakukan, color: "#06b6d4" }, { name: "Belum Direhab", value: belumDirehab, color: "#f97316" }] },
                { title: "Status Pembangunan", data: [{ name: "Sudah Dibangun", value: pembangunanDilakukan, color: "#8b5cf6" }, { name: "Belum Dibangun", value: belumDibangun, color: "#ec4899" }] },
            ],
            barKondisiKelas: [{ name: "Total Kelas", value: totalUnitKelas }, { name: "Kondisi Baik", value: unitBaik }, { name: "Rusak Sedang", value: unitRusakSedang }, { name: "Rusak Berat", value: unitRusakBerat }, { name: "Kurang RKB", value: totalKurangRKB }],
            barIntervensiKelas: [{ name: "Total Intervensi", value: totalIntervensi }, { name: "Pembangunan RKB", value: pembangunanDilakukan }, { name: "Rehab Ruang Kelas", value: rehabDilakukan }],
        };
    }, [filteredData]);
    
    const handleResetAllFilters = useCallback(() => { setFilterJenjang('Semua Jenjang'); setFilterKecamatan('Semua Kecamatan'); setFilterDesa('Semua Desa'); }, []);
    
    if (loading) { return (<div className={styles.loadingContainer}><div className={styles.loadingContent}><div className={styles.modernSpinner}><div className={styles.spinnerRing}></div><div className={styles.spinnerRing}></div><div className={styles.spinnerRing}></div></div><h2 className={styles.loadingTitle}>Memuat Data Sekolah</h2><p className={styles.loadingSubtitle}>Mengambil informasi terbaru...</p><div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div></div></div>); }
    if (error) { return (<div className={styles.errorContainer}><div className={styles.errorContent}><div className={styles.errorIcon}>⚠️</div><h2 className={styles.errorTitle}>Gagal Memuat Data</h2><p className={styles.errorMessage}>{error}</p><button className={styles.retryButton} onClick={() => window.location.reload()}>🔄 Muat Ulang</button></div></div>); }

    const renderDetailView = () => {
        if (isDetailLoading) { return (<div className={styles.loadingContainer}><div className={styles.loadingContent}><SuspenseLoader /><h2 className={styles.loadingTitle}>Memuat Detail Sekolah...</h2></div></div>); }
        if (!selectedSchool) { return (<div className={styles.errorContainer}><div className={styles.errorContent}><h2 className={styles.errorTitle}>Data Tidak Ditemukan</h2><button className={styles.retryButton} onClick={handleBackToMain}>Kembali</button></div></div>); }
        let DetailComponent;
        switch (selectedSchool.level) {
            case 'PAUD': DetailComponent = SchoolDetailPaud; break;
            case 'SD': DetailComponent = SchoolDetailSd; break;
            case 'SMP': DetailComponent = SchoolDetailSmp; break;
            case 'PKBM': DetailComponent = SchoolDetailPkbm; break;
            default: return <div className={styles.noDetailAvailable}>Detail tidak tersedia.</div>;
        }
        return <DetailComponent schoolData={selectedSchool} onBack={handleBackToMain} />;
    };

    const isDesaFilterApplied = filterKecamatan !== 'Semua Kecamatan' && filterDesa !== 'Semua Desa';

    const renderMainView = () => (
        <div className={styles.pageContainer}>
            <header className={`${styles.pageHeader} ${styles.fadeInDown}`}><div className={styles.headerContent}><h1 className={styles.pageTitle}>Detail Peta Sekolah</h1></div></header>
            <main>
                <section className={`${styles.card} ${styles.mapCard} ${styles.fadeInUp}`}>
                    <div className={styles.cardHeader}><div className={styles.cardTitleGroup}><h2 className={styles.cardTitle}><span className={styles.cardIcon}>🗺️</span> Peta Sebaran Sekolah</h2><p className={styles.cardSubtitle}>{isDesaFilterApplied ? "Menampilkan lokasi sekolah individu" : "Menampilkan klaster sekolah per wilayah"}</p></div><div className={styles.mapLegend}><div className={styles.legendItem}><span className={styles.legendDot} style={{backgroundColor: '#10b981'}}></span><span>Baik</span></div><div className={styles.legendItem}><span className={styles.legendDot} style={{backgroundColor: '#f59e0b'}}></span><span>Perbaikan</span></div><div className={styles.legendItem}><span className={styles.legendDot} style={{backgroundColor: '#ef4444'}}></span><span>Buruk</span></div></div></div>
                    <div className={styles.mapContainer}><div className={styles.mapWrapper}><ErrorBoundary><SimpleMap schools={schoolsForMap} geoData={geoData} initialCenter={mapView.center} initialZoom={mapView.zoom} isDesaFiltered={isDesaFilterApplied} /></ErrorBoundary></div></div>
                </section>
                <section className={`${styles.card} ${styles.fadeInUp}`}>
                    <div className={styles.cardHeader}><div className={styles.cardTitleGroup}><h2 className={styles.cardTitle}><span className={styles.cardIcon}>🔍</span> Filter Statistik & Data</h2><p className={styles.cardSubtitle}>Saring data untuk chart dan tabel di bawah ini</p></div><button onClick={handleResetAllFilters} className={styles.resetButton}><span className={styles.resetIcon}>🔄</span> Reset Filter</button></div>
                    <div className={styles.filterContainer}>
                        <div className={styles.filterGroup}><label htmlFor="filter-jenjang" className={styles.filterLabel}><span className={styles.labelIcon}>🎓</span> Jenjang</label><select id="filter-jenjang" value={filterJenjang} onChange={e => setFilterJenjang(e.target.value)} className={styles.filterSelect}><option>Semua Jenjang</option>{jenjangList.map((jenjang, idx) => (<option key={idx} value={jenjang}>{jenjang}</option>))}</select></div>
                        <div className={styles.filterGroup}><label htmlFor="filter-kecamatan" className={styles.filterLabel}><span className={styles.labelIcon}>🏘️</span> Kecamatan</label><select id="filter-kecamatan" value={filterKecamatan} onChange={e => setFilterKecamatan(e.target.value)} className={styles.filterSelect}><option>Semua Kecamatan</option>{kecamatanList.map((kec, idx) => (<option key={idx} value={kec}>{kec}</option>))}</select></div>
                        <div className={styles.filterGroup}><label htmlFor="filter-desa" className={styles.filterLabel}><span className={styles.labelIcon}>🏠</span> Desa/Kelurahan</label><select id="filter-desa" value={filterDesa} onChange={e => setFilterDesa(e.target.value)} className={styles.filterSelect} disabled={filterKecamatan === 'Semua Kecamatan'}><option>Semua Desa</option>{desaList.filter(desa => filterKecamatan === 'Semua Kecamatan' || allSchoolData.some(s => s.kecamatan === filterKecamatan && s.desa === desa)).map((desa, idx) => (<option key={idx} value={desa}>{desa}</option>))}</select></div>
                    </div>
                </section>
                <section className={styles.chartsGrid}>
                    {/* Perbaikan di sini: langsung akses chartData.pieDataList */}
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
                            <BarChartComponent title="Statistik Kondisi Ruang Kelas" data={chartData.barKondisiKelas} colors={["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]} />
                        </div>
                    </ErrorBoundary>
                    <ErrorBoundary>
                        <div className={`${styles.card} ${styles.fadeInUp}`}>
                            <BarChartComponent title="Statistik Intervensi Ruang Kelas" data={chartData.barIntervensiKelas} colors={["#06b6d4", "#f97316", "#8b5cf6"]} />
                        </div>
                    </ErrorBoundary>
                </section>
                <section className={`${styles.card} ${styles.fadeInUp}`}>
                    <div className={styles.cardHeader}><div className={styles.cardTitleGroup}><h2 className={styles.cardTitle}><span className={styles.cardIcon}>📊</span> Data Detail Sekolah</h2><p className={styles.cardSubtitle}>Tabel lengkap {filteredData.length} data sekolah berdasarkan filter</p></div><div className={styles.tableActions}><button className={styles.exportButton}><span className={styles.exportIcon}>📥</span> Export Data</button></div></div>
                    <ErrorBoundary><DataTable data={filteredData} onDetailClick={handleDetailClick} /></ErrorBoundary>
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