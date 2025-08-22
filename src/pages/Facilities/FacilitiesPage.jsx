import React, { useState, useEffect } from 'react'; 
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
  const [displayCount, setDisplayCount] = useState(10);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [selectedJenjang, setSelectedJenjang] = useState('Semua Jenjang');
  const [selectedKecamatan, setSelectedKecamatan] = useState('Semua Kecamatan');
  const [selectedDesa, setSelectedDesa] = useState('Semua Desa');

  // Data states
  const [schoolData, setSchoolData] = useState([]);
  const [filteredSchoolData, setFilteredSchoolData] = useState([]);
  const [kecamatanOptions, setKecamatanOptions] = useState([]);
  const [desaOptions, setDesaOptions] = useState([]);

  // Chart data states
  const [kondisiPieData, setKondisiPieData] = useState([]);
  const [rehabilitasiPieData, setRehabilitasiPieData] = useState([]);
  const [pembangunanPieData, setPembangunanPieData] = useState([]);
  const [kondisiToiletData, setKondisiToiletData] = useState([]);
  const [intervensiToiletData, setIntervensiToiletData] = useState([]);

  // Helper function to check if response is JSON
  const isJsonResponse = (response) => {
    const contentType = response.headers.get('content-type');
    return contentType && contentType.includes('application/json');
  };

  // Function to test file accessibility
  const testFileAccess = async () => {
    const testFiles = [
      '/data/paud.json',
      '/data/sd.json', 
      '/data/smp.json',
      '/data/pkbm.json'
    ];

    console.log('🧪 Testing file accessibility...');
    
    for (const file of testFiles) {
      try {
        const response = await fetch(file, { method: 'HEAD' });
        console.log(`📁 ${file}: ${response.ok ? '✅ EXISTS' : `❌ ${response.status}`}`);
      } catch (error) {
        console.log(`📁 ${file}: ❌ ERROR - ${error.message}`);
      }
    }
  };

  // Helper function to fetch with fallback and detailed debugging
  const fetchWithFallback = async (localPath, fallbackUrl, dataType = 'JSON') => {
    try {
      console.log(`🔍 Trying local: ${localPath}`);
      const response = await fetch(localPath);
      
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response headers:`, response.headers.get('content-type'));
      
      if (!response.ok) {
        throw new Error(`Local file HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      const responseText = await response.text();
      
      // Debug: Show first 200 characters of response
      console.log(`📝 Response preview (${dataType}):`, responseText.substring(0, 200));
      
      if (responseText.startsWith('<!DOCTYPE') || responseText.includes('<html')) {
        throw new Error(`Received HTML instead of JSON for ${localPath}`);
      }
      
      try {
        const data = JSON.parse(responseText);
        console.log(`✅ Successfully loaded from local: ${localPath}`);
        return data;
      } catch (parseError) {
        console.error(`❌ JSON parse error for ${localPath}:`, parseError.message);
        throw new Error(`Invalid JSON in ${localPath}: ${parseError.message}`);
      }
      
    } catch (localError) {
      console.warn(`⚠️ Local file ${localPath} failed: ${localError.message}`);
      
      if (fallbackUrl) {
        try {
          console.log(`🔄 Trying fallback: ${fallbackUrl}`);
          const response = await fetch(fallbackUrl);
          
          if (!response.ok) {
            throw new Error(`Fallback failed: ${response.status} ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log(`✅ Successfully loaded from fallback: ${fallbackUrl}`);
          return data;
        } catch (fallbackError) {
          console.error(`❌ Both local and fallback failed for ${dataType}:`, fallbackError.message);
          return null;
        }
      } else {
        console.warn(`⚠️ No fallback URL provided for ${localPath}`);
        return null;
      }
    }
  };

  // Updated fetchData function with fallback to external APIs
  const fetchData = async () => {
    try {
      console.log('🔄 Fetching data with local + fallback strategy...');
      
      // Test file accessibility first
      await testFileAccess();
      
      // Data sekolah - with fallbacks to external APIs
      const paud = await fetchWithFallback(
        '/data/paud.json',
        'https://peta-sekolah.vercel.app/paud/data/paud.json',
        'PAUD'
      );
      
      const sd = await fetchWithFallback(
        '/data/sd.json',
        'https://peta-sekolah.vercel.app/sd/data/sd_new.json',
        'SD'
      );
      
      const smp = await fetchWithFallback(
        '/data/smp.json',
        'https://peta-sekolah.vercel.app/smp/data/smp.json',
        'SMP'
      );
      
      const pkbm = await fetchWithFallback(
        '/data/pkbm.json',
        'https://peta-sekolah.vercel.app/pkbm/data/pkbm.json',
        'PKBM'
      );

      // Check if we got at least some school data
      const hasData = paud || sd || smp || pkbm;
      if (!hasData) {
        throw new Error('No school data could be loaded from either local files or external APIs');
      }

      // Data kegiatan (optional)
      const kegiatanPaud = await fetchWithFallback(
        '/data/data_kegiatan_paud.json',
        'https://peta-sekolah.vercel.app/paud/data/data_kegiatan.json',
        'Kegiatan PAUD'
      ) || {};
      
      const kegiatanSd = await fetchWithFallback(
        '/data/data_kegiatan_sd.json',
        'https://peta-sekolah.vercel.app/sd/data/data_kegiatan.json',
        'Kegiatan SD'
      ) || {};
      
      const kegiatanSmp = await fetchWithFallback(
        '/data/data_kegiatan_smp.json',
        'https://peta-sekolah.vercel.app/smp/data/data_kegiatan.json',
        'Kegiatan SMP'
      ) || {};
      
      const kegiatanPkbm = await fetchWithFallback(
        '/data/data_kegiatan_pkbm.json',
        'https://peta-sekolah.vercel.app/pkbm/data/data_kegiatan.json',
        'Kegiatan PKBM'
      ) || {};

      // Data wilayah (optional)
      const kecamatan = await fetchWithFallback(
        '/data/kecamatan.geojson',
        'https://peta-sekolah.vercel.app/data/kecamatan.geojson',
        'GeoJSON'
      );
      
      const desa = await fetchWithFallback(
        '/data/desa.geojson',
        'https://peta-sekolah.vercel.app/data/desa.geojson',
        'GeoJSON'
      );

      console.log('✅ Data fetching completed successfully');
      return {
        paud, sd, smp, pkbm,
        kegiatanPaud, kegiatanSd, kegiatanSmp, kegiatanPkbm,
        kecamatan, desa
      };
    } catch (err) {
      console.error("❌ Error loading data:", err);
      throw err;
    }
  };

  // Process PAUD data
  const processPaudData = (data) => {
    const processedData = [];
    let counter = 1;

    // PAUD data is organized by kecamatan
    Object.keys(data).forEach(kecamatan => {
      if (Array.isArray(data[kecamatan])) {
        data[kecamatan].forEach(school => {
          const toilets = school.toilets || {};
          const toiletBaik = parseInt(toilets.good) || 0;
          const toiletRusakSedang = parseInt(toilets.moderate_damage) || 0;
          const toiletRusakBerat = parseInt(toilets.heavy_damage) || 0;
          const totalToilet = parseInt(toilets.total) || toiletBaik + toiletRusakSedang + toiletRusakBerat;

          processedData.push({
            no: counter++,
            npsn: school.npsn || `PAUD${counter}`,
            nama: school.name || 'Nama tidak tersedia',
            jenjang: 'PAUD',
            tipe: school.type || 'Tidak diketahui',
            desa: school.village || 'Tidak diketahui',
            kecamatan: kecamatan,
            toiletBaik,
            toiletRusakSedang,
            toiletRusakBerat,
            totalToilet,
            originalData: school
          });
        });
      }
    });

    return processedData;
  };

  // Process SD data
  const processSdData = (data) => {
    const processedData = [];
    let counter = 1;

    // SD data is organized by kecamatan
    Object.keys(data).forEach(kecamatan => {
      if (Array.isArray(data[kecamatan])) {
        data[kecamatan].forEach(school => {
          const toilets = school.toilets || {};
          const toiletBaik = parseInt(toilets.good) || 0;
          const toiletRusakSedang = parseInt(toilets.moderate_damage) || 0;
          const toiletRusakBerat = parseInt(toilets.heavy_damage) || 0;
          const totalToilet = parseInt(toilets.total) || toiletBaik + toiletRusakSedang + toiletRusakBerat;

          processedData.push({
            no: counter++,
            npsn: school.npsn || `SD${counter}`,
            nama: school.name || 'Nama tidak tersedia',
            jenjang: 'SD',
            tipe: school.type || 'Tidak diketahui',
            desa: school.village || 'Tidak diketahui',
            kecamatan: kecamatan,
            toiletBaik,
            toiletRusakSedang,
            toiletRusakBerat,
            totalToilet,
            originalData: school
          });
        });
      }
    });

    return processedData;
  };

  // Process SMP data (similar structure to SD)
  const processSmpData = (data) => {
    const processedData = [];
    let counter = 1;

    Object.keys(data).forEach(kecamatan => {
      if (Array.isArray(data[kecamatan])) {
        data[kecamatan].forEach(school => {
          // SMP might have different structure, adjust as needed
          const toilets = school.toilets || school.toilet || {};
          const toiletBaik = parseInt(toilets.good) || 0;
          const toiletRusakSedang = parseInt(toilets.moderate_damage) || 0;
          const toiletRusakBerat = parseInt(toilets.heavy_damage) || 0;
          const totalToilet = parseInt(toilets.total) || toiletBaik + toiletRusakSedang + toiletRusakBerat;

          processedData.push({
            no: counter++,
            npsn: school.npsn || `SMP${counter}`,
            nama: school.name || school.nama || 'Nama tidak tersedia',
            jenjang: 'SMP',
            tipe: school.type || school.status || 'Tidak diketahui',
            desa: school.village || school.desa || 'Tidak diketahui',
            kecamatan: kecamatan,
            toiletBaik,
            toiletRusakSedang,
            toiletRusakBerat,
            totalToilet,
            originalData: school
          });
        });
      }
    });

    return processedData;
  };

  // Process PKBM data
  const processPkbmData = (data) => {
    const processedData = [];
    let counter = 1;

    Object.keys(data).forEach(kecamatan => {
      if (Array.isArray(data[kecamatan])) {
        data[kecamatan].forEach(school => {
          // PKBM might have different structure
          const toilets = school.toilets || school.toilet || {};
          const toiletBaik = parseInt(toilets.good) || 0;
          const toiletRusakSedang = parseInt(toilets.moderate_damage) || 0;
          const toiletRusakBerat = parseInt(toilets.heavy_damage) || 0;
          const totalToilet = parseInt(toilets.total) || toiletBaik + toiletRusakSedang + toiletRusakBerat;

          processedData.push({
            no: counter++,
            npsn: school.npsn || `PKBM${counter}`,
            nama: school.name || school.nama || 'Nama tidak tersedia',
            jenjang: 'PKBM',
            tipe: 'Swasta',
            desa: school.village || school.desa || 'Tidak diketahui',
            kecamatan: kecamatan,
            toiletBaik,
            toiletRusakSedang,
            toiletRusakBerat,
            totalToilet,
            originalData: school
          });
        });
      }
    });

    return processedData;
  };

  // Generate chart data from processed school data
  const generateChartData = (data) => {
    const totalSchools = data.length;
    if (totalSchools === 0) {
      // Set empty chart data
      setKondisiPieData([{ name: 'Tidak Ada Data', value: 100, color: '#95A5A6' }]);
      setRehabilitasiPieData([{ name: 'Tidak Ada Data', value: 100, color: '#95A5A6' }]);
      setPembangunanPieData([{ name: 'Tidak Ada Data', value: 100, color: '#95A5A6' }]);
      setKondisiToiletData([]);
      setIntervensiToiletData([]);
      return;
    }

    // Calculate kondisi toilet statistics
    let totalBaik = 0, totalRusakSedang = 0, totalRusakBerat = 0;
    let needRehab = 0, needBuild = 0, adequate = 0;
    let newBuild = 0, rehab = 0, noIntervention = 0;

    data.forEach(school => {
      totalBaik += school.toiletBaik || 0;
      totalRusakSedang += school.toiletRusakSedang || 0;
      totalRusakBerat += school.toiletRusakBerat || 0;

      // Categorize schools based on toilet condition
      if (school.toiletRusakBerat > 0 || school.totalToilet < 2) {
        needBuild++;
      } else if (school.toiletRusakSedang > 0) {
        needRehab++;
      } else {
        adequate++;
      }

      // Intervention categories
      if (school.totalToilet === 0) {
        newBuild++;
      } else if (school.toiletRusakSedang > 0 || school.toiletRusakBerat > 0) {
        rehab++;
      } else {
        noIntervention++;
      }
    });

    const totalToilets = totalBaik + totalRusakSedang + totalRusakBerat;

    // Pie chart data - Kondisi Toilet
    if (totalToilets > 0) {
      setKondisiPieData([
        { name: 'Baik', value: Math.round((totalBaik / totalToilets) * 100), color: '#4ECDC4' },
        { name: 'Rusak Sedang', value: Math.round((totalRusakSedang / totalToilets) * 100), color: '#FFD93D' },
        { name: 'Rusak Berat', value: Math.round((totalRusakBerat / totalToilets) * 100), color: '#FF6B6B' }
      ].filter(item => item.value > 0));
    } else {
      setKondisiPieData([{ name: 'Tidak Ada Data', value: 100, color: '#95A5A6' }]);
    }

    // Pie chart data - Kebutuhan Rehabilitasi
    setRehabilitasiPieData([
      { name: 'Rusak Berat (Belum Direhabb)', value: Math.round((needRehab / totalSchools) * 100), color: '#FF6B6B' },
      { name: 'Rehab Dilakukan', value: Math.round((adequate / totalSchools) * 100), color: '#4ECDC4' }
    ].filter(item => item.value > 0));

    // Pie chart data - Kebutuhan Pembangunan
    setPembangunanPieData([
      { name: 'Kebutuhan Toilet (Perlu Bangun)', value: Math.round((needBuild / totalSchools) * 100), color: '#FF6B6B' },
      { name: 'Pembangunan Dilakukan', value: Math.round(((totalSchools - needBuild) / totalSchools) * 100), color: '#4ECDC4' }
    ].filter(item => item.value > 0));

    // Bar chart data - Kondisi Toilet per Jenjang
    const jenjangStats = data.reduce((acc, school) => {
      if (!acc[school.jenjang]) {
        acc[school.jenjang] = { baik: 0, rusakSedang: 0, rusakBerat: 0 };
      }
      acc[school.jenjang].baik += school.toiletBaik || 0;
      acc[school.jenjang].rusakSedang += school.toiletRusakSedang || 0;
      acc[school.jenjang].rusakBerat += school.toiletRusakBerat || 0;
      return acc;
    }, {});

const total = data.length;
const baik = data.reduce((sum, s) => sum + (s.toiletBaik || 0), 0);
const rusakSedang = data.reduce((sum, s) => sum + (s.toiletRusakSedang || 0), 0);
const rusakBerat = data.reduce((sum, s) => sum + (s.toiletRusakBerat || 0), 0);
const tidakAda = data.filter(s => !s.totalToilet || s.totalToilet === 0).length;

setKondisiToiletData([
  { name: "Total", value: total, color: "#8884d8" },
  { name: "Baik", value: baik, color: "#4ECDC4" },
  { name: "Rusak Sedang", value: rusakSedang, color: "#ffbb28" },
  { name: "Rusak Berat", value: rusakBerat, color: "#ff8042" },
  { name: "Tidak Ada Toilet", value: tidakAda, color: "#d9534f" },
]);


    // Bar chart data - Kategori Intervensi
    setIntervensiToiletData([
      { name: 'Total Intervensi', value: newBuild, color: '#FF6B6B' },
      { name: 'Pembangunan Toilet', value: rehab, color: '#FFD93D' },
      { name: 'Rehabilitasi Toilet', value: noIntervention, color: '#4ECDC4' }
    ].filter(item => item.value > 0));
  };

  // Apply filters to school data
  useEffect(() => {
    let filtered = [...schoolData];

    // Filter by jenjang
    if (selectedJenjang !== 'Semua Jenjang') {
      filtered = filtered.filter(school => school.jenjang === selectedJenjang);
    }

    // Filter by kecamatan
    if (selectedKecamatan !== 'Semua Kecamatan') {
      filtered = filtered.filter(school => school.kecamatan === selectedKecamatan);
    }

    // Filter by desa
    if (selectedDesa !== 'Semua Desa') {
      filtered = filtered.filter(school => school.desa === selectedDesa);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(school => 
        school.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        school.npsn?.includes(searchQuery)
      );
    }

    setFilteredSchoolData(filtered);
    generateChartData(filtered);
  }, [schoolData, selectedJenjang, selectedKecamatan, selectedDesa, searchQuery]);

  // Initialize data on component mount
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('📊 Starting data initialization...');
        
        // Fetch all data using the new fetchData function
        const allData = await fetchData();
        
        if (!allData) {
          throw new Error('Failed to fetch data from local files');
        }

        const { paud, sd, smp, pkbm } = allData;

        let allProcessedData = [];

        // Process PAUD data
        if (paud) {
          console.log('🔧 Processing PAUD data...');
          const processedPaud = processPaudData(paud);
          allProcessedData = allProcessedData.concat(processedPaud);
          console.log(`✅ Processed ${processedPaud.length} PAUD schools`);
        }

        // Process SD data
        if (sd) {
          console.log('🔧 Processing SD data...');
          const processedSd = processSdData(sd);
          allProcessedData = allProcessedData.concat(processedSd);
          console.log(`✅ Processed ${processedSd.length} SD schools`);
        }

        // Process SMP data
        if (smp) {
          console.log('🔧 Processing SMP data...');
          const processedSmp = processSmpData(smp);
          allProcessedData = allProcessedData.concat(processedSmp);
          console.log(`✅ Processed ${processedSmp.length} SMP schools`);
        }

        // Process PKBM data
        if (pkbm) {
          console.log('🔧 Processing PKBM data...');
          const processedPkbm = processPkbmData(pkbm);
          allProcessedData = allProcessedData.concat(processedPkbm);
          console.log(`✅ Processed ${processedPkbm.length} PKBM schools`);
        }

        if (allProcessedData.length === 0) {
          throw new Error('No data could be processed from the local files');
        }

        console.log(`🎉 Total processed schools: ${allProcessedData.length}`);
        setSchoolData(allProcessedData);

        // Extract unique kecamatan and desa for filters
        const uniqueKecamatan = [...new Set(
          allProcessedData
            .map(s => s.kecamatan)
            .filter(k => k && k !== '-' && k !== 'Tidak diketahui')
        )].sort();

        const uniqueDesa = [...new Set(
          allProcessedData
            .map(s => s.desa)
            .filter(d => d && d !== '-' && d !== 'Tidak diketahui')
        )].sort();

        setKecamatanOptions(uniqueKecamatan);
        setDesaOptions(uniqueDesa);

        console.log(`📍 Available Kecamatan: ${uniqueKecamatan.length}`);
        console.log(`🏘️ Available Desa: ${uniqueDesa.length}`);

      } catch (error) {
        console.error('❌ Error initializing data:', error);
        setError(`Failed to load data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // Reset all filters
  const resetAllFilters = () => {
    setSelectedJenjang('Semua Jenjang');
    setSelectedKecamatan('Semua Kecamatan');
    setSelectedDesa('Semua Desa');
    setSearchQuery('');
  };

  const renderLabelInside = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    if (value === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) / 2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${value}%`}
      </text>
    );
  };

  const renderMainView = () => {
    if (loading) {
      return (
        <div className={styles.facilitiesContainer}>
          <div className={styles.sectionBox}>
            <h2 className={styles.pageTitle}>Loading data from local files...</h2>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <div className={styles.loadingSpinner}></div>
              <p style={{ marginTop: '10px', color: '#666' }}>
                Processing PAUD, SD, SMP, and PKBM data...
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className={styles.facilitiesContainer}>
          <div className={styles.sectionBox}>
            <h2 className={styles.pageTitle}>Error Loading Data</h2>
            <div className={styles.errorMessage}>
              {error}
            </div>
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button 
                onClick={() => window.location.reload()} 
                className={styles.resetButton}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.facilitiesContainer}>
        {/* Judul Halaman */}
        <div className={styles.sectionBox}>
          <h2 className={styles.pageTitle}>
            Detail Sekolah - Kondisi Toilet ({filteredSchoolData.length} sekolah)
          </h2>
          <p style={{ textAlign: 'center', color: '#666', marginTop: '10px' }}>
            Data from local files with API fallback - Dinas Pendidikan Garut
          </p>
        </div>

        {/* Filter Diagram */}
        <div className={styles.sectionBox}>
          <div className={styles.filterRow}>
            <div>
              <label>Filter Jenjang:</label>
              <select value={selectedJenjang} onChange={(e) => setSelectedJenjang(e.target.value)}>
                <option>Semua Jenjang</option>
                <option>PAUD</option>
                <option>SD</option>
                <option>SMP</option>
                <option>PKBM</option>
              </select>
            </div>
            <div>
              <label>Filter Kecamatan:</label>
              <select value={selectedKecamatan} onChange={(e) => setSelectedKecamatan(e.target.value)}>
                <option>Semua Kecamatan</option>
                {kecamatanOptions.map(kecamatan => (
                  <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Filter Desa:</label>
              <select value={selectedDesa} onChange={(e) => setSelectedDesa(e.target.value)}>
                <option>Semua Desa</option>
                {desaOptions.map(desa => (
                  <option key={desa} value={desa}>{desa}</option>
                ))}
              </select>
            </div>
            <button onClick={resetAllFilters}>Reset Semua Filter</button>
          </div>
        </div>

        {/* Pie Charts */}
        <div className={styles.pieChartsGrid}>
          {[
            { title: 'Kondisi Toilet', data: kondisiPieData },
            { title: 'Rehabiitasi Toilet', data: rehabilitasiPieData },
            { title: 'Pembangunan Toilet', data: pembangunanPieData }
          ].map((chart, idx) => (
            <div key={idx} className={styles.chartCard}>
              <h3 className={styles.pieChartTitle}>{chart.title}</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chart.data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={renderLabelInside}
                    labelLine={false}
                  >
                    {chart.data.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Legend 
                    verticalAlign="bottom" 
                    align="center" 
                    formatter={(value, entry) => (
                      <span style={{ color: entry.color }}>{value}</span>
                    )} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>

        {/* Bar Charts */}
        <div className={styles.barChartsGrid}>
  <div className={styles.chartCard}>
    <h3 className={styles.chartTitle}>Kondisi Toilet</h3>
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={kondisiToiletData}>
    <CartesianGrid strokeDasharray="3 3" />
    
    {/* Sumbu X */}
    <XAxis
      dataKey="name"
      angle={-30}                 // teks miring ke atas
      textAnchor="end"            // posisinya rata ujung biar rapi
      interval={0}                // tampilkan semua label, jangan skip
      tick={{ fontSize: 12 }}
    />

    {/* Sumbu Y */}
    <YAxis
      ticks={[0, 1000, 2000, 3000, 4000, 5000, 6000]} // angka tetap kelipatan 1000
    />

    <Tooltip />
    <Legend />
        <Bar dataKey="value" fill="#8884d8">
      <LabelList dataKey="value" position="top" dy={10} /> 
    </Bar>
  </BarChart>
</ResponsiveContainer>

  </div>

  {/* Biarkan Kategori Intervensi Toilet tetap sama */}
  <div className={styles.chartCard}>
  <h3 className={styles.chartTitle}>Kategori Intervensi Toilet</h3>
  <ResponsiveContainer width="100%" height={400}>
    <BarChart
      data={intervensiToiletData}
      margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
    >
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis
        dataKey="name"
        angle={0}
        textAnchor="middle"
        tick={{ fontSize: 12 }}
        interval={0}
      />
      <YAxis
        type="number"
        domain={[0, 12]}      // skala tetap 0–12
        ticks={[0, 2, 4, 6, 8, 10, 12]}
        allowDecimals={false}
        interval={0}
      />
      <Tooltip 
        formatter={(value, name, props) => {
          return [props.payload.value, props.payload.name]; 
          // menampilkan angka asli saat hover
        }}
      />
      <Bar dataKey="value">
        {intervensiToiletData.map((entry, index) => (
          <Cell key={index} fill={entry.color} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>
</div>


        {/* Filter Tabel */}
        <div className={styles.sectionBox}>
          <div className={styles.filterRow}>
            <div>
              <label>Cari Sekolah/NPSN:</label>
              <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Masukkan nama sekolah atau NPSN" 
              />
            </div>
            <div>
              <label>Tampilkan jumlah baris:</label>
              <select value={displayCount} onChange={(e) => setDisplayCount(Number(e.target.value))}>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>Semua</option>
              </select>
            </div>
            <button onClick={() => setSearchQuery('')}>Reset Filter</button>
          </div>
        </div>

        {/* Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead className={styles.tableHeader}>
              <tr>
                {['NO','NPSN','NAMA SEKOLAH','JENJANG','TIPE SEKOLAH','DESA','KECAMATAN','TOILET BAIK','TOILET RUSAK SEDANG','TOILET RUSAK BERAT','TOTAL TOILET','LIHAT DETAIL'].map((title) => (
                  <th key={title} className={styles.tableHeaderCell}>{title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredSchoolData
                .slice(0, displayCount === 1000 ? filteredSchoolData.length : displayCount)
                .map((school, index) => (
                <tr key={`${school.npsn}-${index}`} className={styles.tableRow}>
                  <td className={styles.tableCell}>{index + 1}</td>
                  <td className={styles.tableCell}>{school.npsn}</td>
                  <td className={styles.tableCell}>{school.nama}</td>
                  <td className={styles.tableCell}>{school.jenjang}</td>
                  <td className={styles.tableCell}>{school.tipe}</td>
                  <td className={styles.tableCell}>{school.desa}</td>
                  <td className={styles.tableCell}>{school.kecamatan}</td>
                  <td className={styles.tableCellCenter}>{school.toiletBaik}</td>
                  <td className={styles.tableCellCenter}>{school.toiletRusakSedang}</td>
                  <td className={styles.tableCellCenter}>{school.toiletRusakBerat}</td>
                  <td className={styles.tableCellCenter}>{school.totalToilet}</td>
                  <td className={styles.tableCell}>
                    <button
                      onClick={() => {
                        setSelectedSchool(school);
                        setCurrentView('detail');
                      }}
                      className={styles.detailButton}
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredSchoolData.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Tidak ada data yang ditemukan dengan filter saat ini.
            </div>
          )}
          
          {filteredSchoolData.length > 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666', borderTop: '1px solid #e5e7eb' }}>
              Menampilkan {Math.min(displayCount === 1000 ? filteredSchoolData.length : displayCount, filteredSchoolData.length)} dari {filteredSchoolData.length} sekolah
            </div>
          )}
        </div>

      </div>
    );
  };

  // Render
  return (
    <div>
      {currentView === 'main' && renderMainView()}

      {currentView === 'detail' && selectedSchool && (() => {
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
              <div className={styles.facilitiesContainer}>
                <div className={styles.sectionBox}>
                  <h2>Detail tidak tersedia untuk jenjang: {jenjang}</h2>
                  <button 
                    onClick={() => setCurrentView('main')}
                    className={styles.backButton}
                  >
                    Kembali
                  </button>
                </div>
              </div>
            );
        }

        return (
          <DetailComponent 
            school={selectedSchool} 
            onBack={() => setCurrentView('main')} 
          />
        );
      })()}
    </div>
  );
};

export default FacilitiesPage;