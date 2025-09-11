import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip, LabelList } from 'recharts';
import { Search, X, ChevronDown, TrendingUp, Calculator, Calendar, Building, Filter } from 'lucide-react';
import styles from './BudgetPage.module.css';

// Configuration for costs per class for each level
const BIAYA_PER_KELAS = {
  PAUD: {
    RUSAK_BERAT: 75000000,
    RUSAK_SEDANG: 100000000,
    RKB: 150000000
  },
  SD: {
    RUSAK_BERAT: 150000000,
    RUSAK_SEDANG: 100000000,
    RKB: 200000000
  },
  SMP: {
    RUSAK_BERAT: 180000000,
    RUSAK_SEDANG: 100000000,
    RKB: 220000000
  },
  PKBM: {
    RUSAK_BERAT: 100000000,
    RUSAK_SEDANG: 100000000,
    RKB: 200000000
  }
};

// Enhanced Loading Component
const LoadingSpinner = () => (
  <div className={styles.loadingContainer}>
    <div className={styles.spinner}></div>
    <div className={styles.loadingText}>
      <h3>Memuat Dashboard...</h3>
      <p>Sedang mengambil data infrastruktur pendidikan</p>
    </div>
  </div>
);

// Enhanced Card Component
const Card = ({ children, className = '', animate = true }) => (
  <div className={`${styles.card} ${animate ? styles.cardAnimated : ''} ${className}`}>
    {children}
  </div>
);

// Enhanced Button Component
const Button = ({ children, variant = 'primary', size = 'md', onClick, disabled, icon, className = '' }) => (
  <button 
    className={`${styles.button} ${styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`]} ${styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`]} ${className}`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <span className={styles.buttonIcon}>{icon}</span>}
    {children}
  </button>
);

// Enhanced Select Component
const Select = ({ value, onChange, options, placeholder, label, icon }) => (
  <div className={styles.selectWrapper}>
    {label && <label className={styles.selectLabel}>{label}</label>}
    <div className={styles.selectContainer}>
      {icon && <div className={styles.selectIcon}>{icon}</div>}
      <select 
        className={`${styles.select} ${icon ? styles.selectWithIcon : ''}`}
        value={value}
        onChange={onChange}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className={styles.selectArrow} size={20} />
    </div>
  </div>
);

// Enhanced Stat Card Component
const StatCard = ({ title, value, icon, color = 'primary', trend, animate = true }) => (
  <Card className={`${styles.statCard} ${styles[`statCard${color.charAt(0).toUpperCase() + color.slice(1)}`]}`} animate={animate}>
    <div className={styles.statCardHeader}>
      <div className={`${styles.statCardIcon} ${styles[`statCardIcon${color.charAt(0).toUpperCase() + color.slice(1)}`]}`}>
        {icon}
      </div>
      {trend && (
        <div className={`${styles.trendIndicator} ${trend > 0 ? styles.trendPositive : styles.trendNegative}`}>
          <TrendingUp size={16} />
          <span>{trend > 0 ? '+' : ''}{trend}%</span>
        </div>
      )}
    </div>
    <h3 className={styles.statCardValue}>{value}</h3>
    <p className={styles.statCardTitle}>{title}</p>
  </Card>
);

