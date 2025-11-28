// src/pages/Dashboard/Dashboard.jsx - MOBILE TWEAK: geser chart lebih ke kiri

import ChartKit from "@/components/chart/ChartKit";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList } from 'recharts';
import styles from './Dashboard.module.css';
import useDashboardData from '../../hooks/useDashboardData';
import ErrorMessage from '../../components/common/ErrorMessage/ErrorMessage';

const Dashboard = () => {
  const { data, loading, error } = useDashboardData();

  // === Mobile detection
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener?.('change', onChange);
    mq.addListener?.(onChange);
    return () => {
      mq.removeEventListener?.('change', onChange);
      mq.removeListener?.(onChange);
    };
  }, []);

  // === Measure container width
  const [rcKey, setRcKey] = useState(0);
  const chartWrapRef = useRef(null);
  const [chartWidth, setChartWidth] = useState(null);

  useEffect(() => {
    const el = chartWrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') {
      if (el) setChartWidth(el.clientWidth || 360);
      return;
    }
    const measure = () => {
      const w = el.clientWidth || 360;
      setChartWidth(w);
      setRcKey((k) => k + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // === Layout dinamis untuk chart horizontal
  const hLayout = useMemo(() => {
    const w = chartWidth || 360;
    // DIPERKECIL agar bar lebih ke kiri di mobile:
    // - fraksi dari lebar kontainer untuk label Y
    // - batas minimum juga diturunkan
    const yAxisWidth = Math.min(180, Math.max(70, Math.floor(w * (isMobile ? 0.36 : 0.44))));
    const left = isMobile ? 6 : 60;   // sebelumnya 12 → 6
    const right = isMobile ? 24 : 100; // sedikit rapat di mobile
    const barSize = isMobile ? 18 : 25;
    const tickFont = isMobile ? 10 : 11;
    return { yAxisWidth, left, right, barSize, tickFont };
  }, [chartWidth, isMobile]);

  // === Filters (tetap)
  const [kecamatanFilters, setKecamatanFilters] = useState({ tipe: 'berat', jumlah: 5, urutan: 'teratas' });
  const [desaFilters, setDesaFilters] = useState({
    jenjang: 'Semua Jenjang', kecamatan: 'Semua Kecamatan', tipe: 'berat', jumlah: 20, urutan: 'teratas'
  });

  // === Perhitungan data (tetap)
  const { summary, conditionData, intervensiData, allKecamatan } = useMemo(() => {
    if (loading || error || !data) {
      return { summary: {}, conditionData: {}, intervensiData: {}, allKecamatan: [] };
    }

    const countSchools = (dataObj) =>
      Object.values(dataObj || {}).reduce((t, kec) => t + (Array.isArray(kec) ? kec.length : 0), 0);
    const countTeachers = (dataObj) =>
      Object.values(dataObj || {}).reduce((t, kec) => {
        if (!Array.isArray(kec)) return t;
        return t + kec.reduce((s, sch) => s + (Number(sch.teacher?.n_teachers) || Number(sch.teachers) || 0), 0);
      }, 0);

    const calculateSummary = () => ({
      totalPaud: countSchools(data.paud),
      totalSd: countSchools(data.sd),
      totalSmp: countSchools(data.smp),
      totalPkbm: countSchools(data.pkbm),
      totalTenagaPendidik:
        countTeachers(data.paud) + countTeachers(data.sd) + countTeachers(data.smp) + countTeachers(data.pkbm),
    });

    const calculateConditionData = () => {
      const r = { PAUD:{total:0,baik:0,sedang:0,berat:0,kurangRkb:0},
                  SD:{total:0,baik:0,sedang:0,berat:0,kurangRkb:0},
                  SMP:{total:0,baik:0,sedang:0,berat:0,kurangRkb:0},
                  PKBM:{total:0,baik:0,sedang:0,berat:0,kurangRkb:0} };
      const proc = (obj, j) => {
        Object.values(obj || {}).forEach(kec => {
          if (!Array.isArray(kec)) return;
          kec.forEach(s => {
            const c = s.class_condition; if (!c) return;
            const baik = +c.classrooms_good || 0;
            const sedang = +c.classrooms_moderate_damage || 0;
            const berat = +c.classrooms_heavy_damage || 0;
            const kurang = +c.lacking_rkb || 0;
            r[j].baik += baik; r[j].sedang += sedang; r[j].berat += berat; r[j].kurangRkb += kurang;
            r[j].total += baik + sedang + berat;
          });
        });
      };
      proc(data.paud,'PAUD'); proc(data.sd,'SD'); proc(data.smp,'SMP'); proc(data.pkbm,'PKBM');
      return r;
    };

    const calculateIntervensiData = () => {
      const r = { PAUD:{rehab:0,pembangunan:0}, SD:{rehab:0,pembangunan:0},
                  SMP:{rehab:0,pembangunan:0}, PKBM:{rehab:0,pembangunan:0} };
      const proc = (arr, j) => (arr||[]).forEach(k => {
        const nm = (k.Kegiatan||'').trim().toLowerCase();
        const lokal = Number(k.Lokal)||1;
        if (nm.includes('rehab') || nm.includes('rehabilitasi')) r[j].rehab += lokal;
        else if (nm.includes('pembangunan rkb')) r[j].pembangunan += lokal;
      });
      proc(data.kegiatanPaud,'PAUD'); proc(data.kegiatanSd,'SD'); proc(data.kegiatanSmp,'SMP'); proc(data.kegiatanPkbm,'PKBM');
      return r;
    };

    const getAllKecamatan = () => {
      const s = new Set();
      Object.keys(data.paud || {}).forEach(s.add, s);
      Object.keys(data.sd || {}).forEach(s.add, s);
      Object.keys(data.smp || {}).forEach(s.add, s);
      Object.keys(data.pkbm || {}).forEach(s.add, s);
      return Array.from(s).sort();
    };

    return { summary: calculateSummary(), conditionData: calculateConditionData(),
             intervensiData: calculateIntervensiData(), allKecamatan: getAllKecamatan() };
  }, [data, loading, error]);

  const topKecamatanData = useMemo(() => {
    if (loading || error || !data) return [];
    const result = [];
    const top5 = (obj, jenjang) => {
      const rows = [];
      Object.entries(obj || {}).forEach(([kec, schools]) => {
        if (!Array.isArray(schools)) return;
        let total = 0;
        schools.forEach(s => {
          const c = s.class_condition; if (!c) return;
          let v = 0;
          if (kecamatanFilters.tipe === 'berat') v = +c.classrooms_heavy_damage || 0;
          else if (kecamatanFilters.tipe === 'sedang') v = +c.classrooms_moderate_damage || 0;
          else if (kecamatanFilters.tipe === 'kurangRkb') v = +c.lacking_rkb || 0;
          total += v;
        });
        if (total > 0) rows.push({ kecamatanName:kec, value: total });
      });
      rows.sort((a,b) => kecamatanFilters.urutan === 'teratas' ? b.value-a.value : a.value-b.value);
      return rows.slice(0,5).map(it => ({
        name: `${it.kecamatanName} (${jenjang})`,
        PAUD: jenjang==='PAUD'?it.value:0,
        SD:   jenjang==='SD'?it.value:0,
        SMP:  jenjang==='SMP'?it.value:0,
        PKBM: jenjang==='PKBM'?it.value:0,
        sortValue: it.value, jenjang, kecamatan: it.kecamatanName
      }));
    };
    result.push(...top5(data.paud,'PAUD'), ...top5(data.sd,'SD'), ...top5(data.smp,'SMP'), ...top5(data.pkbm,'PKBM'));
    return result;
  }, [data, loading, error, kecamatanFilters]);

  const topDesaData = useMemo(() => {
    if (loading || error || !data) return [];
    const agg = {};
    const proc = (obj, j) => {
      if (desaFilters.jenjang !== 'Semua Jenjang' && desaFilters.jenjang !== j) return;
      Object.entries(obj || {}).forEach(([kec, schools]) => {
        if (desaFilters.kecamatan !== 'Semua Kecamatan' && desaFilters.kecamatan !== kec) return;
        if (!Array.isArray(schools)) return;
        schools.forEach(s => {
          const desa = s.village, c = s.class_condition;
          if (!desa || !c) return;
          const key = `${desa} (${kec})`;
          agg[key] ??= { name: desa, kecamatan: kec, displayName: key, value: 0 };
          let v=0;
          if (desaFilters.tipe==='berat') v = +c.classrooms_heavy_damage || 0;
          else if (desaFilters.tipe==='sedang') v = +c.classrooms_moderate_damage || 0;
          else if (desaFilters.tipe==='kurangRkb') v = +c.lacking_rkb || 0;
          agg[key].value += v;
        });
      });
    };
    proc(data.paud,'PAUD'); proc(data.sd,'SD'); proc(data.smp,'SMP'); proc(data.pkbm,'PKBM');
    const arr = Object.values(agg);
    arr.sort((a,b) => desaFilters.urutan === 'teratas' ? b.value-a.value : a.value-b.value);
    return arr.slice(0, desaFilters.jumlah);
  }, [data, loading, error, desaFilters]);

  // === Data untuk chart kolom (tetap)
  const conditionChartData = useMemo(() => {
    if (!conditionData.PAUD) return [];
    return [
      { jenjang:'PAUD', 'Total Kelas':conditionData.PAUD.total, 'Kondisi Baik':conditionData.PAUD.baik,
        'Rusak Sedang':conditionData.PAUD.sedang, 'Rusak Berat':conditionData.PAUD.berat, 'Kurang RKB':conditionData.PAUD.kurangRkb },
      { jenjang:'SD',   'Total Kelas':conditionData.SD.total,   'Kondisi Baik':conditionData.SD.baik,
        'Rusak Sedang':conditionData.SD.sedang,   'Rusak Berat':conditionData.SD.berat,   'Kurang RKB':conditionData.SD.kurangRkb },
      { jenjang:'SMP',  'Total Kelas':conditionData.SMP.total,  'Kondisi Baik':conditionData.SMP.baik,
        'Rusak Sedang':conditionData.SMP.sedang,  'Rusak Berat':conditionData.SMP.berat,  'Kurang RKB':conditionData.SMP.kurangRkb },
      { jenjang:'PKBM', 'Total Kelas':conditionData.PKBM.total, 'Kondisi Baik':conditionData.PKBM.baik,
        'Rusak Sedang':conditionData.PKBM.sedang, 'Rusak Berat':conditionData.PKBM.berat, 'Kurang RKB':conditionData.PKBM.kurangRkb },
    ];
  }, [conditionData]);

  const intervensiChartData = useMemo(() => {
    if (!intervensiData.PAUD) return [];
    return [
      { jenjang:'PAUD', 'Rehabilitasi Ruang Kelas':intervensiData.PAUD.rehab, 'Pembangunan RKB':intervensiData.PAUD.pembangunan },
      { jenjang:'SD',   'Rehabilitasi Ruang Kelas':intervensiData.SD.rehab,   'Pembangunan RKB':intervensiData.SD.pembangunan },
      { jenjang:'SMP',  'Rehabilitasi Ruang Kelas':intervensiData.SMP.rehab,  'Pembangunan RKB':intervensiData.SMP.pembangunan },
      { jenjang:'PKBM', 'Rehabilitasi Ruang Kelas':intervensiData.PKBM.rehab, 'Pembangunan RKB':intervensiData.PKBM.pembangunan },
    ];
  }, [intervensiData]);

  // === Custom label & bar (tetap)
  const CustomLabel = (props) => {
    const { x, y, width, height, value } = props;
    if (!value || value === 0 || isNaN(value)) return null;
    return (
      <text
        x={x + width + 12}
        y={y + height / 2}
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

  const getTipeDisplayName = (tipe) => (
    tipe === 'berat' ? 'Rusak Berat' : tipe === 'sedang' ? 'Rusak Sedang' : tipe === 'kurangRkb' ? 'Kurang RKB' : tipe
  );

  // === Render
  if (loading) {
    return <div className={styles.dashboard}><div className={styles.loading}>Loading dashboard data...</div></div>;
  }
  if (error) {
    return <div className={styles.dashboard}><ErrorMessage message={error} /></div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardHeader}><h1>Dashboard Pendidikan</h1></div>

      <div className={styles.summaryCardsContainer}>
        <div className={styles.summaryCards}>
          <div className={styles.summaryCard}><div className={styles.title}>TOTAL PAUD</div><div className={styles.value}>{summary.totalPaud?.toLocaleString()}</div></div>
          <div className={styles.summaryCard}><div className={styles.title}>TOTAL SD</div><div className={styles.value}>{summary.totalSd?.toLocaleString()}</div></div>
          <div className={styles.summaryCard}><div className={styles.title}>TOTAL SMP</div><div className={styles.value}>{summary.totalSmp?.toLocaleString()}</div></div>
          <div className={styles.summaryCard}><div className={styles.title}>TOTAL PKBM</div><div className={styles.value}>{summary.totalPkbm?.toLocaleString()}</div></div>
          <div className={styles.summaryCard}><div className={styles.title}>TENAGA PENDIDIK</div><div className={styles.value}>{summary.totalTenagaPendidik?.toLocaleString()}</div></div>
        </div>
      </div>

      <div className={styles.chartsContainer}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}><h3>Kondisi Sekolah berdasarkan Ruang Kelas:</h3></div>
          <div className={styles.chartContent}>
            <ResponsiveContainer width={chartWidth || '100%'} height={350} key={`rc-a-${rcKey}`}>
              <BarChart data={conditionChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} isAnimationActive={!isMobile}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jenjang" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Total Kelas" fill="#94A3B8" name="Total Kelas" isAnimationActive={!isMobile} />
                <Bar dataKey="Kondisi Baik" fill="#1E7F4F" name="Kondisi Baik" isAnimationActive={!isMobile} />
                <Bar dataKey="Rusak Sedang" fill="#F59E0B" name="Rusak Sedang" isAnimationActive={!isMobile} />
                <Bar dataKey="Rusak Berat" fill="#DC2626" name="Rusak Berat" isAnimationActive={!isMobile} />
                <Bar dataKey="Kurang RKB" fill="#0EA5E9" name="Kurang RKB" isAnimationActive={!isMobile} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}><h3>Intervensi Ruang Kelas Berdasarkan Kategori Sekolah</h3></div>
          <div className={styles.chartContent}>
            <ResponsiveContainer width={chartWidth || '100%'} height={350} key={`rc-b-${rcKey}`}>
              <BarChart data={intervensiChartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }} isAnimationActive={!isMobile}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jenjang" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Rehabilitasi Ruang Kelas" fill="#56B789" isAnimationActive={!isMobile} />
                <Bar dataKey="Pembangunan RKB" fill="#F2B705" isAnimationActive={!isMobile} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>Top 5 Kecamatan dengan Ruang Kelas {getTipeDisplayName(kecamatanFilters.tipe)} Terbanyak per Jenjang</h2>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Tampilkan Grafik:</label>
              <select value={kecamatanFilters.tipe} onChange={(e)=>setKecamatanFilters({ ...kecamatanFilters, tipe:e.target.value })}>
                <option value="berat">Rusak Berat</option>
                <option value="sedang">Rusak Sedang</option>
                <option value="kurangRkb">Kurang RKB</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select value={kecamatanFilters.urutan} onChange={(e)=>setKecamatanFilters({ ...kecamatanFilters, urutan:e.target.value })}>
                <option value="teratas">Teratas</option>
                <option value="terbawah">Terbawah</option>
              </select>
            </div>
            <div className={styles.info}><span>Menampilkan 5 kecamatan teratas per jenjang (Total: 20 data)</span></div>
          </div>
        </div>

        <div className={styles.chartOverflow} ref={chartWrapRef}>
          <ResponsiveContainer key={`rc-c-${rcKey}`} width={chartWidth || '100%'} height={Math.max(600, topKecamatanData.length * 35)}>
            <BarChart
              className="horizontal-bar-chart"
              data={topKecamatanData}
              layout="vertical"
              margin={{ top: 18, right: hLayout.right, left: hLayout.left, bottom: 18 }}
              barSize={hLayout.barSize}
              barGap={4}
              isAnimationActive={!isMobile}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: hLayout.tickFont, fill: '#6B7280' }} domain={[0, 'dataMax + 10']} />
              <YAxis
                type="category"
                dataKey="name"
                width={hLayout.yAxisWidth}
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#374151', textAnchor: 'end', dominantBaseline: 'middle' }}
                tickFormatter={(v)=> (isMobile && v.length>25 ? v.slice(0,22)+'...' : v)}
              />
              <Tooltip
                formatter={(v, n)=>[v?.toLocaleString()||0, n]}
                labelFormatter={(l)=>`Kecamatan: ${l}`}
                contentStyle={{ backgroundColor:'#fff', border:'1px solid #E5E7EB', borderRadius:'8px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)' }}
              />
              <Legend wrapperStyle={{ paddingTop:'20px', fontSize:'12px' }} />
              <CustomBar dataKey="PAUD" fill="#2DD4BF" isAnimationActive={!isMobile} />
              <CustomBar dataKey="SD"   fill="#1E7F4F" isAnimationActive={!isMobile} />
              <CustomBar dataKey="SMP"  fill="#0EA5E9" isAnimationActive={!isMobile} />
              <CustomBar dataKey="PKBM" fill="#F2B705" isAnimationActive={!isMobile} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <div className={styles.chartHeader}>
          <h2>Top {desaFilters.jumlah} Desa dengan Ruang Kelas {getTipeDisplayName(desaFilters.tipe)} Terbanyak</h2>
          <div className={styles.filtersContainer}>
            <div className={styles.filterGroup}>
              <label>Jenjang:</label>
              <select value={desaFilters.jenjang} onChange={(e)=>setDesaFilters({ ...desaFilters, jenjang:e.target.value })}>
                <option value="Semua Jenjang">Semua Jenjang</option>
                <option value="PAUD">PAUD</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="PKBM">PKBM</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Kecamatan:</label>
              <select value={desaFilters.kecamatan} onChange={(e)=>setDesaFilters({ ...desaFilters, kecamatan:e.target.value })}>
                <option value="Semua Kecamatan">Semua Kecamatan</option>
                {allKecamatan.map((k)=> <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Tipe:</label>
              <select value={desaFilters.tipe} onChange={(e)=>setDesaFilters({ ...desaFilters, tipe:e.target.value })}>
                <option value="berat">Rusak Berat</option>
                <option value="sedang">Rusak Sedang</option>
                <option value="kurangRkb">Kurang RKB</option>
              </select>
            </div>
            <div className={styles.filterGroup}>
              <label>Jumlah:</label>
              <input type="number" min="1" max="50" value={desaFilters.jumlah}
                     onChange={(e)=>setDesaFilters({ ...desaFilters, jumlah: parseInt(e.target.value)||20 })}/>
            </div>
            <div className={styles.filterGroup}>
              <label>Urutan:</label>
              <select value={desaFilters.urutan} onChange={(e)=>setDesaFilters({ ...desaFilters, urutan:e.target.value })}>
                <option value="teratas">Teratas</option>
                <option value="terbawah">Terbawah</option>
              </select>
            </div>
          </div>
        </div>

        <ResponsiveContainer width={chartWidth || '100%'} height={Math.max(500, topDesaData.length * 30)} key={`rc-d-${rcKey}`}>
          <BarChart
            className="horizontal-bar-chart"
            data={topDesaData}
            layout="vertical"
            margin={{ top: 18, right: hLayout.right, left: hLayout.left, bottom: 18 }}
            barSize={isMobile ? 16 : 20}
            isAnimationActive={!isMobile}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="displayName" width={hLayout.yAxisWidth} interval={0} tick={{ fill:'#555', fontSize:10 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#1E7F4F" isAnimationActive={!isMobile}><LabelList content={CustomLabel} /></Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;