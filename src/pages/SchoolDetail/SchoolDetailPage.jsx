import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, Tooltip
} from 'recharts';
import Map from '../Map/Map'; // Import Map component yang sebenarnya
import styles from './SchoolDetailPage.module.css';

// Import komponen detail per jenjang (TAMBAHAN BARU)
import SchoolDetailPaud from '../../components/schools/SchoolDetail/Paud/SchoolDetailPaud';
import SchoolDetailSd from '../../components/schools/SchoolDetail/Sd/SchoolDetailSd';
import SchoolDetailSmp from '../../components/schools/SchoolDetail/Smp/SchoolDetailSmp';
import SchoolDetailPkbm from '../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm';

// Error Boundary Component
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
          <h2>Terjadi kesalahan saat memuat data</h2>
          <p>Silakan refresh halaman atau coba lagi nanti.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className={styles.retryButton}
          >
            Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// PERBAIKAN: PieChart Component dengan data validation dan console log untuk debugging
const PieChartComponent = ({ title, data }) => {
  console.log(`PieChart ${title}:`, data);
  
  // Validasi data
  const validData = data.filter(item => item.value > 0);
  
  if (validData.length === 0) {
    return (
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Tidak ada data untuk ditampilkan
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.chartWrapper} style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={validData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              fill="#8884d8"
              
            >
              {validData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [value, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// PERBAIKAN: BarChart Component dengan data validation
const BarChartComponent = ({ title, data, colors }) => {
  console.log(`BarChart ${title}:`, data);
  
  if (!data || data.length === 0) {
    return (
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
          Tidak ada data untuk ditampilkan
        </div>
      </div>
    );
  }

  return (
    <div className={styles.chartContainer}>
      <h3 className={styles.chartTitle}>{title}</h3>
      <div className={styles.chartWrapperTall} style={{ width: '100%', height: '400px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 14 }}
              interval={0}
              angle={-20}
              textAnchor="end"
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value">
              {data.map((entry, index) => (
                <Cell
                  key={`cell-bar-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// PERBAIKAN: DataTable sekarang menerima onDetailClick sebagai prop
const DataTable = React.memo(({ data, onDetailClick }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);

  console.log('DataTable received onDetailClick:', typeof onDetailClick);

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    
    return data.filter(school => {
      const namaSekolah = school.namaSekolah || school.nama_sekolah || school.school_name || school.nama || '';
      const npsn = school.npsn || school.school_id || school.id || '';
      
      return namaSekolah.toLowerCase().includes(searchTerm.toLowerCase()) ||
             npsn.toString().includes(searchTerm);
    });
  }, [data, searchTerm]);

  const paginatedData = useMemo(() => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    return {
      data: filteredData.slice(startIndex, endIndex),
      totalPages,
      totalItems: filteredData.length
    };
  }, [filteredData, currentPage, itemsPerPage]);

  const handleReset = useCallback(() => {
    setSearchTerm('');
    setCurrentPage(1);
    setItemsPerPage(5);
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, itemsPerPage]);

  return (
    <div className={styles.tableContainer}>
      <div className={styles.tableHeader}>
        <input
          type="text"
          placeholder="Cari nama sekolah atau NPSN..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={itemsPerPage}
          onChange={e => setItemsPerPage(Number(e.target.value))}
          className={styles.itemsPerPageSelect}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
        </select>
        <button onClick={handleReset} className={styles.resetButton}>
          Reset Filter
        </button>
      </div>
      
      <div className={styles.tableInfo}>
        Menampilkan {paginatedData.data.length} dari {paginatedData.totalItems} data
      </div>

      <div className={styles.tableScrollContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHead}>
            <tr>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellNo}`}>NO</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellNpsn}`}>NPSN</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellNama}`}>NAMA SEKOLAH</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellJenjang}`}>JENJANG</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellTipe}`}>TIPE SEKOLAH</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellDesa}`}>DESA</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellKecamatan}`}>KECAMATAN</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellSiswa}`}>SISWA</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellBaik}`}>KELAS BAIK</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRusakSedang}`}>KELAS RUSAK SEDANG</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRusakBerat}`}>KELAS RUSAK BERAT</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellKurang}`}>KURANG RKB</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellRehab}`}>REHAB RUANG KELAS</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellPembangunan}`}>PEMBANGUNAN RKB</th>
              <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellDetail}`}>DETAIL</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.data.map((school, index) => (
              <tr
                key={`${school.npsn || index}-${index}`}
                className={styles.tableRow}
              >
                <td className={styles.tableCell}>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                <td className={styles.tableCell}>{school.npsn || '-'}</td>
                <td className={styles.tableCell}>{school.namaSekolah || '-'}</td>
                <td className={styles.tableCell}>{school.jenjang || '-'}</td>
                <td className={styles.tableCell}>{school.tipeSekolah || '-'}</td>
                <td className={styles.tableCell}>{school.desa || '-'}</td>
                <td className={styles.tableCell}>{school.kecamatan || '-'}</td>
                <td className={styles.tableCell}>{school.student_count || 0}</td>
                <td className={styles.tableCell}>
                  {(school.kondisiKelas?.baik || 0)}
                </td>
                <td className={styles.tableCell}>
                  {(school.kondisiKelas?.rusakSedang || 0)}
                </td>
                <td className={styles.tableCell}>
                  {(school.kondisiKelas?.rusakBerat || 0)}
                </td>
                <td className={styles.tableCell}>{school.kurangRKB || 0}</td>
                <td className={styles.tableCell}>{school.rehabRuangKelas || 0}</td>
                <td className={styles.tableCell}>{school.pembangunanRKB || 0}</td>
                <td className={styles.tableCellCenter}>
                  <button 
                    className={styles.detailButton}
                    onClick={() => {
                      console.log('Detail button clicked for school:', school.namaSekolah);
                      if (onDetailClick) {
                        onDetailClick(school);
                      } else {
                        console.error('onDetailClick function not provided!');
                        alert(`Detail sekolah: ${school.namaSekolah} - onDetailClick tidak tersedia`);
                      }
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

      <div className={styles.pagination}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          className={`${styles.pageButton} ${currentPage === 1 ? styles.pageButtonDisabled : styles.pageButtonActive}`}
        >
          Prev
        </button>
        <span className={styles.pageInfo}>
          Page {currentPage} of {paginatedData.totalPages}
        </span>
        <button
          disabled={currentPage === paginatedData.totalPages}
          onClick={() => setCurrentPage(p => Math.min(p + 1, paginatedData.totalPages))}
          className={`${styles.pageButton} ${currentPage === paginatedData.totalPages ? styles.pageButtonDisabled : styles.pageButtonActive}`}
        >
          Next
        </button>
      </div>
    </div>
  );
});

const SchoolDetailPage = () => {
  const [schoolData, setSchoolData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // TAMBAHAN BARU: State untuk navigasi ke detail
  const [currentView, setCurrentView] = useState('main');
  const [selectedSchool, setSelectedSchool] = useState(null);
  
  // Filter states
  const [filterJenjang, setFilterJenjang] = useState('Semua Jenjang');
  const [filterKecamatan, setFilterKecamatan] = useState('Semua Kecamatan');
  const [filterDesa, setFilterDesa] = useState('Semua Desa');

  // Dropdown options
  const [jenjangList, setJenjangList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaByKecamatan, setDesaByKecamatan] = useState({});

  // PERBAIKAN: Handler untuk klik detail dengan logging
  const handleDetailClick = useCallback((school) => {
    console.log('handleDetailClick called with school:', school);
    
    // Transform data dari format SchoolDetailPage ke format yang diharapkan komponen detail
    const transformedSchool = {
      npsn: school.npsn,
      nama: school.namaSekolah,
      jenjang: school.jenjang,
      tipe: school.tipeSekolah,
      desa: school.desa,
      kecamatan: school.kecamatan,
      toiletBaik: school.kondisiKelas?.baik || 0,
      toiletRusakSedang: school.kondisiKelas?.rusakSedang || 0,
      toiletRusakBerat: school.kondisiKelas?.rusakBerat || 0,
      totalToilet: (school.kondisiKelas?.baik || 0) + (school.kondisiKelas?.rusakSedang || 0) + (school.kondisiKelas?.rusakBerat || 0),
      originalData: school // Menyimpan data asli untuk keperluan lain
    };

    console.log('Transformed school data:', transformedSchool);
    
    setSelectedSchool(transformedSchool);
    setCurrentView('detail');
  }, []);

  // TAMBAHAN BARU: Handler untuk kembali ke halaman utama
  const handleBackToMain = useCallback(() => {
    console.log('Going back to main view');
    setCurrentView('main');
    setSelectedSchool(null);
  }, []);

  // Utility function untuk memvalidasi koordinat
  const isValidCoordinate = useCallback((lat, lng) => {
    return (
      typeof lat === 'number' && 
      typeof lng === 'number' && 
      !isNaN(lat) && 
      !isNaN(lng) && 
      lat >= -90 && 
      lat <= 90 && 
      lng >= -180 && 
      lng <= 180 &&
      lat !== 0 &&
      lng !== 0
    );
  }, []);

  // Transform data untuk komponen Map dengan validasi koordinat
  const transformDataForMap = useCallback((data) => {
    return data
      .map(school => {
        const lat = parseFloat(school.coordinates?.[0]);
        const lng = parseFloat(school.coordinates?.[1]);
        
        if (!isValidCoordinate(lat, lng)) {
          return null;
        }

        return {
          nama: school.namaSekolah,
          npsn: school.npsn,
          alamat: school.alamat || '-',
          kecamatan: school.kecamatan,
          desa: school.desa,
          lintang: lat,
          bujur: lng,
          jenjang: school.jenjang,
          fasilitas: school.kondisiKelas ? {
            baik: school.kondisiKelas.baik || 0,
            rusakSedang: school.kondisiKelas.rusakSedang || 0,
            rusakBerat: school.kondisiKelas.rusakBerat || 0
          } : null
        };
      })
      .filter(Boolean); // Remove null entries
  }, [isValidCoordinate]);

  // Improved JSON loading function dengan error handling yang lebih baik
  const loadJSON = useCallback(async (filename) => {
    try {
      let response;
      let data;

      // Try different paths
      const possiblePaths = [
        `/${filename}`,
        `/data/${filename}`,
        `/public/${filename}`,
        `/public/data/${filename}`
      ];

      for (const path of possiblePaths) {
        try {
          response = await fetch(path);
          if (response.ok) {
            const contentType = response.headers.get('content-type');
            
            // Check if response is HTML (error page)
            if (contentType && contentType.includes('text/html')) {
              continue; // Try next path
            }
            
            data = await response.json();
            console.log(`Successfully loaded ${filename} from ${path}`);
            return data;
          }
        } catch (fetchError) {
          console.warn(`Failed to load from ${path}:`, fetchError.message);
        }
      }

      throw new Error(`Could not load ${filename} from any path`);
    } catch (error) {
      console.error(`Failed to load ${filename}:`, error);
      return null;
    }
  }, []);

  // Load all data sources with better error handling
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('Starting to load data files...');

        // Load semua file JSON dengan Promise.allSettled untuk better error handling
        const [
          paudResult,
          sdResult, 
          smpResult,
          pkbmResult,
          kegiatanPaudResult,
          kegiatanSdResult,
          kegiatanSmpResult,
          kegiatanPkbmResult
        ] = await Promise.allSettled([
          loadJSON('paud.json'),
          loadJSON('sd_new.json'),
          loadJSON('smp.json'), 
          loadJSON('pkbm.json'),
          loadJSON('data_kegiatan_paud.json'),
          loadJSON('data_kegiatan_sd.json'),
          loadJSON('data_kegiatan_smp.json'),
          loadJSON('data_kegiatan_pkbm.json')
        ]);

        // Extract data from results
        const paudData = paudResult.status === 'fulfilled' ? paudResult.value : null;
        const sdData = sdResult.status === 'fulfilled' ? sdResult.value : null;
        const smpData = smpResult.status === 'fulfilled' ? smpResult.value : null;
        const pkbmData = pkbmResult.status === 'fulfilled' ? pkbmResult.value : null;
        const kegiatanPaudData = kegiatanPaudResult.status === 'fulfilled' ? kegiatanPaudResult.value : null;
        const kegiatanSdData = kegiatanSdResult.status === 'fulfilled' ? kegiatanSdResult.value : null;
        const kegiatanSmpData = kegiatanSmpResult.status === 'fulfilled' ? kegiatanSmpResult.value : null;
        const kegiatanPkbmData = kegiatanPkbmResult.status === 'fulfilled' ? kegiatanPkbmResult.value : null;

        console.log('Data loading results:', {
          paud: paudData ? 'loaded' : 'failed',
          sd: sdData ? 'loaded' : 'failed',
          smp: smpData ? 'loaded' : 'failed',
          pkbm: pkbmData ? 'loaded' : 'failed'
        });

        // Kombinasikan semua data sekolah
        const combinedSchoolData = [];

        // Function to process school data safely
        const processSchoolData = (data, jenjang) => {
          if (!data || typeof data !== 'object') return;

          Object.entries(data).forEach(([kecamatan, schools]) => {
            if (Array.isArray(schools)) {
              schools.forEach(school => {
                if (school && typeof school === 'object') {
                  combinedSchoolData.push({
                    npsn: school.npsn || `${jenjang}-${Math.random().toString(36).substr(2, 9)}`,
                    namaSekolah: school.name || school.namaSekolah || 'Tidak diketahui',
                    jenjang: jenjang,
                    tipeSekolah: school.type || '-',
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

        // Process each school data type
        processSchoolData(paudData, 'PAUD');
        processSchoolData(sdData, 'SD');
        processSchoolData(smpData, 'SMP');
        processSchoolData(pkbmData, 'PKBM');

        console.log(`Total schools loaded: ${combinedSchoolData.length}`);

        // Kombinasikan semua data kegiatan dengan safe array handling
        const combinedKegiatanData = [
          ...(Array.isArray(kegiatanPaudData) ? kegiatanPaudData : []),
          ...(Array.isArray(kegiatanSdData) ? kegiatanSdData : []), 
          ...(Array.isArray(kegiatanSmpData) ? kegiatanSmpData : []),
          ...(Array.isArray(kegiatanPkbmData) ? kegiatanPkbmData : [])
        ];

        // Buat mapping kegiatan berdasarkan NPSN
        const kegiatanMap = {};
        combinedKegiatanData.forEach(kegiatan => {
          if (kegiatan && kegiatan.npsn) {
            const npsn = kegiatan.npsn;
            if (!kegiatanMap[npsn]) kegiatanMap[npsn] = {};

            if (kegiatan.Kegiatan && kegiatan.Kegiatan.includes('Rehab')) {
              kegiatanMap[npsn].rehabRuangKelas = parseInt(kegiatan.Lokal) || 1;
            }
            if (kegiatan.Kegiatan && kegiatan.Kegiatan.includes('Pembangunan')) {
              kegiatanMap[npsn].pembangunanRKB = parseInt(kegiatan.Lokal) || 1;
            }
          }
        });

        // Merge data sekolah dengan data kegiatan
        const mergedSchoolData = combinedSchoolData.map((school, index) => {
          const kegiatanData = kegiatanMap[school.npsn] || {};
          return {
            ...school,
            no: index + 1,
            rehabRuangKelas: kegiatanData.rehabRuangKelas || 0,
            pembangunanRKB: kegiatanData.pembangunanRKB || 0,
            intervensiRuangKelas: (kegiatanData.rehabRuangKelas || 0) + (kegiatanData.pembangunanRKB || 0),
          };
        });

        console.log("All jenjang merged:", mergedSchoolData.map(s => s.jenjang));
        console.log("Jumlah SD:", mergedSchoolData.filter(s => s.jenjang === "SD").length);

        // Generate dropdown options dengan validation
        const uniqueJenjang = [...new Set(mergedSchoolData
          .map(s => s.jenjang)
          .filter(jenjang => jenjang && typeof jenjang === 'string' && jenjang.trim() !== '')
        )].sort();

        const uniqueKecamatan = [...new Set(mergedSchoolData
          .map(s => s.kecamatan)
          .filter(kec => kec && typeof kec === 'string' && kec.trim() !== '')
        )].sort();
        
        const desaByKec = {};
        mergedSchoolData.forEach(school => {
          if (school.kecamatan && school.desa) {
            if (!desaByKec[school.kecamatan]) {
              desaByKec[school.kecamatan] = new Set();
            }
            desaByKec[school.kecamatan].add(school.desa);
          }
        });

        Object.keys(desaByKec).forEach(kec => {
          desaByKec[kec] = Array.from(desaByKec[kec]).sort();
        });

        setSchoolData(mergedSchoolData);
        setJenjangList(uniqueJenjang);
        setKecamatanList(uniqueKecamatan);
        setDesaByKecamatan(desaByKec);

        console.log('Data loading completed successfully');

      } catch (error) {
        console.error('Error loading data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [loadJSON]);

  // Filter schoolData based on Jenjang, Kecamatan, Desa dengan memoization
  useEffect(() => {
    let data = [...schoolData];
    
    // Filter Jenjang
    if (filterJenjang !== 'Semua Jenjang') {
      data = data.filter(d => d.jenjang === filterJenjang);
    }
    
    // Filter Kecamatan
    if (filterKecamatan !== 'Semua Kecamatan') {
      data = data.filter(d => d.kecamatan === filterKecamatan);
    }
    
    // Filter Desa
    if (filterDesa !== 'Semua Desa') {
      data = data.filter(d => d.desa === filterDesa);
    }
    
    setFilteredData(data);
  }, [schoolData, filterJenjang, filterKecamatan, filterDesa]);

  // PERBAIKAN: Memoized statistics untuk charts dengan logging
  const statistics = useMemo(() => {
    console.log('Computing statistics from filteredData:', filteredData.length);
    
    const totalSekolah = filteredData.length;
    
    const kondisiSemuaJenjang = filteredData.reduce((acc, curr) => {
      const kondisi = curr.kondisiKelas || {};
      
      acc.baik += kondisi.baik || 0;
      acc.rusakSedang += kondisi.rusakSedang || 0;
      acc.rusakBerat += kondisi.rusakBerat || 0;
      
      return acc;
    }, { baik: 0, rusakSedang: 0, rusakBerat: 0 });
    
    const totalRehab = filteredData.reduce((acc, curr) => {
      return acc + (curr.rehabRuangKelas || 0);
    }, 0);
    
    const totalIntervensi = filteredData.reduce((acc, curr) => {
      return acc + (curr.intervensiRuangKelas || 0);
    }, 0);

    const totalPembangunanRKB = filteredData.reduce((acc, curr) => {
      return acc + (curr.pembangunanRKB || 0);
    }, 0);

    const totalKurangRKB = filteredData.reduce((acc, curr) => {
      return acc + (curr.kurangRKB || 0);
    }, 0);

    const result = {
      totalSekolah,
      kondisiSemuaJenjang,
      totalRehab,
      totalIntervensi,
      totalPembangunanRKB,
      totalKurangRKB
    };
    console.log('total rehat : ', totalRehab);
    console.log('Computed statistics:', result);
    return result;
  }, [filteredData]);

  // PERBAIKAN: Memoized chart data dengan logging
  const chartData = useMemo(() => {
    console.log('Computing chart data from statistics:', statistics);
    
    const { totalSekolah, kondisiSemuaJenjang, totalRehab, totalIntervensi, totalPembangunanRKB, totalKurangRKB } = statistics;

    const pieDataList = [
      {
        title: "Kondisi Ruang Kelas Semua Jenjang",
        data: [
          { name: "Baik", value: kondisiSemuaJenjang.baik, color: "#4ECDC4" },
          { name: "Rusak Sedang", value: kondisiSemuaJenjang.rusakSedang, color: "#FFD93D" },
          { name: "Rusak Berat", value: kondisiSemuaJenjang.rusakBerat, color: "#FF6B6B" },
        ],
      },
      {
        title: "Rehabilitasi Ruang Kelas",
        data: [
          { name: "Rehabilitasi Dilakukan", value: totalRehab, color: "#4ECDC4" },
          { name: "Rusak Berat (Belum Rehabilitasi)", value: Math.max(totalSekolah - totalRehab, 0), color: "#FFD93D" },
        ],
      },
      {
        title: "Intervensi Ruang Kelas",
        data: [
          { name: "Pembangunan Dilakukan", value: totalIntervensi, color: "#4ECDC4" },
          { name: "Kebutuhan RKB (Belum DIbangun)", value: Math.max(totalSekolah - totalIntervensi, 0), color: "#FFD93D" },
        ],
      },
    ];

    const barKondisiKelas = [
      { name: "Total Kelas", value: kondisiSemuaJenjang.baik + kondisiSemuaJenjang.rusakSedang + kondisiSemuaJenjang.rusakBerat },
      { name: "Kondisi Baik", value: kondisiSemuaJenjang.baik },
      { name: "Rusak Sedang", value: kondisiSemuaJenjang.rusakSedang },
      { name: "Rusak Berat", value: kondisiSemuaJenjang.rusakBerat },
      { name: "Kurang RKB", value: totalKurangRKB },
    ];

    const barIntervensiKelas = [
      { name: "Total Intervensi", value: totalIntervensi },
      { name: "Pembangunan RKB", value: totalPembangunanRKB },
      { name: "Rehab Ruang Kelas", value: totalRehab },
    ];

    const result = { pieDataList, barKondisiKelas, barIntervensiKelas };

    console.log('pie data list : ', pieDataList);
    console.log('Computed chart data:', result);
    return result;
  }, [statistics]);

  // Handler for kecamatan change - reset desa filter
  const handleKecamatanChange = useCallback((e) => {
    setFilterKecamatan(e.target.value);
    setFilterDesa('Semua Desa');
  }, []);

  // Reset all filters
  const handleResetAllFilters = useCallback(() => {
    setFilterJenjang('Semua Jenjang');
    setFilterKecamatan('Semua Kecamatan');
    setFilterDesa('Semua Desa');
  }, []);

  // Memoized map data
  const schoolsForMap = useMemo(() => {
    return transformDataForMap(filteredData);
  }, [filteredData, transformDataForMap]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <div className={styles.loadingText}>Memuat data...</div>
        <div className={styles.loadingSubtext}>
          Mengambil data sekolah dari file JSON...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Gagal memuat data</h2>
        <p>Error: {error}</p>
        <button 
          onClick={() => window.location.reload()}
          className={styles.retryButton}
        >
          Muat Ulang Halaman
        </button>
      </div>
    );
  }

  // Prepare filter object for Map component
  const mapFilter = {
    jenjang: filterJenjang === 'Semua Jenjang' ? 'all' : filterJenjang,
    kecamatan: filterKecamatan === 'Semua Kecamatan' ? 'all' : filterKecamatan,
    desa: filterDesa === 'Semua Desa' ? 'all' : filterDesa
  };

  // TAMBAHAN BARU: Render halaman detail sekolah
  const renderDetailView = () => {
    console.log('Rendering detail view for school:', selectedSchool);
    
    if (!selectedSchool) {
      return (
        <div className={styles.errorContainer}>
          <h2>Data sekolah tidak tersedia</h2>
          <button 
            onClick={handleBackToMain}
            className={styles.retryButton}
          >
            Kembali ke Dashboard
          </button>
        </div>
      );
    }

    const jenjang = selectedSchool.jenjang;
    let DetailComponent = null;

    switch (jenjang) {
      case 'PAUD':
        DetailComponent = SchoolDetailPaud;
        break;
      case 'SD':
        DetailComponent = SchoolDetailSd;
        break;
      case 'SMP':
        DetailComponent = SchoolDetailSmp;
        break;
      case 'PKBM':
        DetailComponent = SchoolDetailPkbm;
        break;
      default:
        return (
          <div className={styles.pageContainer}>
            <div className={styles.errorContainer}>
              <h2>Detail tidak tersedia untuk jenjang: {jenjang}</h2>
              <button 
                onClick={handleBackToMain}
                className={styles.retryButton}
              >
                Kembali ke Dashboard
              </button>
            </div>
          </div>
        );
    }

    console.log('Selected DetailComponent:', DetailComponent);

    return (
      <DetailComponent 
        school={selectedSchool} 
        onBack={handleBackToMain} 
      />
    );
  };

  // MODIFIKASI: Render halaman utama
  const renderMainView = () => (
    <ErrorBoundary>
      <div className={styles.pageContainer}>
        {/* Header */}
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>Peta Detail Sekolah</h1>
          <p className={styles.pageSubtitle}>
            Total: {statistics.totalSekolah} sekolah | 
            Kecamatan: {kecamatanList.length} | 
            Jenjang: {jenjangList.length}
          </p>
        </div>

        {/* Filter Section */}
        <div className={styles.filterSection}>
          <div className={styles.filterHeader}>
            <h3 className={styles.filterTitle}>Filter Data</h3>
            <button 
              onClick={handleResetAllFilters}
              className={styles.resetAllButton}
            >
              Reset Semua Filter
            </button>
          </div>
          
          <div className={styles.filterContainer}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>
                Filter Jenjang:
              </label>
              <select 
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
              <label className={styles.filterLabel}>
                Filter Kecamatan:
              </label>
              <select 
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
              <label className={styles.filterLabel}>
                Filter Desa:
              </label>
              <select 
                value={filterDesa} 
                onChange={e => setFilterDesa(e.target.value)}
                disabled={filterKecamatan === 'Semua Kecamatan'}
                className={filterKecamatan === 'Semua Kecamatan' ? styles.filterSelectDisabled : styles.filterSelect}
              >
                <option value="Semua Desa">Semua Desa</option>
                {filterKecamatan !== 'Semua Kecamatan' && 
                 desaByKecamatan[filterKecamatan]?.map((desa, idx) => (
                  <option key={idx} value={desa}>{desa}</option>
                ))}
              </select>
              {filterKecamatan === 'Semua Kecamatan' && (
                <small className={styles.filterHint}>
                  Pilih kecamatan terlebih dahulu
                </small>
              )}
            </div>
          </div>
        </div>

        {/* Map Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Peta Lokasi Sekolah ({schoolsForMap.length} sekolah ditampilkan)
          </h2>
          <div className={styles.mapWrapper}>
            <ErrorBoundary>
              <Map 
                schools={schoolsForMap}
                filter={mapFilter}
              />
            </ErrorBoundary>
          </div>
        </section>

        {/* Pie Charts Section */}
        <section className={styles.chartsGrid}>
          {chartData.pieDataList.map((pie, idx) => (
            <div key={idx} className={styles.chartGridItem}>
              <ErrorBoundary>
                <PieChartComponent title={pie.title} data={pie.data} />
              </ErrorBoundary>
            </div>
          ))}
        </section>
        {/* Bar Charts Section */}
        <section className={styles.chartsGrid}>
          <div className={styles.chartGridItemHalf}>
            <ErrorBoundary>
              <BarChartComponent
                title="Kondisi Ruang Kelas"
                data={chartData.barKondisiKelas}
                colors={["#4ECDC4", "#2ECC71", "#FFD93D", "#FF6B6B", "#9B59B6"]}
              />
            </ErrorBoundary>
          </div>
          <div className={styles.chartGridItemHalf}>
            <ErrorBoundary>
              <BarChartComponent
                title="Intervensi Ruang Kelas"
                data={chartData.barIntervensiKelas}
                colors={["#36A2EB", "#F39C12", "#8E44AD"]}
              />
            </ErrorBoundary>
          </div>
        </section>

        {/* Data Table Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Data Detail Sekolah
          </h2>
          <ErrorBoundary>
            {/* MODIFIKASI: Menambahkan prop onDetailClick ke DataTable */}
            <DataTable 
              data={filteredData} 
              onDetailClick={handleDetailClick}
            />
          </ErrorBoundary>
        </section>
      </div>
    </ErrorBoundary>
  );

  // TAMBAHAN BARU: Conditional rendering berdasarkan currentView
  console.log('Current view:', currentView);
  
  return (
    <div>
      {currentView === 'main' && renderMainView()}
      {currentView === 'detail' && renderDetailView()}
    </div>
  );
};

export default React.memo(SchoolDetailPage);