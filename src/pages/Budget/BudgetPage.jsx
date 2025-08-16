import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import styles from './BudgetPage.module.css';

export default function BudgetPage() {
  const [jenjang, setJenjang] = useState('');
  const [pkk, setPkk] = useState('');
  const [kecamatan, setKecamatan] = useState('');

  // Data for charts using Recharts format
  const chart1Data = [
    { name: 'Rusak Sedang', value: 1088, color: '#f5c542' },
    { name: 'Rusak Berat', value: 204, color: '#fc4c57' },
    { name: 'Kurang RKB', value: 1117, color: '#b8fa59' },
    { name: 'Rehabilitasi Ruang Kelas', value: 29, color: '#3ca6f0' },
    { name: 'Pembangunan RKB', value: 18, color: '#8a8a8a' },
  ];

  const chart2Data = [
    { name: 'Belum Direhab Rusak Berat', value: 175, color: '#fc4c57' },
    { name: 'Belum Dibangun RKB', value: 1099, color: '#f5c542' },
  ];

  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <h1>Anggaran</h1>
        {/* <button className={styles.userBtn}>Admin</button> */}
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
        {/* Chart 1 - Rekapitulasi Anggaran PAUD */}
        <div className={styles.chartContainer}>
          <div className={styles.chartTitle}>Rekapitulasi Anggaran PAUD</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart1Data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-15}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">
                {chart1Data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2 - Jumlah Kelas Belum Ditangani PAUD */}
        <div className={styles.chartContainer}>
          <div className={styles.chartTitle}>Jumlah Kelas Belum Ditangani PAUD</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart2Data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-15}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">
                {chart2Data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className={styles.tableSection}>
        {/* Rencana Anggaran Tahunan (2025-2029) */}
        <div className={styles.tableWrapper}>
          <div className={styles.tableTitle}>Rencana Anggaran Tahunan (2025-2029)</div>
          <table className={styles.budgetTable}>
            <thead>
              <tr>
                <th>TAHUN</th>
                <th>REHABILITASI RUSAK BERAT</th>
                <th>REHABILITASI RUSAK SEDANG</th>
                <th>PEMBANGUNAN RKB</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tahun 2025:</td>
                <td>Rp 2.625.000.000</td>
                <td>Rp 21.760.000.000</td>
                <td>Rp 32.970.000.000</td>
              </tr>
              <tr>
                <td>Tahun 2026:</td>
                <td>Rp 2.625.000.000</td>
                <td>Rp 21.760.000.000</td>
                <td>Rp 32.970.000.000</td>
              </tr>
              <tr>
                <td>Tahun 2027:</td>
                <td>Rp 2.625.000.000</td>
                <td>Rp 21.760.000.000</td>
                <td>Rp 32.970.000.000</td>
              </tr>
              <tr>
                <td>Tahun 2028:</td>
                <td>Rp 2.625.000.000</td>
                <td>Rp 21.760.000.000</td>
                <td>Rp 32.970.000.000</td>
              </tr>
              <tr>
                <td>Tahun 2029:</td>
                <td>Rp 2.625.000.000</td>
                <td>Rp 21.760.000.000</td>
                <td>Rp 32.970.000.000</td>
              </tr>
              <tr className={styles.subtotalRow}>
                <td></td>
                <td><strong>Rp 13.125.000.000</strong></td>
                <td><strong>Rp 108.800.000.000</strong></td>
                <td><strong>Rp 164.850.000.000</strong></td>
              </tr>
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td><strong>TOTAL 5 TAHUN:</strong></td>
                <td colSpan="3"><strong>RP 286.775.000.000</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Rencana Anggaran 5 Tahun PAUD */}
        <div className={styles.tableWrapper}>
          <div className={styles.tableTitle}>Rencana Anggaran 5 Tahun PAUD</div>
          <table className={styles.budgetTable}>
            <thead>
              <tr>
                <th>TAHUN</th>
                <th>RENCANA ANGGARAN</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2025</td>
                <td>Rp 57.355.000.000</td>
              </tr>
              <tr>
                <td>2026</td>
                <td>Rp 57.355.000.000</td>
              </tr>
              <tr>
                <td>2027</td>
                <td>Rp 57.355.000.000</td>
              </tr>
              <tr>
                <td>2028</td>
                <td>Rp 57.355.000.000</td>
              </tr>
              <tr>
                <td>2029</td>
                <td>Rp 57.355.000.000</td>
              </tr>
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td><strong>TOTAL 5 TAHUN</strong></td>
                <td><strong>RP 286.775.000.000</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Anggaran PAUD */}
        <div className={styles.tableWrapper}>
          <div className={styles.tableTitle}>Anggaran PAUD</div>
          <table className={styles.budgetTable}>
            <thead>
              <tr>
                <th>JENIS</th>
                <th>JUMLAH KELAS</th>
                <th>BIAYA PER KELAS</th>
                <th>TOTAL BIAYA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Belum Direhab Rusak Berat</td>
                <td>175</td>
                <td>Rp 75.000.000</td>
                <td>Rp 13.125.000.000</td>
              </tr>
              <tr>
                <td>Belum Direhab Rusak Sedang</td>
                <td>1088</td>
                <td>Rp 100.000.000</td>
                <td>Rp 108.800.000.000</td>
              </tr>
              <tr>
                <td>Belum Dibangun RKB</td>
                <td>1099</td>
                <td>Rp 150.000.000</td>
                <td>Rp 164.850.000.000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}