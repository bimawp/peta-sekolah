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
  // Process PAUD data - FIXED
  const processPaudData = (data) => {
    const processedData = [];
    let counter = 1;

    Object.keys(data).forEach(kecamatan => {
      if (Array.isArray(data[kecamatan])) {
        data[kecamatan].forEach(school => {
          const toilets = school.toilets || {};
          
          // For PAUD, toilets data structure is different
          const toiletBaik = parseInt(toilets.good) || 0;
          const toiletRusakSedang = parseInt(toilets.moderate_damage) || 0;
          const toiletRusakBerat = parseInt(toilets.heavy_damage) || 0;
          const nAvailable = parseFloat(toilets.n_available) || 0;
          const totalToilet = toiletBaik + toiletRusakSedang + toiletRusakBerat || nAvailable || 0;

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
  // Process SD data - FIXED
  const processSdData = (data) => {
    const processedData = [];
    let counter = 1;

    Object.keys(data).forEach(kecamatan => {
      if (Array.isArray(data[kecamatan])) {
        data[kecamatan].forEach(school => {
          const toilets = school.toilets || {};
          // For SD, use total and condition breakdown
          const toiletBaik = parseInt(toilets.good) || 0;
          const toiletRusakSedang = parseInt(toilets.moderate_damage) || 0;
          const toiletRusakBerat = parseInt(toilets.heavy_damage) || 0;
          const totalToilet = parseFloat(toilets.total) || (toiletBaik + toiletRusakSedang + toiletRusakBerat) || 0;

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
  // Process SMP data - FIXED
  const processSmpData = (data) => {
    const processedData = [];
    let counter = 1;

    Object.keys(data).forEach(kecamatan => {
      if (Array.isArray(data[kecamatan])) {
        data[kecamatan].forEach(school => {
          // For SMP, toilets are split into teachers_toilet and students_toilet
          const teachersToilet = school.teachers_toilet || {};
          const studentsToilet = school.students_toilet || {};
          // Calculate totals from male and female toilets
          const teacherMaleGood = parseInt(teachersToilet.male?.good) || 0;
          const teacherFemaleGood = parseInt(teachersToilet.female?.good) || 0;
          const teacherMaleModerate = parseInt(teachersToilet.male?.moderate_damage) || 0;
          const teacherFemaleModerate = parseInt(teachersToilet.female?.moderate_damage) || 0;
          const teacherMaleHeavy = parseInt(teachersToilet.male?.heavy_damage) || 0;
          const teacherFemaleHeavy = parseInt(teachersToilet.female?.heavy_damage) || 0;

          const studentMaleGood = parseInt(studentsToilet.male?.good) || 0;
          const studentFemaleGood = parseInt(studentsToilet.female?.good) || 0;
          const studentMaleModerate = parseInt(studentsToilet.male?.moderate_damage) || 0;
          const studentFemaleModerate = parseInt(studentsToilet.female?.moderate_damage) || 0;
          const studentMaleHeavy = parseInt(studentsToilet.male?.heavy_damage) || 0;
          const studentFemaleHeavy = parseInt(studentsToilet.female?.heavy_damage) || 0;

          const toiletBaik = teacherMaleGood + teacherFemaleGood + studentMaleGood + studentFemaleGood;
          const toiletRusakSedang = teacherMaleModerate + teacherFemaleModerate + studentMaleModerate + studentFemaleModerate;
          const toiletRusakBerat = teacherMaleHeavy + teacherFemaleHeavy + studentMaleHeavy + studentFemaleHeavy;
          const totalToilet = toiletBaik + toiletRusakSedang + toiletRusakBerat;

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
  // Process PKBM data - FIXED
  const processPkbmData = (data) => {
    const processedData = [];
    let counter = 1;

    Object.keys(data).forEach(kecamatan => {
      if (Array.isArray(data[kecamatan])) {
        data[kecamatan].forEach(school => {
          const toilets = school.toilets || {};
          // For PKBM, similar to PAUD structure
          const toiletBaik = parseInt(toilets.good) || 0;
          const toiletRusakSedang = parseInt(toilets.moderate_damage) || 0;
          const toiletRusakBerat = parseFloat(toilets.heavy_damage) || 0; // Note: sometimes float
          const nAvailable = parseInt(toilets.n_available) || 0;
          const totalToilet = toiletBaik + toiletRusakSedang + toiletRusakBerat || nAvailable || 0;

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
  // Generate chart data from processed school data - FIXED CATEGORIZATION
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

    // Calculate toilet statistics
    let totalToiletBaik = 0;
    let totalToiletRusakSedang = 0; 
    let totalToiletRusakBerat = 0;
    let totalToiletCount = 0;
    let schoolsNeedToilets = 0; // Schools with no toilets
    let schoolsNeedRehab = 0; // Schools with damaged toilets
    let schoolsWithGoodToilets = 0; // Schools with ONLY good toilets (no damage)

    data.forEach(school => {
      const baik = school.toiletBaik || 0;
      const rusakSedang = school.toiletRusakSedang || 0;
      const rusakBerat = school.toiletRusakBerat || 0;
      const total = school.totalToilet || 0;
      
      // Add to totals
      totalToiletBaik += baik;
      totalToiletRusakSedang += rusakSedang;
      totalToiletRusakBerat += rusakBerat;
      totalToiletCount += total;
      
      // Categorize schools - FIXED: Make categories mutually exclusive
      if (total === 0) {
        schoolsNeedToilets++; // Need to build toilets
      } else if (rusakSedang > 0 || rusakBerat > 0) {
        schoolsNeedRehab++; // Need rehabilitation (has damaged toilets)
      } else if (baik > 0) {
        schoolsWithGoodToilets++; // Has only good toilets (no damage)
      }
      // Note: If total > 0 but baik = 0 and no damage, it's an edge case
    });

    const totalToiletsAll = totalToiletBaik + totalToiletRusakSedang + totalToiletRusakBerat;
    
    // Pie chart data - Kondisi Toilet
    if (totalToiletsAll > 0) {
      setKondisiPieData([
        { 
          name: 'Baik', 
          value: Math.round((totalToiletBaik / totalToiletsAll) * 100), 
          actualCount: totalToiletBaik, 
          color: '#4ECDC4' 
        },
        { 
          name: 'Rusak Sedang', 
          value: Math.round((totalToiletRusakSedang / totalToiletsAll) * 100), 
          actualCount: totalToiletRusakSedang, 
          color: '#FFD93D' 
        },
        { 
          name: 'Rusak Berat', 
          value: Math.round((totalToiletRusakBerat / totalToiletsAll) * 100), 
          actualCount: totalToiletRusakBerat, 
          color: '#FF6B6B' 
        }
      ].filter(item => item.value > 0));
    } else {
      setKondisiPieData([{ name: 'Tidak Ada Data', value: 100, actualCount: 0, color: '#95A5A6' }]);
    }

    // Pie chart data - Rehabilitasi Toilet
    const needRehab = schoolsNeedRehab;
    const alreadyGood = schoolsWithGoodToilets; // Only schools with good toilets
    
    if (totalSchools > 0) {
      setRehabilitasiPieData([
        { 
          name: 'Rusak Berat (Belum Rehabilitasi)', 
          value: Math.round((needRehab / totalSchools) * 100), 
          actualCount: needRehab, 
          color: '#FF6B6B' 
        },
        { 
          name: 'Rehab Dilakukan', 
          value: Math.round((alreadyGood / totalSchools) * 100), 
          actualCount: alreadyGood, 
          color: '#4ECDC4' 
        }
      ].filter(item => item.value > 0));
    }

    // Pie chart data - Pembangunan Toilet  
    if (totalSchools > 0) {
      setPembangunanPieData([
        { 
          name: 'Pembangunan Dilakukan', 
          value: Math.round((schoolsNeedToilets / totalSchools) * 100), 
          actualCount: schoolsNeedToilets, 
          color: '#FF6B6B' 
        },
        { 
          name: 'Kebutuhan Toilet (Belum DIbangun)', 
          value: Math.round(((totalSchools - schoolsNeedToilets) / totalSchools) * 100), 
          actualCount: (totalSchools - schoolsNeedToilets), 
          color: '#4ECDC4' 
        }
      ].filter(item => item.value > 0));
    }

    // Bar chart data - Kondisi Toilet
setKondisiToiletData([
  { name: "Total Toilet", value: totalToiletCount, color: "#8884d8" },
  { name: "Toilet Baik", value: totalToiletBaik, color: "#4ECDC4" },
  { name: "Rusak Sedang", value: totalToiletRusakSedang, color: "#ffbb28" },
  { name: "Rusak Berat", value: totalToiletRusakBerat, color: "#ff8042" },
  { name: "Tidak Ada Toilet", value: schoolsNeedToilets, color: "#d9534f" },
]);


    // Bar chart data - Kategori Intervensi - FIXED: Now shows school counts, not toilet counts
    setIntervensiToiletData([
      { name: 'Total Intervensi', value: schoolsNeedToilets, color: '#FF6B6B' },
      { name: 'Pembangunan Toilet', value: schoolsNeedRehab, color: '#FFD93D' },
      { name: 'Rehabilitasi Toilet', value: schoolsWithGoodToilets, color: '#4ECDC4' }
    ].filter(item => item.value > 0));

    // Debug log to verify the numbers
    console.log('📊 Chart Data Summary:');
    console.log(`Total Schools: ${totalSchools}`);
    console.log(`Schools Need Toilets: ${schoolsNeedToilets}`);
    console.log(`Schools Need Rehab: ${schoolsNeedRehab}`);
    console.log(`Schools With Good Toilets: ${schoolsWithGoodToilets}`);
    console.log(`Sum: ${schoolsNeedToilets + schoolsNeedRehab + schoolsWithGoodToilets} (should equal ${totalSchools})`);
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
  // Custom label function for pie charts that shows both percentage and count
  const renderLabelInside = ({ cx, cy, midAngle, innerRadius, outerRadius, value, actualCount }) => {
    if (value === 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) / 2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold">
        <tspan x={x} dy="-0.3em">{`${value}%`}</tspan>
        <tspan x={x} dy="1.2em">({actualCount || 0})</tspan>
      </text>
    );
  };
  // Custom tooltip for pie charts
  const customPieTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div style={{ backgroundColor: 'white', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <p>{`${data.name}: ${data.value}% (${data.payload.actualCount || 0} unit)`}</p>
        </div>
      );
    }
    return null;
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
            { title: 'Rehabilitasi Toilet', data: rehabilitasiPieData },
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
                  <Tooltip content={customPieTooltip} />
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
                  ticks={[0, 1000, 2000, 3000, 4000, 5000, 6000, 7000]} // angka tetap kelipatan 1000
                />

                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  <LabelList dataKey="value" position="top" dy={-5} fontSize={12} fontWeight="bold" /> 
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Kategori Intervensi Toilet - FIXED */}
          <div className={styles.chartCard}>
            <h3 className={styles.chartTitle}>Kategori Intervensi Toilet</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={intervensiToiletData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }} // margin bawah lebih besar
              >
                <CartesianGrid strokeDasharray="3 3" />
                {/* Sumbu X */}
                <XAxis
                  dataKey="name"
                  type="category"
                  scale="band"
                  interval={0}
                  tick={{ fontSize: 12 }}
                  angle={-30}         // label diputar agar tidak numpuk
                  textAnchor="end"
                />
                {/* Sumbu Y - FIXED: Dynamic range based on data */}
                <YAxis
                  type="number"
                  domain={[0, 'dataMax + 2']}  // Dynamic range from 0 to max data + 2
                  allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value, name, props) => {
                    return [props.payload.value, props.payload.name]; 
                  }}
                />

                <Bar dataKey="value">
                  <LabelList dataKey="value" position="top" dy={-5} fontSize={12} fontWeight="bold" />
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
  <div className={styles.tableScrollWrapper}>
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
  </div>

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