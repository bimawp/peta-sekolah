// src/pages/Map/FilterPanel.jsx
import React from 'react';
import styles from './FilterPanel.module.css';

const KONDISI = ['Semua Kondisi', 'Baik', 'Rusak Sedang', 'Rusak Berat', 'Kurang RKB'];

/**
 * Panel Filter (client-side only)
 * - Memakai data & opsi yang sudah dipass dari Map.jsx
 * - Tidak memanggil API baru
 */
export default function FilterPanel({ schools = [], filters, options, setFilter, resetFilters }) {
  const { kecamatan = [], desa = [], jenjang = [] } = options ?? {};

  return (
    <aside className={styles.filterPanel}>
      <div className={styles.header}>
        <h4>Filter Peta</h4>
        <button className={styles.backButton} onClick={resetFilters}>Reset</button>
      </div>

      <div className={styles.filterGroup}>
        <label>Kecamatan</label>
        <select
          value={filters?.kecamatan ?? 'Semua Kecamatan'}
          onChange={(e) => setFilter('kecamatan', e.target.value)}
        >
          <option>Semua Kecamatan</option>
          {kecamatan.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Desa</label>
        <select
          disabled={!filters || filters.kecamatan === 'Semua Kecamatan'}
          value={filters?.desa ?? 'Semua Desa'}
          onChange={(e) => setFilter('desa', e.target.value)}
        >
          <option>Semua Desa</option>
          {desa.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Jenjang</label>
        <select
          value={filters?.jenjang ?? 'Semua Jenjang'}
          onChange={(e) => setFilter('jenjang', e.target.value)}
        >
          <option>Semua Jenjang</option>
          {jenjang.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>Kondisi Ruang Kelas</label>
        <select
          value={filters?.kondisi ?? 'Semua Kondisi'}
          onChange={(e) => setFilter('kondisi', e.target.value)}
        >
          {KONDISI.map(k => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
    </aside>
  );
}