export default function BudgetPage() {
  const [jenjang, setJenjang] = useState('PAUD');
  const [kecamatan, setKecamatan] = useState('');
  const [kecamatanList, setKecamatanList] = useState([]);
  const [currentData, setCurrentData] = useState(null);
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const urls = {
          paud: 'https://peta-sekolah.vercel.app/paud/data/paud.json',
          sd: 'https://peta-sekolah.vercel.app/sd/data/sd_new.json',
          smp: 'https://peta-sekolah.vercel.app/smp/data/smp.json',
          pkbm: 'https://peta-sekolah.vercel.app/pkbm/data/pkbm.json',
          kegiatanPaud: 'https://peta-sekolah.vercel.app/paud/data/data_kegiatan.json',
          kegiatanSd: 'https://peta-sekolah.vercel.app/sd/data/data_kegiatan.json',
          kegiatanSmp: 'https://peta-sekolah.vercel.app/smp/data/data_kegiatan.json',
          kegiatanPkbm: 'https://peta-sekolah.vercel.app/pkbm/data/data_kegiatan.json',
          kecamatan: 'https://peta-sekolah.vercel.app/data/kecamatan.geojson',
        };

        const responses = await Promise.all(Object.values(urls).map(url => fetch(url)));
        const jsonData = await Promise.all(responses.map(res => res.json()));

        const [
          paudData, sdData, smpData, pkbmData,
          kegiatanPaud, kegiatanSd, kegiatanSmp, kegiatanPkbm,
          kecamatanData
        ] = jsonData;
        
        const flattenSchoolData = (dataByKecamatan) => {
          return Object.entries(dataByKecamatan).flatMap(([kecamatanName, schools]) => 
            schools.map(school => ({ ...school, kecamatan: kecamatanName }))
          );
        };
        
        const allPaud = flattenSchoolData(paudData);
        const allSd = flattenSchoolData(sdData);
        const allSmp = flattenSchoolData(smpData);
        const allPkbm = flattenSchoolData(pkbmData);

        const npsnToKecamatanMap = new Map();
        [...allPaud, ...allSd, ...allSmp, ...allPkbm].forEach(school => {
          if (school.npsn) {
            npsnToKecamatanMap.set(school.npsn.toString(), school.kecamatan);
          }
        });

        const addKecamatanToKegiatan = (kegiatanArr) => {
          if (!Array.isArray(kegiatanArr)) return [];
          return kegiatanArr.map(k => ({
            ...k,
            kecamatan: npsnToKecamatanMap.get(k.npsn?.toString()) || 'Tidak Diketahui'
          }));
        };

        const allDistricts = kecamatanData.features
          .map(feature => feature.properties?.district)
          .filter(Boolean);
        setKecamatanList([...new Set(allDistricts)].sort());

        setAllData({
          PAUD: { sekolah: allPaud, kegiatan: addKecamatanToKegiatan(kegiatanPaud) },
          SD: { sekolah: allSd, kegiatan: addKecamatanToKegiatan(kegiatanSd) },
          SMP: { sekolah: allSmp, kegiatan: addKecamatanToKegiatan(kegiatanSmp) },
          PKBM: { sekolah: allPkbm, kegiatan: addKecamatanToKegiatan(kegiatanPkbm) },
        });

      } catch (err) {
        console.error("Gagal memuat atau memproses data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (!allData) return;

    const calculateBudgetData = (data, jenjang, kecamatan) => {
      if (!data || !data[jenjang]) return null;

      const { sekolah: sekolahData, kegiatan: kegiatanData } = data[jenjang];
      const filterByKecamatan = (item) => !kecamatan || item.kecamatan === kecamatan;

      const filteredSekolah = sekolahData.filter(filterByKecamatan);
      const filteredKegiatan = kegiatanData.filter(filterByKecamatan);
      
      const rusakSedang = filteredSekolah.reduce((acc, curr) => acc + (curr.class_condition?.classrooms_moderate_damage || 0), 0);
      const rusakBerat = filteredSekolah.reduce((acc, curr) => acc + (curr.class_condition?.classrooms_heavy_damage || 0), 0);
      const kurangRKB = filteredSekolah.reduce((acc, curr) => acc + (curr.class_condition?.lacking_rkb || 0), 0);
      
      const rehabilitasi = filteredKegiatan
        .filter(k => k.Kegiatan === 'Rehab Ruang Kelas')
        .reduce((acc, curr) => acc + (curr.Lokal || 0), 0);

      const pembangunanRKB = filteredKegiatan
        .filter(k => k.Kegiatan === 'Pembangunan RKB')
        .reduce((acc, curr) => acc + (curr.Lokal || 0), 0);
      
      const rekapData = [
        { name: 'Rusak Sedang', value: rusakSedang, color: '#3B82F6' },
        { name: 'Rusak Berat', value: rusakBerat, color: '#EF4444' },
        { name: 'Kurang RKB', value: kurangRKB, color: '#F59E0B' },
        { name: 'Rehabilitasi', value: rehabilitasi, color: '#10B981' },
        { name: 'Pembangunan RKB', value: pembangunanRKB, color: '#8B5CF6' }
      ];

      const belumRehabBerat = Math.max(0, rusakBerat - rehabilitasi);
      const belumBangunRKB = Math.max(0, kurangRKB - pembangunanRKB);

      const kebutuhanData = [
        { name: 'Belum Direhab Rusak Berat', value: belumRehabBerat, color: '#EF4444' },
        { name: 'Belum Dibangun RKB', value: belumBangunRKB, color: '#3B82F6' }
      ];
      
      const biaya = BIAYA_PER_KELAS[jenjang];
      
      const biayaRehabBerat = belumRehabBerat * biaya.RUSAK_BERAT;
      const biayaRehabSedang = rusakSedang * biaya.RUSAK_SEDANG;
      const biayaBangunRKB = belumBangunRKB * biaya.RKB;
      
      const anggaranDetail = {
        belumDirehabRusakBerat: { jumlahKelas: belumRehabBerat, biayaPerKelas: biaya.RUSAK_BERAT, totalBiaya: biayaRehabBerat },
        belumDirehabRusakSedang: { jumlahKelas: rusakSedang, biayaPerKelas: biaya.RUSAK_SEDANG, totalBiaya: biayaRehabSedang },
        belumDibangunRKB: { jumlahKelas: belumBangunRKB, biayaPerKelas: biaya.RKB, totalBiaya: biayaBangunRKB }
      };

      const totalBiaya5Tahun = biayaRehabBerat + biayaRehabSedang + biayaBangunRKB;
      const yearlyAnggaran = totalBiaya5Tahun > 0 ? Math.floor(totalBiaya5Tahun / 5) : 0;
      const rehabBeratYearly = totalBiaya5Tahun > 0 ? Math.floor(biayaRehabBerat / 5) : 0;
      const rehabSedangYearly = totalBiaya5Tahun > 0 ? Math.floor(biayaRehabSedang / 5) : 0;
      const bangunRkbYearly = totalBiaya5Tahun > 0 ? Math.floor(biayaBangunRKB / 5) : 0;

      const rencanaAnggaran5Tahun = Array.from({ length: 5 }, (_, i) => ({ tahun: 2025 + i, anggaran: yearlyAnggaran }));
      const rencanaAnggaranTahunan = Array.from({ length: 5 }, (_, i) => ({
        tahun: 2025 + i,
        rehabRusakBerat: rehabBeratYearly,
        rehabRusakSedang: rehabSedangYearly,
        pembangunanRKB: bangunRkbYearly,
      }));

      return { rekapData, kebutuhanData, anggaranDetail, rencanaAnggaran5Tahun, rencanaAnggaranTahunan };
    };

    setCurrentData(calculateBudgetData(allData, jenjang, kecamatan));
  }, [jenjang, kecamatan, allData]);

  const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || amount < 0) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className={styles.pageWrapper}>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.pageWrapper}>
        <Card className={styles.errorCard}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.errorTitle}>Terjadi Kesalahan</h2>
          <p className={styles.errorMessage}>{error}</p>
          <Button onClick={() => window.location.reload()} variant="primary">
            Muat Ulang
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentData) {
    return (
      <div className={styles.pageWrapper}>
        <Card className={styles.noDataCard}>
          <p>Tidak ada data untuk ditampilkan.</p>
        </Card>
      </div>
    );
  }

  const total5Tahun = currentData.rencanaAnggaran5Tahun.reduce((sum, item) => sum + item.anggaran, 0);

  const jenjangOptions = [
    { value: 'PAUD', label: 'PAUD' },
    { value: 'SD', label: 'SD' },
    { value: 'SMP', label: 'SMP' },
    { value: 'PKBM', label: 'PKBM' }
  ];

  const kecamatanOptions = kecamatanList.map(name => ({ value: name, label: name }));

  return (
    <div className={styles.pageWrapper}>
      {/* Header Section */}
      <Card className={styles.headerCard} animate={true}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <Calculator size={32} />
          </div>
          <div className={styles.headerText}>
            <h1 className={styles.pageTitle}>
              Dashboard Rekapitulasi Anggaran {jenjang}
            </h1>
            <p className={styles.pageSubtitle}>
              Monitoring dan Analisis Kebutuhan Infrastruktur Pendidikan
              {kecamatan && ` - Kecamatan ${kecamatan}`}
            </p>
          </div>
        </div>
      </Card>

      {/* Filters Section */}
      <Card className={styles.filtersCard} animate={true}>
        <div className={styles.filtersHeader}>
          <Filter size={24} />
          <h2 className={styles.sectionTitle}>Filter & Pengaturan</h2>
        </div>
        
        <div className={styles.filtersGrid}>
          <Select
            value={jenjang}
            onChange={(e) => setJenjang(e.target.value)}
            options={jenjangOptions}
            label="Pilih Jenjang Pendidikan"
            icon={<Building size={20} />}
          />
          <Select
            value={kecamatan}
            onChange={(e) => setKecamatan(e.target.value)}
            options={kecamatanOptions}
            placeholder="Semua Kecamatan"
            label="Pilih Kecamatan"
            icon={<Building size={20} />}
          />
        </div>
      </Card>

      {/* Stats Overview */}
      <div className={styles.statsGrid}>
        <StatCard
          title="Total Anggaran 5 Tahun"
          value={formatCurrency(total5Tahun)}
          icon={<Calculator size={24} />}
          color="primary"
          trend={12.5}
        />
        <StatCard
          title="Rusak Berat"
          value={`${currentData.anggaranDetail.belumDirehabRusakBerat.jumlahKelas} Kelas`}
          icon={<Building size={24} />}
          color="accent"
          trend={-5.2}
        />
        <StatCard
          title="Rusak Sedang"
          value={`${currentData.anggaranDetail.belumDirehabRusakSedang.jumlahKelas} Kelas`}
          icon={<Building size={24} />}
          color="secondary"
          trend={2.8}
        />
        <StatCard
          title="Kurang RKB"
          value={`${currentData.anggaranDetail.belumDibangunRKB.jumlahKelas} Kelas`}
          icon={<Building size={24} />}
          color="success"
          trend={-8.1}
        />
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        {/* Rekapitulasi Chart */}
        <Card className={styles.chartCard} animate={true}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderIcon}>
              <TrendingUp size={20} />
            </div>
            <h3 className={styles.chartTitle}>
              Rekapitulasi Kerusakan & Kegiatan Ruang Kelas
            </h3>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={currentData.rekapData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  interval={0} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip 
                  formatter={(value) => [`${value} kelas`, 'Jumlah']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '14px'
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="value" position="top" fontSize={11} fill="#374151" />
                  {currentData.rekapData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Kebutuhan Chart */}
        <Card className={styles.chartCard} animate={true}>
          <div className={styles.chartHeader}>
            <div className={styles.chartHeaderIcon}>
              <Building size={20} />
            </div>
            <h3 className={styles.chartTitle}>
              Jumlah Kelas Belum Ditangani
            </h3>
          </div>
          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={currentData.kebutuhanData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="name" 
                  fontSize={12} 
                  interval={0} 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  stroke="#6B7280"
                />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip 
                  formatter={(value) => [`${value} kelas`, 'Jumlah']}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '14px'
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="value" position="top" fontSize={11} fill="#374151" />
                  {currentData.kebutuhanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tables Section - UPDATED: Changed from grid to vertical stack */}
      <div className={styles.tablesSection}>
        {/* Budget Details Table */}
        <Card className={styles.tableCard} animate={true}>
          <div className={styles.tableHeader}>
            <div className={styles.tableHeaderIcon}>
              <Calculator size={20} />
            </div>
            <h3 className={styles.tableTitle}>
              Estimasi Anggaran Kebutuhan {jenjang} {kecamatan && `- ${kecamatan}`}
            </h3>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.budgetTable}>
              <thead>
                <tr>
                  <th>JENIS KEBUTUHAN</th>
                  <th>JUMLAH KELAS</th>
                  <th>BIAYA PER KELAS</th>
                  <th>TOTAL BIAYA</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: 'Belum Direhab Rusak Berat',
                    data: currentData.anggaranDetail.belumDirehabRusakBerat,
                    color: '#EF4444'
                  },
                  {
                    label: 'Belum Direhab Rusak Sedang',
                    data: currentData.anggaranDetail.belumDirehabRusakSedang,
                    color: '#F59E0B'
                  },
                  {
                    label: 'Belum Dibangun RKB',
                    data: currentData.anggaranDetail.belumDibangunRKB,
                    color: '#3B82F6'
                  }
                ].map((item, index) => (
                  <tr key={index}>
                    <td>
                      <div className={styles.categoryCell}>
                        <div 
                          className={styles.colorIndicator}
                          style={{ backgroundColor: item.color }}
                        ></div>
                        {item.label}
                      </div>
                    </td>
                    <td className={styles.centerAlign}>
                      {item.data.jumlahKelas || 0}
                    </td>
                    <td className={styles.centerAlign}>
                      {formatCurrency(item.data.biayaPerKelas || 0)}
                    </td>
                    <td className={styles.totalCell}>
                      {formatCurrency(item.data.totalBiaya || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 5-Year Budget Plan - UPDATED: Now full width */}
        <Card className={styles.planCard} animate={true}>
          <div className={styles.planHeader}>
            <div className={styles.planHeaderIcon}>
              <Calendar size={20} />
            </div>
            <h3 className={styles.planTitle}>Rencana Anggaran 5 Tahun</h3>
          </div>
          <div className={styles.planTableWrapper}>
            <table className={styles.planTable}>
              <thead>
                <tr>
                  <th>TAHUN</th>
                  <th>RENCANA ANGGARAN</th>
                </tr>
              </thead>
              <tbody>
                {currentData.rencanaAnggaran5Tahun.map((item, index) => (
                  <tr key={index}>
                    <td className={styles.yearCell}>{item.tahun}</td>
                    <td className={styles.budgetCell}>
                      {formatCurrency(item.anggaran)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td className={styles.totalLabel}>TOTAL 5 TAHUN</td>
                  <td className={styles.totalValue}>
                    {formatCurrency(total5Tahun)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>

        {/* Annual Budget Details - UPDATED: Now full width */}
        <Card className={styles.planCard} animate={true}>
          <div className={styles.planHeader}>
            <div className={styles.planHeaderIcon}>
              <TrendingUp size={20} />
            </div>
            <h3 className={styles.planTitle}>Rencana Anggaran Tahunan (2025-2029)</h3>
          </div>
          <div className={styles.planTableWrapper}>
            <table className={styles.annualTable}>
              <thead>
                <tr>
                  <th>TAHUN</th>
                  <th>REHAB RUSAK BERAT</th>
                  <th>REHAB RUSAK SEDANG</th>
                  <th>PEMBANGUNAN RKB</th>
                </tr>
              </thead>
              <tbody>
                {currentData.rencanaAnggaranTahunan.map((item, index) => (
                  <tr key={index}>
                    <td className={styles.yearCell}>{item.tahun}</td>
                    <td className={styles.rehabBeratCell}>
                      {formatCurrency(item.rehabRusakBerat)}
                    </td>
                    <td className={styles.rehabSedangCell}>
                      {formatCurrency(item.rehabRusakSedang)}
                    </td>
                    <td className={styles.rkbCell}>
                      {formatCurrency(item.pembangunanRKB)}
                    </td>
                  </tr>
                ))}
                <tr className={styles.subtotalRow}>
                  <td className={styles.subtotalLabel}>SUBTOTAL</td>
                  <td className={styles.subtotalValue}>
                    {formatCurrency(currentData.rencanaAnggaranTahunan.reduce((sum, item) => sum + item.rehabRusakBerat, 0))}
                  </td>
                  <td className={styles.subtotalValue}>
                    {formatCurrency(currentData.rencanaAnggaranTahunan.reduce((sum, item) => sum + item.rehabRusakSedang, 0))}
                  </td>
                  <td className={styles.subtotalValue}>
                    {formatCurrency(currentData.rencanaAnggaranTahunan.reduce((sum, item) => sum + item.pembangunanRKB, 0))}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr className={styles.totalRow}>
                  <td className={styles.totalLabel}>TOTAL 5 TAHUN</td>
                  <td colSpan="3" className={styles.totalValue}>
                    {formatCurrency(total5Tahun)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </div>

      {/* Footer */}
      <Card className={styles.footerCard} animate={true}>
        <p className={styles.footerText}>
          © 2024 Dashboard Rekapitulasi Anggaran - Sistem Informasi Infrastruktur Pendidikan
        </p>
      </Card>
    </div>
  );
}