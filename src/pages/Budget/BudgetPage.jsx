import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import styles from './BudgetPage.module.css';

export default function BudgetPage() {
  const [jenjang, setJenjang] = useState('');
  const [kecamatan, setKecamatan] = useState('');

  // Data untuk charts dikosongkan agar bisa diisi sistem lain
  const chart1Data = [
    { name: 'Rusak Sedang', value: 0, color: '#f5c542' },
    { name: 'Rusak Berat', value: 0, color: '#fc4c57' },
    { name: 'Kurang RKB', value: 0, color: '#b8fa59' },
    { name: 'Rehabilitasi Ruang Kelas', value: 0, color: '#3ca6f0' },
    { name: 'Pembangunan RKB', value: 0, color: '#8a8a8a' },
  ];

  const chart2Data = [
    { name: 'Belum Direhab Rusak Berat', value: 0, color: '#fc4c57' },
    { name: 'Belum Dibangun RKB', value: 0, color: '#f5c542' },
  ];

  return (
    <div className={styles.pageWrapper}>
      <div style={{
        background: 'white',
        padding: '16px 24px',
        borderRadius: 8,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        marginBottom: 24
      }}>
        <h1>Anggaran</h1>
      </div>

      <section className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="jenjang">Pilih Jenjang</label>
          <select
            id="jenjang"
            value={jenjang}
            onChange={(e) => setJenjang(e.target.value)}
          >
            <option value="">Semua</option>
            <option value="PAUD">PAUD</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
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
            <option value="Banjarwangi">Banjarwangi</option>
            <option value="Banyuresmi">Banyuresmi</option>
            <option value="Bayongbong">Bayongbong</option>
            <option value="Balubur Limbangan">Balubur Limbangan</option>
            <option value="Bungbulang">Bungbulang</option>
            <option value="Caringin">Caringin</option>
            <option value="Cibalong">Cibalong</option>
            <option value="Cibatu">Cibatu</option>
            <option value="Cibiuk">Cibiuk</option>
            <option value="Cigedug">Cigedug</option>
            <option value="Cihurip">Cihurip</option>
            <option value="Cikajang">Cikajang</option>
            <option value="Cikelet">Cikelet</option>
            <option value="Cilawu">Cilawu</option>
            <option value="Cisewu">Cisewu</option>
            <option value="Cisompet">Cisompet</option>
            <option value="Cisurupan">Cisurupan</option>
            <option value="Garut Kota">Garut Kota</option>
            <option value="Kadungora">Kadungora</option>
            <option value="Karangpawitan">Karangpawitan</option>
            <option value="Karangtengah">Karangtengah</option>
            <option value="Kersamanah">Kersamanah</option>
            <option value="Leles">Leles</option>
            <option value="Leuwigoong">Leuwigoong</option>
            <option value="Malangbong">Malangbong</option>
            <option value="Mekarmukti">Mekarmukti</option>
            <option value="Mekarwangi">Mekarwangi</option>
            <option value="Pamulihan">Pamulihan</option>
            <option value="Pakenjeng">Pakenjeng</option>
            <option value="Selaawi">Selaawi</option>
            <option value="Sukawening">Sukawening</option>
            <option value="Sukaresmi">Sukaresmi</option>
            <option value="Sukawangi">Sukawangi</option>
            <option value="Sukapura">Sukapura</option>
            <option value="Sukamukti">Sukamukti</option>
            <option value="Tarogong Kidul">Tarogong Kidul</option>
            <option value="Tarogong Kaler">Tarogong Kaler</option>
            <option value="Wanaraja">Wanaraja</option>
          </select>
        </div>
      </section>

      <section className={styles.chartsRow}>
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
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Belum Direhab Rusak Sedang</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Belum Dibangun RKB</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

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
                <td></td>
              </tr>
              <tr>
                <td>2026</td>
                <td></td>
              </tr>
              <tr>
                <td>2027</td>
                <td></td>
              </tr>
              <tr>
                <td>2028</td>
                <td></td>
              </tr>
              <tr>
                <td>2029</td>
                <td></td>
              </tr>
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td><strong>TOTAL 5 TAHUN</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

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
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Tahun 2026:</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Tahun 2027:</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Tahun 2028:</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr>
                <td>Tahun 2029:</td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
              <tr className={styles.subtotalRow}>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td><strong>TOTAL 5 TAHUN:</strong></td>
                <td colSpan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
