import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, Legend, LabelList } from 'recharts';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [data, setData] = useState({
    paud: {},
    sd: {},
    smp: {},
    pkbm: {},
    kegiatanPaud: [],
    kegiatanSd: [],
    kegiatanSmp: [],
    kegiatanPkbm: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter states for Kecamatan chart
  const [kecamatanFilters, setKecamatanFilters] = useState({ // <-- KESALAHAN DIPERBAIKI DI SINI
    tipe: 'berat', // 'berat', 'sedang', 'kurangRkb'
    jumlah: 5, // Fixed to 5 per jenjang
    urutan: 'teratas' // 'teratas', 'terbawah'
  });
  
  // Filter states for Desa chart
  const [desaFilters, setDesaFilters] = useState({
    jenjang: 'Semua Jenjang',
    kecamatan: 'Semua Kecamatan', 
    tipe: 'berat',
    jumlah: 20,
    urutan: 'teratas'
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load all JSON files
        const responses = await Promise.all([
          fetch('/data/paud.json'),
          fetch('/data/sd_new.json'),
          fetch('/data/smp.json'),
          fetch('/data/pkbm.json'),
          fetch('/data/data_kegiatan_paud.json'),
          fetch('/data/data_kegiatan_sd.json'),
          fetch('/data/data_kegiatan_smp.json'),
          fetch('/data/data_kegiatan_pkbm.json')
        ]);

        const [paudRes, sdRes, smpRes, pkbmRes, kegPaudRes, kegSdRes, kegSmpRes, kegPkbmRes] = responses;

        // Check if all responses are ok
        responses.forEach((res, index) => {
          if (!res.ok) {
            throw new Error(`Failed to fetch file ${index + 1}: ${res.status}`);
          }
        });

        const jsonData = await Promise.all(responses.map(res => res.json()));

        // PERBAIKAN 1: Memperbaiki mapping data yang benar
        setData({
          paud: jsonData[0],      // PAUD data dari paud.json
          sd: jsonData[1],        // SD data dari sd_new.json  
          smp: jsonData[2],       // SMP data dari smp.json
          pkbm: jsonData[3],      // PKBM data dari pkbm.json
          kegiatanPaud: jsonData[4],  // kegiatan PAUD dari data_kegiatan_paud.json
          kegiatanSd: jsonData[5],    // kegiatan SD dari data_kegiatan_sd.json
          kegiatanSmp: jsonData[6],   // kegiatan SMP dari data_kegiatan_smp.json
          kegiatanPkbm: jsonData[7]   // kegiatan PKBM dari data_kegiatan_pkbm.json
        });

      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate summary statistics
  const calculateSummary = () => {
    if (loading || error) return { totalPaud: 0, totalSd: 0, totalSmp: 0, totalPkbm: 0, totalTenagaPendidik: 0 };

    const countSchools = (dataObj) => {
      return Object.values(dataObj).reduce((total, kecamatan) => {
        return total + (Array.isArray(kecamatan) ? kecamatan.length : 0);
      }, 0);
    };

    const countTeachers = (dataObj) => {
      return Object.values(dataObj).reduce((total, kecamatan) => {
        if (!Array.isArray(kecamatan)) return total;
        return total + kecamatan.reduce((subTotal, school) => {
          if (school.teacher?.n_teachers) return subTotal + Number(school.teacher.n_teachers);
          if (school.teachers) return subTotal + Number(school.teachers);
          return subTotal;
        }, 0);
      }, 0);
    };

    return {
      totalPaud: countSchools(data.paud),
      totalSd: countSchools(data.sd),
      totalSmp: countSchools(data.smp),
      totalPkbm: countSchools(data.pkbm),
      totalTenagaPendidik: countTeachers(data.paud) + countTeachers(data.sd) + countTeachers(data.smp) + countTeachers(data.pkbm)
    };
  };

  // Calculate condition statistics with Total Kelas and Kurang RKB
  const calculateConditionData = () => {
    const result = {
      PAUD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      SD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      SMP: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      PKBM: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 }
    };

    const processData = (dataObj, jenjang) => {
      Object.values(dataObj).forEach(kecamatan => {
        if (!Array.isArray(kecamatan)) return;
        kecamatan.forEach(school => {
          const condition = school.class_condition;
          if (condition) {
            const baik = Number(condition.classrooms_good) || 0;
            const sedang = Number(condition.classrooms_moderate_damage) || 0;
            const berat = Number(condition.classrooms_heavy_damage) || 0;
            const kurang = Number(condition.lacking_rkb) || 0; // Field yang benar: lacking_rkb
            
            result[jenjang].baik += baik;
            result[jenjang].sedang += sedang;
            result[jenjang].berat += berat;
            result[jenjang].kurangRkb += kurang;
            result[jenjang].total += (baik + sedang + berat);
          }
        });
      });
    };

    if (!loading && !error) {
      processData(data.paud, 'PAUD');
      processData(data.sd, 'SD');
      processData(data.smp, 'SMP');
      processData(data.pkbm, 'PKBM');
    }

    return result;
  };

  const calculateIntervensiData = () => {
    const result = {
      PAUD: { rehab: 0, pembangunan: 0 },
      SD: { rehab: 0, pembangunan: 0 },
      SMP: { rehab: 0, pembangunan: 0 },
      PKBM: { rehab: 0, pembangunan: 0 }
    };

    const processKegiatan = (kegiatanArray, jenjang) => {
      kegiatanArray.forEach(kegiatan => {
        const kegiatanName = (kegiatan.Kegiatan || "").trim().toLowerCase();
        const lokal = Number(kegiatan.Lokal) || 1;

        if (kegiatanName.includes("rehab") || kegiatanName.includes("rehabilitasi")) {
          result[jenjang].rehab += lokal;
        } else if (kegiatanName.includes("pembangunan rkb")) {
          result[jenjang].pembangunan += lokal;
        }
      });
    };

    if (!loading && !error) {
      processKegiatan(data.kegiatanPaud, "PAUD");
      processKegiatan(data.kegiatanSd, "SD");
      processKegiatan(data.kegiatanSmp, "SMP");
      processKegiatan(data.kegiatanPkbm, "PKBM");
    }

    return result;
  };

  // Get all available kecamatan
  const getAllKecamatan = () => {
    const kecamatanSet = new Set();
    
    if (!loading && !error) {
      Object.keys(data.paud).forEach(kec => kecamatanSet.add(kec));
      Object.keys(data.sd).forEach(kec => kecamatanSet.add(kec));
      Object.keys(data.smp).forEach(kec => kecamatanSet.add(kec));
      Object.keys(data.pkbm).forEach(kec => kecamatanSet.add(kec));
    }
    
    return Array.from(kecamatanSet).sort();
  };

  // MODIFIED: Calculate top 5 kecamatan per jenjang
  const calculateTopKecamatan = () => {
    const finalData = [];

    const getTopKecamatanPerJenjang = (dataObj, jenjangName) => {
      const kecamatanData = [];
      
      Object.entries(dataObj).forEach(([kecamatanName, schools]) => {
        if (!Array.isArray(schools)) return;
        
        let totalValue = 0;
        schools.forEach(school => {
          const condition = school.class_condition;
          if (condition) {
            let value = 0;
            if (kecamatanFilters.tipe === 'berat') {
              value = Number(condition.classrooms_heavy_damage) || 0;
            } else if (kecamatanFilters.tipe === 'sedang') {
              value = Number(condition.classrooms_moderate_damage) || 0;
            } else if (kecamatanFilters.tipe === 'kurangRkb') {
              value = Number(condition.lacking_rkb) || 0;
            }
            totalValue += value;
          }
        });

        if (totalValue > 0) {
          kecamatanData.push({
            kecamatanName,
            value: totalValue
          });
        }
      });

      // Sort per jenjang
      if (kecamatanFilters.urutan === 'teratas') {
        kecamatanData.sort((a, b) => b.value - a.value);
      } else {
        kecamatanData.sort((a, b) => a.value - b.value);
      }
      
      // Ambil top 5 per jenjang
      return kecamatanData.slice(0, 5).map(item => ({
        name: `${item.kecamatanName} (${jenjangName})`,
        PAUD: jenjangName === 'PAUD' ? item.value : 0,
        SD: jenjangName === 'SD' ? item.value : 0,
        SMP: jenjangName === 'SMP' ? item.value : 0,
        PKBM: jenjangName === 'PKBM' ? item.value : 0,
        sortValue: item.value,
        jenjang: jenjangName,
        kecamatan: item.kecamatanName
      }));
    };

    if (!loading && !error) {
      // Get top 5 for each jenjang
      const paudTop5 = getTopKecamatanPerJenjang(data.paud, 'PAUD');
      const sdTop5 = getTopKecamatanPerJenjang(data.sd, 'SD');
      const smpTop5 = getTopKecamatanPerJenjang(data.smp, 'SMP');
      const pkbmTop5 = getTopKecamatanPerJenjang(data.pkbm, 'PKBM');
      
      // Combine all data
      finalData.push(...paudTop5, ...sdTop5, ...smpTop5, ...pkbmTop5);
    }

    // Debug: Log untuk melihat berapa banyak data per jenjang
    console.log('Total data found:', finalData.length);
    console.log('Data per jenjang:');
    console.log('PAUD:', finalData.filter(d => d.jenjang === 'PAUD').length);
    console.log('SD:', finalData.filter(d => d.jenjang === 'SD').length); 
    console.log('SMP:', finalData.filter(d => d.jenjang === 'SMP').length);
    console.log('PKBM:', finalData.filter(d => d.jenjang === 'PKBM').length);
    
    console.log('Final result:', finalData.map(r => `${r.name}: ${r.sortValue}`));
    
    return finalData;
  };

  // Calculate top desa with filters
  const calculateTopDesa = () => {
    const desaStats = {};

    const processData = (dataObj, jenjangName) => {
      // Skip if specific jenjang selected and doesn't match
      if (desaFilters.jenjang !== 'Semua Jenjang' && desaFilters.jenjang !== jenjangName) {
        return;
      }

      Object.entries(dataObj).forEach(([kecamatanName, schools]) => {
        // Skip if specific kecamatan selected and doesn't match
        if (desaFilters.kecamatan !== 'Semua Kecamatan' && desaFilters.kecamatan !== kecamatanName) {
          return;
        }

        if (!Array.isArray(schools)) return;
        
        schools.forEach(school => {
          const desaName = school.village;
          const condition = school.class_condition;
          
          if (desaName && condition) {
            const key = `${desaName} (${kecamatanName})`;
            
            if (!desaStats[key]) {
              desaStats[key] = {
                name: desaName,
                kecamatan: kecamatanName,
                displayName: key,
                value: 0
              };
            }
            
            let value = 0;
            if (desaFilters.tipe === 'berat') {
              value = Number(condition.classrooms_heavy_damage) || 0;
            } else if (desaFilters.tipe === 'sedang') {
              value = Number(condition.classrooms_moderate_damage) || 0;
            } else if (desaFilters.tipe === 'kurangRkb') {
              value = Number(condition.lacking_rkb) || 0;
            }
            
            desaStats[key].value += value;
          }
        });
      });
    };

    if (!loading && !error) {
      processData(data.paud, 'PAUD');
      processData(data.sd, 'SD');
      processData(data.smp, 'SMP');
      processData(data.pkbm, 'PKBM');
    }

    // Convert to array and sort
    let sortedDesa = Object.values(desaStats);
    
    if (desaFilters.urutan === 'teratas') {
      sortedDesa.sort((a, b) => b.value - a.value);
    } else {
      sortedDesa.sort((a, b) => a.value - b.value);
    }
    
    return sortedDesa.slice(0, desaFilters.jumlah);
  };

  const summary = calculateSummary();
  const conditionData = calculateConditionData();
  const intervensiData = calculateIntervensiData();
  const topKecamatanData = calculateTopKecamatan();
  const topDesaData = calculateTopDesa();
  const allKecamatan = getAllKecamatan();

  // Prepare chart data for condition chart with new categories and colors
  const conditionChartData = [
    {
      jenjang: 'PAUD',
      'Total Kelas': conditionData.PAUD.total,
      'Kondisi Baik': conditionData.PAUD.baik,
      'Rusak Sedang': conditionData.PAUD.sedang,
      'Rusak Berat': conditionData.PAUD.berat,
      'Kurang RKB': conditionData.PAUD.kurangRkb,
    },
    {
      jenjang: 'SD', 
      'Total Kelas': conditionData.SD.total,
      'Kondisi Baik': conditionData.SD.baik,
      'Rusak Sedang': conditionData.SD.sedang,
      'Rusak Berat': conditionData.SD.berat,
      'Kurang RKB': conditionData.SD.kurangRkb,
    },
    {
      jenjang: 'SMP',
      'Total Kelas': conditionData.SMP.total,
      'Kondisi Baik': conditionData.SMP.baik,
      'Rusak Sedang': conditionData.SMP.sedang,
      'Rusak Berat': conditionData.SMP.berat,
      'Kurang RKB': conditionData.SMP.kurangRkb,
    },
    {
      jenjang: 'PKBM',
      'Total Kelas': conditionData.PKBM.total,
      'Kondisi Baik': conditionData.PKBM.baik,
      'Rusak Sedang': conditionData.PKBM.sedang,
      'Rusak Berat': conditionData.PKBM.berat,
      'Kurang RKB': conditionData.PKBM.kurangRkb,
    }
  ];

  // Prepare chart data for intervention chart (right chart)
  const intervensiChartData = [
    {
      jenjang: 'PAUD',
      'Rehabilitasi Ruang Kelas': intervensiData.PAUD.rehab,
      'Pembangunan RKB': intervensiData.PAUD.pembangunan,
    },
    {
      jenjang: 'SD',
      'Rehabilitasi Ruang Kelas': intervensiData.SD.rehab,
      'Pembangunan RKB': intervensiData.SD.pembangunan,
    },
    {
      jenjang: 'SMP',
      'Rehabilitasi Ruang Kelas': intervensiData.SMP.rehab,
      'Pembangunan RKB': intervensiData.SMP.pembangunan,
    },
    {
      jenjang: 'PKBM',
      'Rehabilitasi Ruang Kelas': intervensiData.PKBM.rehab,
      'Pembangunan RKB': intervensiData.PKBM.pembangunan,
    }
  ];

  const renderIntervensiChart = (title, dataKey, barColor) => {
    const chartHeight = 180;
    const maxVal = Math.max(...Object.values(conditionData).map(d => d[dataKey])) || 250;
    const step = Math.ceil(maxVal / 5) || 50;
    const adjustedMax = step * 5;
    const lines = Array.from({ length: 6 }, (_, i) => i * step);

    const orderedJenjang = ["PAUD", "SD", "SMP", "PKBM"];
    const chartData = orderedJenjang.map(jenjang => ({
      jenjang,
      value: conditionData[jenjang][dataKey]
    }));

    return (
      <div className={styles.intervensiChart}>
        <h3>{title}</h3>
        <div className={styles.barChartContainer}>
          {lines.map((val) => {
            const bottomPos = (val / adjustedMax) * chartHeight;
            return (
              <div 
                key={val} 
                className={styles.chartLines}
                style={{ bottom: `${bottomPos}px` }}
              >
                <span>{val}</span>
              </div>
            );
          })}

          <div className={styles.barContainer}>
            {chartData.map(item => {
              const height = (item.value / adjustedMax) * chartHeight;
              return (
                <div key={item.jenjang} className={styles.barItem}>
                  <div 
                    className={styles.bar}
                    style={{ 
                      height: `${height}px`, 
                      backgroundColor: barColor 
                    }}
                  ></div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.barLabels}>
          {chartData.map(item => (
            <div key={item.jenjang} className={styles.barLabel}>
              {item.jenjang}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // ====================================================================
  // ===== SNIPPET BARU DIMASUKKAN DI SINI ==============================
  // ====================================================================

  // Custom label component untuk menangani nilai 0 dan positioning yang lebih baik
  const CustomLabel = (props) => {
    const { x, y, width, height, value, payload } = props;
    
    // Jangan tampilkan label jika nilai 0, null, undefined, atau NaN
    if (!value || value === 0 || isNaN(value)) return null;
    
    // Posisi label di ujung bar dengan padding yang lebih besar untuk nilai kecil
    const minBarWidth = 20; // Minimum bar width untuk readability
    const actualBarWidth = Math.max(width, minBarWidth);
    const labelX = x + actualBarWidth + 12; // Lebih banyak padding
    const labelY = y + (height / 2);
    
    return (
      <text 
        x={labelX} 
        y={labelY} 
        fill="#374151" 
        fontSize="11" 
        fontWeight="600"
        textAnchor="start"
        dominantBaseline="middle"
        style={{
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))'
        }}
      >
        {value.toLocaleString()}
      </text>
    );
  };

  // Custom Bar component yang lebih baik
  const CustomBar = ({ fill, dataKey, data, ...props }) => {
    return (
      <Bar 
        {...props} 
        dataKey={dataKey} 
        fill={fill}
        radius={[0, 4, 4, 0]} // Rounded corners di ujung kanan
        minPointSize={20} // Minimum size untuk bar yang sangat kecil agar label tidak nabrak
      >
        <LabelList content={CustomLabel} />
      </Bar>
    );
  };

  const getTipeDisplayName = (tipe) => {
    switch(tipe) {
      case 'berat': return 'Rusak Berat';
      case 'sedang': return 'Rusak Sedang';  
      case 'kurangRkb': return 'Kurang RKB';
      default: return tipe;
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.loading}>Loading dashboard data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.error}>Error loading data: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* Header Dashboard */}
      <div className={styles.dashboardHeader}>
        <h1>Dashboard Pendidikan</h1>
      </div>

      {/* Dashboard Stats (Summary Cards) */}
      <div className={styles.summaryCardsContainer}>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TOTAL PAUD</div>
            <div className={styles.value}>{summary.totalPaud.toLocaleString()}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TOTAL SD</div>
            <div className={styles.value}>{summary.totalSd.toLocaleString()}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TOTAL SMP</div>
            <div className={styles.value}>{summary.totalSmp.toLocaleString()}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TOTAL PKBM</div>
            <div className={styles.value}>{summary.totalPkbm.toLocaleString()}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TENAGA PENDIDIK</div>
            <div className={styles.value}>{summary.totalTenagaPendidik.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Charts Container - Kondisi & Intervensi sesuai gambar */}
      <div className={styles.chartsContainer}>
        {/* Left Chart - Kondisi Sekolah berdasarkan Ruang Kelas dengan warna baru */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Kondisi Sekolah berdasarkan Ruang Kelas:</h3>
          </div>
          <div className={styles.chartContent}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={conditionChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jenjang" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total Kelas" fill="#8B5CF6" name="Total Kelas" />
                <Bar dataKey="Kondisi Baik" fill="#22C55E" name="Kondisi Baik" />
                <Bar dataKey="Rusak Sedang" fill="#F97316" name="Rusak Sedang" />
                <Bar dataKey="Rusak Berat" fill="#EF4444" name="Rusak Berat" />
                <Bar dataKey="Kurang RKB" fill="#3B82F6" name="Kurang RKB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Chart - Intervensi Ruang Kelas */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <h3>Intervensi Ruang Kelas Berdasarkan Kategori Sekolah</h3>
          </div>
          <div className={styles.chartContent}>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={intervensiChartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jenjang" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Rehabilitasi Ruang Kelas" fill="#4ade80" />
                <Bar dataKey="Pembangunan RKB" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Kecamatan Chart with Filters - MODIFIED: Now shows 5 per jenjang */}
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>Top 5 Kecamatan dengan Ruang Kelas {getTipeDisplayName(kecamatanFilters.tipe)} Terbanyak per Jenjang</h2>
          
          {/* Filters for Kecamatan Chart - Removed jumlah filter since it's fixed to 5 per jenjang */}
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Tampilkan Grafik:</label>
              <select 
                value={kecamatanFilters.tipe} 
                onChange={(e) => setKecamatanFilters({...kecamatanFilters, tipe: e.target.value})}
              >
                <option value="berat">Rusak Berat</option>
                <option value="sedang">Rusak Sedang</option>
                <option value="kurangRkb">Kurang RKB</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select 
                value={kecamatanFilters.urutan} 
                onChange={(e) => setKecamatanFilters({...kecamatanFilters, urutan: e.target.value})}
              >
                <option value="teratas">Teratas</option>
                <option value="terbawah">Terbawah</option>
              </select>
            </div>
            
            <div className={styles.info}>
              <span>Menampilkan 5 kecamatan teratas per jenjang (Total: 20 data)</span>
            </div>
          </div>
        </div>

        <div className={styles.chartOverflow}>
          {/* ==================================================================== */}
          {/* ===== RESPONSIVE CONTAINER BARU DIMASUKKAN DI SINI ============== */}
          {/* ==================================================================== */}
          <ResponsiveContainer width="100%" height={Math.max(600, topKecamatanData.length * 35)}>
            <BarChart 
              data={topKecamatanData} 
              layout="vertical" 
              margin={{ 
                top: 20, 
                right: 100, // Lebih banyak space untuk labels nilai kecil
                left: 60,   // Lebih banyak space untuk nama kecamatan panjang
                bottom: 20 
              }} 
              barSize={25}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis 
                type="number" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                domain={[0, 'dataMax + 10']} // Tambah space untuk labels
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={200} // Lebih lebar untuk nama kecamatan panjang
                fontSize={10} 
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ 
                  fontSize: 10, 
                  fill: '#374151',
                  textAnchor: 'end',
                  dominantBaseline: 'middle'
                }}
                tickFormatter={(value) => {
                  // Potong text yang terlalu panjang untuk mobile
                  if (window.innerWidth < 768 && value.length > 25) {
                    return value.substring(0, 22) + '...';
                  }
                  return value;
                }}
              />
              <Tooltip 
                formatter={(value, name) => [
                  value?.toLocaleString() || 0, 
                  name
                ]}
                labelFormatter={(label) => `Kecamatan: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
                }}
              />
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '12px'
                }}
              />
              <CustomBar dataKey="PAUD" fill="#EC4899" />
              <CustomBar dataKey="SD" fill="#DC2626" />
              <CustomBar dataKey="SMP" fill="#2563EB" />
              <CustomBar dataKey="PKBM" fill="#16A34A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Desa Chart with Filters */}
      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>Top {desaFilters.jumlah} Desa dengan Ruang Kelas {getTipeDisplayName(desaFilters.tipe)} Terbanyak</h2>
          
          {/* Filters for Desa Chart */}
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Jenjang:</label>
              <select 
                value={desaFilters.jenjang} 
                onChange={(e) => setDesaFilters({...desaFilters, jenjang: e.target.value})}
              >
                <option value="Semua Jenjang">Semua Jenjang</option>
                <option value="PAUD">PAUD</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="PKBM">PKBM</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Kecamatan:</label>
              <select 
                value={desaFilters.kecamatan} 
                onChange={(e) => setDesaFilters({...desaFilters, kecamatan: e.target.value})}
              >
                <option value="Semua Kecamatan">Semua Kecamatan</option>
                {allKecamatan.map(kec => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Tipe:</label>
              <select 
                value={desaFilters.tipe} 
                onChange={(e) => setDesaFilters({...desaFilters, tipe: e.target.value})}
              >
                <option value="berat">Rusak Berat</option>
                <option value="sedang">Rusak Sedang</option>
                <option value="kurangRkb">Kurang RKB</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>Jumlah:</label>
              <input 
                type="number" 
                min="1" 
                max="50" 
                value={desaFilters.jumlah}
                onChange={(e) => setDesaFilters({...desaFilters, jumlah: parseInt(e.target.value) || 20})}
              />
            </div>
            
            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select 
                value={desaFilters.urutan} 
                onChange={(e) => setDesaFilters({...desaFilters, urutan: e.target.value})}
              >
                <option value="teratas">Teratas</option>
                <option value="terbawah">Terbawah</option>
              </select>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={Math.max(500, topDesaData.length * 30)}>
          <BarChart 
            data={topDesaData} 
            layout="vertical" 
            margin={{ top: 20, right: 60, left: 50, bottom: 20 }} 
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis 
              type="category" 
              dataKey="displayName" 
              width={180} 
              fontSize={10} 
              interval={0} 
              tick={{ fill: '#555', fontSize: 10 }} 
            />
            <Tooltip />
            <Bar dataKey="value" fill="#4ecdc4">
              <LabelList content={CustomLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;