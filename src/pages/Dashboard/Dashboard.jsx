// src/pages/Dashboard/Dashboard.jsx - KODE LENGKAP FINAL

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import styles from './Dashboard.module.css';
import useDashboardData from '../../hooks/useDashboardData'; // <-- DIGANTI
import ErrorMessage from '../../components/common/ErrorMessage/ErrorMessage'; // <-- DITAMBAHKAN

const Dashboard = () => {
  // BAGIAN PENGAMBILAN DATA DIGANTI DENGAN CUSTOM HOOK
  const { data, loading, error } = useDashboardData();
  
  // STATE FILTER LOKAL TETAP SAMA
  const [kecamatanFilters, setKecamatanFilters] = useState({
    tipe: 'berat',
    jumlah: 5,
    urutan: 'teratas'
  });
  
  const [desaFilters, setDesaFilters] = useState({
    jenjang: 'Semua Jenjang',
    kecamatan: 'Semua Kecamatan', 
    tipe: 'berat',
    jumlah: 20,
    urutan: 'teratas'
  });

  // SEMUA FUNGSI KALKULASI DI BAWAH INI TIDAK DIUBAH SAMA SEKALI
  // Dibungkus dengan useMemo agar lebih efisien
  const { summary, conditionData, intervensiData, allKecamatan } = useMemo(() => {
    if (loading || error || !data) {
      return { summary: {}, conditionData: {}, intervensiData: {}, allKecamatan: [] };
    }

    const calculateSummary = () => {
      const countSchools = (dataObj) =>
        Object.values(dataObj).reduce(
          (total, kecamatan) => total + (Array.isArray(kecamatan) ? kecamatan.length : 0),
          0
        );
      const countTeachers = (dataObj) =>
        Object.values(dataObj).reduce((total, kecamatan) => {
          if (!Array.isArray(kecamatan)) return total;
          return (
            total +
            kecamatan.reduce(
              (subTotal, school) =>
                subTotal + (Number(school.teacher?.n_teachers) || Number(school.teachers) || 0),
              0
            )
          );
        }, 0);
      return {
        totalPaud: countSchools(data.paud),
        totalSd: countSchools(data.sd),
        totalSmp: countSchools(data.smp),
        totalPkbm: countSchools(data.pkbm),
        totalTenagaPendidik:
          countTeachers(data.paud) +
          countTeachers(data.sd) +
          countTeachers(data.smp) +
          countTeachers(data.pkbm),
      };
    };

    const calculateConditionData = () => {
      const result = {
        PAUD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
        SD: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
        SMP: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
        PKBM: { total: 0, baik: 0, sedang: 0, berat: 0, kurangRkb: 0 },
      };
      const processData = (dataObj, jenjang) => {
        Object.values(dataObj).forEach((kecamatan) => {
          if (!Array.isArray(kecamatan)) return;
          kecamatan.forEach((school) => {
            const condition = school.class_condition;
            if (condition) {
              const baik = Number(condition.classrooms_good) || 0;
              const sedang = Number(condition.classrooms_moderate_damage) || 0;
              const berat = Number(condition.classrooms_heavy_damage) || 0;
              const kurang = Number(condition.lacking_rkb) || 0;
              result[jenjang].baik += baik;
              result[jenjang].sedang += sedang;
              result[jenjang].berat += berat;
              result[jenjang].kurangRkb += kurang;
              result[jenjang].total += baik + sedang + berat;
            }
          });
        });
      };
      processData(data.paud, 'PAUD');
      processData(data.sd, 'SD');
      processData(data.smp, 'SMP');
      processData(data.pkbm, 'PKBM');
      return result;
    };

    const calculateIntervensiData = () => {
      const result = {
        PAUD: { rehab: 0, pembangunan: 0 },
        SD: { rehab: 0, pembangunan: 0 },
        SMP: { rehab: 0, pembangunan: 0 },
        PKBM: { rehab: 0, pembangunan: 0 },
      };
      const processKegiatan = (kegiatanArray, jenjang) => {
        kegiatanArray.forEach((kegiatan) => {
          const kegiatanName = (kegiatan.Kegiatan || '').trim().toLowerCase();
          const lokal = Number(kegiatan.Lokal) || 1;
          if (kegiatanName.includes('rehab') || kegiatanName.includes('rehabilitasi')) {
            result[jenjang].rehab += lokal;
          } else if (kegiatanName.includes('pembangunan rkb')) {
            result[jenjang].pembangunan += lokal;
          }
        });
      };
      processKegiatan(data.kegiatanPaud, 'PAUD');
      processKegiatan(data.kegiatanSd, 'SD');
      processKegiatan(data.kegiatanSmp, 'SMP');
      processKegiatan(data.kegiatanPkbm, 'PKBM');
      return result;
    };

    const getAllKecamatan = () => {
      const kecamatanSet = new Set();
      Object.keys(data.paud).forEach((kec) => kecamatanSet.add(kec));
      Object.keys(data.sd).forEach((kec) => kecamatanSet.add(kec));
      Object.keys(data.smp).forEach((kec) => kecamatanSet.add(kec));
      Object.keys(data.pkbm).forEach((kec) => kecamatanSet.add(kec));
      return Array.from(kecamatanSet).sort();
    };

    return {
      summary: calculateSummary(),
      conditionData: calculateConditionData(),
      intervensiData: calculateIntervensiData(),
      allKecamatan: getAllKecamatan(),
    };
  }, [data, loading, error]);

  const topKecamatanData = useMemo(() => {
    if (loading || error || !data) return [];

    const finalData = [];
    const getTopKecamatanPerJenjang = (dataObj, jenjangName) => {
      const kecamatanData = [];
      Object.entries(dataObj).forEach(([kecamatanName, schools]) => {
        if (!Array.isArray(schools)) return;
        let totalValue = 0;
        schools.forEach((school) => {
          const condition = school.class_condition;
          if (condition) {
            let value = 0;
            if (kecamatanFilters.tipe === 'berat')
              value = Number(condition.classrooms_heavy_damage) || 0;
            else if (kecamatanFilters.tipe === 'sedang')
              value = Number(condition.classrooms_moderate_damage) || 0;
            else if (kecamatanFilters.tipe === 'kurangRkb')
              value = Number(condition.lacking_rkb) || 0;
            totalValue += value;
          }
        });
        if (totalValue > 0) kecamatanData.push({ kecamatanName, value: totalValue });
      });

      if (kecamatanFilters.urutan === 'teratas')
        kecamatanData.sort((a, b) => b.value - a.value);
      else kecamatanData.sort((a, b) => a.value - b.value);

      return kecamatanData.slice(0, 5).map((item) => ({
        name: `${item.kecamatanName} (${jenjangName})`,
        PAUD: jenjangName === 'PAUD' ? item.value : 0,
        SD: jenjangName === 'SD' ? item.value : 0,
        SMP: jenjangName === 'SMP' ? item.value : 0,
        PKBM: jenjangName === 'PKBM' ? item.value : 0,
        sortValue: item.value,
        jenjang: jenjangName,
        kecamatan: item.kecamatanName,
      }));
    };

    const paudTop5 = getTopKecamatanPerJenjang(data.paud, 'PAUD');
    const sdTop5 = getTopKecamatanPerJenjang(data.sd, 'SD');
    const smpTop5 = getTopKecamatanPerJenjang(data.smp, 'SMP');
    const pkbmTop5 = getTopKecamatanPerJenjang(data.pkbm, 'PKBM');
    finalData.push(...paudTop5, ...sdTop5, ...smpTop5, ...pkbmTop5);
    return finalData;
  }, [data, loading, error, kecamatanFilters]);

  const topDesaData = useMemo(() => {
    if (loading || error || !data) return [];

    const desaStats = {};
    const processData = (dataObj, jenjangName) => {
      if (desaFilters.jenjang !== 'Semua Jenjang' && desaFilters.jenjang !== jenjangName) return;
      Object.entries(dataObj).forEach(([kecamatanName, schools]) => {
        if (desaFilters.kecamatan !== 'Semua Kecamatan' && desaFilters.kecamatan !== kecamatanName)
          return;
        if (!Array.isArray(schools)) return;
        schools.forEach((school) => {
          const desaName = school.village;
          const condition = school.class_condition;
          if (desaName && condition) {
            const key = `${desaName} (${kecamatanName})`;
            if (!desaStats[key])
              desaStats[key] = {
                name: desaName,
                kecamatan: kecamatanName,
                displayName: key,
                value: 0,
              };
            let value = 0;
            if (desaFilters.tipe === 'berat')
              value = Number(condition.classrooms_heavy_damage) || 0;
            else if (desaFilters.tipe === 'sedang')
              value = Number(condition.classrooms_moderate_damage) || 0;
            else if (desaFilters.tipe === 'kurangRkb')
              value = Number(condition.lacking_rkb) || 0;
            desaStats[key].value += value;
          }
        });
      });
    };

    processData(data.paud, 'PAUD');
    processData(data.sd, 'SD');
    processData(data.smp, 'SMP');
    processData(data.pkbm, 'PKBM');

    let sortedDesa = Object.values(desaStats);
    if (desaFilters.urutan === 'teratas') sortedDesa.sort((a, b) => b.value - a.value);
    else sortedDesa.sort((a, b) => a.value - b.value);
    return sortedDesa.slice(0, desaFilters.jumlah);
  }, [data, loading, error, desaFilters]);

  // LOGIKA FORMATTING DATA CHART TETAP SAMA
  const conditionChartData = useMemo(() => {
    if (!conditionData.PAUD) return [];
    return [
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
      },
    ];
  }, [conditionData]);

  const intervensiChartData = useMemo(() => {
    if (!intervensiData.PAUD) return [];
    return [
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
      },
    ];
  }, [intervensiData]);

  // KOMPONEN RENDER DAN JSX LAINNYA TIDAK DIUBAH
  const CustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value || value === 0 || isNaN(value)) return null;
    const labelX = x + width + 12;
    const labelY = y + height / 2;
    return (
      <text
        x={labelX}
        y={labelY}
        fill="#374151"
        fontSize="11"
        fontWeight="600"
        textAnchor="start"
        dominantBaseline="middle"
        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
      >
        {value.toLocaleString()}
      </text>
    );
  };

  const CustomBar = ({ fill, dataKey, ...props }) => (
    <Bar {...props} dataKey={dataKey} fill={fill} radius={[0, 4, 4, 0]} minPointSize={20}>
      <LabelList content={CustomLabel} />
    </Bar>
  );

  const getTipeDisplayName = (tipe) => {
    switch (tipe) {
      case 'berat':
        return 'Rusak Berat';
      case 'sedang':
        return 'Rusak Sedang';
      case 'kurangRkb':
        return 'Kurang RKB';
      default:
        return tipe;
    }
  };

  // BAGIAN RENDER UTAMA
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
        <ErrorMessage message={error} />
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      {/* SEMUA JSX DI BAWAH INI TIDAK DIUBAH */}
      <div className={styles.dashboardHeader}>
        <h1>Dashboard Pendidikan</h1>
      </div>
      <div className={styles.summaryCardsContainer}>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TOTAL PAUD</div>
            <div className={styles.value}>{summary.totalPaud?.toLocaleString()}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TOTAL SD</div>
            <div className={styles.value}>{summary.totalSd?.toLocaleString()}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TOTAL SMP</div>
            <div className={styles.value}>{summary.totalSmp?.toLocaleString()}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TOTAL PKBM</div>
            <div className={styles.value}>{summary.totalPkbm?.toLocaleString()}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.title}>TENAGA PENDIDIK</div>
            <div className={styles.value}>
              {summary.totalTenagaPendidik?.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chartsContainer}>
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
                {/* Warna disesuaikan tema hijau–kuning */}
                <Bar dataKey="Total Kelas" fill="#94A3B8" name="Total Kelas" />
                <Bar dataKey="Kondisi Baik" fill="#1E7F4F" name="Kondisi Baik" />
                <Bar dataKey="Rusak Sedang" fill="#F59E0B" name="Rusak Sedang" />
                <Bar dataKey="Rusak Berat" fill="#DC2626" name="Rusak Berat" />
                <Bar dataKey="Kurang RKB" fill="#0EA5E9" name="Kurang RKB" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
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
                {/* Diselaraskan dengan tema */}
                <Bar dataKey="Rehabilitasi Ruang Kelas" fill="#56B789" />
                <Bar dataKey="Pembangunan RKB" fill="#F2B705" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>
            Top 5 Kecamatan dengan Ruang Kelas {getTipeDisplayName(kecamatanFilters.tipe)} Terbanyak
            per Jenjang
          </h2>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Tampilkan Grafik:</label>
              <select
                value={kecamatanFilters.tipe}
                onChange={(e) =>
                  setKecamatanFilters({ ...kecamatanFilters, tipe: e.target.value })
                }
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
                onChange={(e) =>
                  setKecamatanFilters({ ...kecamatanFilters, urutan: e.target.value })
                }
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
          <ResponsiveContainer
            width="100%"
            height={Math.max(600, topKecamatanData.length * 35)}
          >
            <BarChart
              className="horizontal-bar-chart"
              data={topKecamatanData}
              layout="vertical"
              margin={{ top: 20, right: 100, left: 60, bottom: 20 }}
              barSize={25}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                domain={[0, 'dataMax + 10']}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={200}
                fontSize={10}
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 10,
                  fill: '#374151',
                  textAnchor: 'end',
                  dominantBaseline: 'middle',
                }}
                tickFormatter={(value) =>
                  window.innerWidth < 768 && value.length > 25
                    ? value.substring(0, 22) + '...'
                    : value
                }
              />
              <Tooltip
                formatter={(value, name) => [value?.toLocaleString() || 0, name]}
                labelFormatter={(label) => `Kecamatan: ${label}`}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
              {/* Palet tema per-jenjang */}
              <CustomBar dataKey="PAUD" fill="#2DD4BF" />
              <CustomBar dataKey="SD" fill="#1E7F4F" />
              <CustomBar dataKey="SMP" fill="#0EA5E9" />
              <CustomBar dataKey="PKBM" fill="#F2B705" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>
            Top {desaFilters.jumlah} Desa dengan Ruang Kelas {getTipeDisplayName(desaFilters.tipe)}{' '}
            Terbanyak
          </h2>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Jenjang:</label>
              <select
                value={desaFilters.jenjang}
                onChange={(e) => setDesaFilters({ ...desaFilters, jenjang: e.target.value })}
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
                onChange={(e) =>
                  setDesaFilters({ ...desaFilters, kecamatan: e.target.value })
                }
              >
                <option value="Semua Kecamatan">Semua Kecamatan</option>
                {allKecamatan.map((kec) => (
                  <option key={kec} value={kec}>
                    {kec}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Tipe:</label>
              <select
                value={desaFilters.tipe}
                onChange={(e) => setDesaFilters({ ...desaFilters, tipe: e.target.value })}
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
                onChange={(e) =>
                  setDesaFilters({
                    ...desaFilters,
                    jumlah: parseInt(e.target.value) || 20,
                  })
                }
              />
            </div>
            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select
                value={desaFilters.urutan}
                onChange={(e) => setDesaFilters({ ...desaFilters, urutan: e.target.value })}
              >
                <option value="teratas">Teratas</option>
                <option value="terbawah">Terbawah</option>
              </select>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={Math.max(500, topDesaData.length * 30)}>
          <BarChart
            className="horizontal-bar-chart"
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
            {/* selaraskan dengan tema untuk bar nilai */}
            <Bar dataKey="value" fill="#1E7F4F">
              <LabelList content={CustomLabel} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;
