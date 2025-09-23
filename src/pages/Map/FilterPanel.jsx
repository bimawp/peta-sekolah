// src/pages/Map/FilterPanel.jsx

import React, { memo } from 'react';
import styles from './FilterPanel.module.css';

const FilterPanel = memo(({
  filters,
  setFilters,
  kecamatanList,
  desaList,
  onBack,
  canGoBack,
  loading,
}) => {
  const handleFilterChange = (key, value) => {
    if (loading) return;
    const newFilters = { ...filters, [key]: value };
    if (key === 'kecamatan') {
      newFilters.desa = 'semua'; // Reset desa saat kecamatan berubah
    }
    setFilters(newFilters);
  };

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterHeader}>
        {canGoBack && <button onClick={onBack} className={styles.backButton}>&larr; Kembali ke Peta Kecamatan</button>}
        <h1 className={styles.title}>Peta Sebaran Sekolah</h1>
      </div>
      <div className={styles.filterGrid}>
        <div className={styles.filterGroup}>
          <label htmlFor="jenjang">Jenjang</label>
          <select id="jenjang" value={filters.jenjang} onChange={(e) => handleFilterChange('jenjang', e.target.value)}>
            <option value="semua">Semua</option>
            <option value="paud">PAUD</option>
            <option value="sd">SD</option>
            <option value="smp">SMP</option>
            <option value="pkbm">PKBM</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="kecamatan">Kecamatan</label>
          <select id="kecamatan" value={filters.kecamatan} onChange={(e) => handleFilterChange('kecamatan', e.target.value)}>
            {kecamatanList.map(kec => <option key={kec} value={kec}>{kec}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="desa">Desa</label>
          <select id="desa" value={filters.desa} onChange={(e) => handleFilterChange('desa', e.target.value)} disabled={filters.kecamatan === 'semua'}>
            {desaList.map(desa => <option key={desa} value={desa}>{desa}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
});

export default FilterPanel;