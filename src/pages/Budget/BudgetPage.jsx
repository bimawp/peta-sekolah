import React, { useState } from 'react';
import styles from './BudgetPage.module.css';

function BarChart({ title, data, colors }) {
  // data: array of { label, value }
  // colors: array of fill colors for bars

  const isTwoBars = data.length === 2;
    const barWidth = isTwoBars ? 80 : 30;
    const barGap = isTwoBars ? 130 : 65;
  const maxValue = Math.max(...data.map(d => d.value));
  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartTitle}>{title}</div>
      <svg
        viewBox="0 0 400 200"
        className={styles.chartSVG}
        role="img"
        aria-label={title}
      >
        {/* Vertical grid lines */}
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1={80 + i * 60}
            y1={10}
            x2={80 + i * 60}
            y2={185}
            stroke="#ccc"
            strokeWidth="1"
          />
        ))}

        {/* Bars */}
        {data.map((d, idx) => {
  const barHeight = (d.value / maxValue) * 140;
  const barX = 90 + idx * barGap;
  const barY = 170 - barHeight;
  return (
    <g key={idx}>
      <rect
        x={barX}
        y={barY}
        width={barWidth}
        height={barHeight}
        fill={colors[idx]}
        rx="3"
        ry="3"
      />
      <text
        x={barX + barWidth / 2}
        y={180} // posisi label tepat di bawah batang, agak dekat
        textAnchor="end" // teks rata kanan agar ujung kanan di tengah batang
        className={styles.chartLabel}
      >
        {d.label}
      </text>
    </g>
  );
})}

        {/* Y Axis */}
        <line x1="70" y1="10" x2="70" y2="185" stroke="#999" strokeWidth="1" />
        {/* Y Axis Labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => {
          const y = 170 - (v * 140);
          const label = Math.round(maxValue * v / 1000000000 * 10) / 10 + 'M';
          return (
            <text
              key={i}
              x="10"
              y={y + 5}
              className={styles.chartYAxisLabel}
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function BudgetPage() {
  const [jenjang, setJenjang] = useState('');
  const [pkk, setPkk] = useState('');
  const [kecamatan, setKecamatan] = useState('');

  // Dummy data for charts mimicking colors and labels from image
  const chart1Data = [
    { label: 'Rusak Sedang', value: 1200000000 },
    { label: 'Rusak Berat', value: 200000000 },
    { label: 'Kurang RKB', value: 1500000000 },
    { label: 'Rehabilitasi Ruang Kelas', value: 40000000 },
    { label: 'Pembangunan RKB', value: 10000000 },
  ];
  const chart1Colors = ['#f5c542', '#fc4c57', '#b8fa59', '#3ca6f0', '#8a8a8a'];

  const chart2Data = [
    { label: 'Belum Dierhab Rusak Berat', value: 200000000 },
    { label: 'Belum Dibangun RKB', value: 1000000000 },
  ];
  const chart2Colors = ['#fc4c57', '#f5c542'];

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <h1>Anggaran</h1>
        <button className={styles.userBtn}>Admin</button>
      </header>

      <section className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="jenjang">Pilih Jenjang</label>
          <select
            id="jenjang"
            value={jenjang}
            onChange={(e) => setJenjang(e.target.value)}
          >
            <option value="">Semua</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="pkk">PKK</label>
          <select
            id="pkk"
            value={pkk}
            onChange={(e) => setPkk(e.target.value)}
          >
            <option value="">Semua PKK</option>
            <option value="PKK1">PKK 1</option>
            <option value="PKK2">PKK 2</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="kecamatan">Semua Kecamatan</label>
          <select
            id="kecamatan"
            value={kecamatan}
            onChange={(e) => setKecamatan(e.target.value)}
          >
            <option value="">Semua Kecamatan</option>
            <option value="Kec1">Kecamatan 1</option>
            <option value="Kec2">Kecamatan 2</option>
          </select>
        </div>
      </section>

      <section className={styles.chartsRow}>
        <BarChart title="Rekapitulasi Anggaran PKAD" data={chart1Data} colors={chart1Colors} />
        <BarChart title="Jumlah Kelas Belum Dianggarkan PKAD" data={chart2Data} colors={chart2Colors} />
      </section>

      <section className={styles.tableSection}>
        <div className={styles.tableWrapper}>
          <div className={styles.tableTitle}>Anggaran PKAD</div>
          <table className={styles.budgetTable}>
            <thead>
              <tr>
                <th>API</th>
                <th>JUMLAH KELAS</th>
                <th>BIAYA PER KELAS</th>
                <th>TOTAL BIAYA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rehab Pondok Pasak Baru</td>
                <td>751</td>
                <td>Rp 7.500.000</td>
                <td>Rp 15.150.000.000</td>
              </tr>
              <tr>
                <td>Rehab Detilok Rumah Kelasny</td>
                <td>1008</td>
                <td>Rp 10.000.000</td>
                <td>Rp 10.080.000.000</td>
              </tr>
              <tr>
                <td>Rehab Gedangan RT01</td>
                <td>1209</td>
                <td>Rp 10.000.000</td>
                <td>Rp 16.090.000.000</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.tableWrapper}>
          <div className={styles.tableTitle}>Rencana Anggaran 5 Tahun PKAD</div>
          <table className={styles.yearlyTable}>
            <thead>
              <tr>
                <th>TAHUN</th>
                <th>RINCIAN ANGGARAN</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>2021</td><td>Rp 17.750.000.000</td></tr>
              <tr><td>2022</td><td>Rp 17.750.000.000</td></tr>
              <tr><td>2023</td><td>Rp 17.750.000.000</td></tr>
              <tr><td>2024</td><td>Rp 17.750.000.000</td></tr>
              <tr><td>2025</td><td>Rp 17.750.000.000</td></tr>
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td>TOTAL 5 TAHUN</td>
                <td>Rp 88.750.000.000</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className={styles.tableWrapper}>
          <div className={styles.tableTitle}>Rencana Anggaran Tahunan (2021-2025)</div>
          <table className={styles.annualPlanTable}>
            <thead>
              <tr>
                <th>TAHUN</th>
                <th>REHABILITASI KELAS BARU</th>
                <th>REHABILITASI KELAS RENOV</th>
                <th>PEMBANGUNAN BARU</th>
              </tr>
            </thead>
            <tbody>
              {/* Dummy data rows */}
              <tr>
                <td>2021</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td>
              </tr>
              <tr>
                <td>2022</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td>
              </tr>
              <tr>
                <td>2023</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td>
              </tr>
              <tr>
                <td>2024</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td>
              </tr>
              <tr>
                <td>2025</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td><td>Rp 7.700.000.000</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td colSpan="3">TOTAL 5 TAHUN</td>
                <td>Rp 38.500.000.000</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}

