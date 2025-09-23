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
  onKecamatanChange
}) => {

  const handleFilterChange = (key, value) => {
    if (key === 'kecamatan') {
      onKecamatanChange(value); 
    } else {
      const newFilters = {...filters, [key]: value};
      if (key === 'kecamatan') {
          newFilters.desa = 'Semua Desa';
      }
      setFilters(newFilters);
    }
  };

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterHeader}>
        <h1 className={styles.title}>Peta Sebaran Sekolah</h1>
        {canGoBack && <button onClick={onBack} className={styles.backButton}>&larr; Kembali ke Tampilan Kabupaten</button>}
      </div>
      <div className={styles.filterGrid}>
        <div className={styles.filterGroup}>
          <label htmlFor="jenjang">Jenjang</label>
          <select id="jenjang" value={filters.jenjang} onChange={(e) => handleFilterChange('jenjang', e.target.value)} disabled={loading}>
            <option value="semua">Semua Jenjang</option>
            <option value="paud">PAUD</option>
            <option value="sd">SD</option>
            <option value="smp">SMP</option>
            <option value="pkbm">PKBM</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="kecamatan">Kecamatan</label>
          <select id="kecamatan" value={filters.kecamatan} onChange={(e) => handleFilterChange('kecamatan', e.target.value)} disabled={loading}>
            {kecamatanList.map(kec => <option key={kec} value={kec}>{kec}</option>)}
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="desa">Desa</label>
          <select id="desa" value={filters.desa} onChange={(e) => handleFilterChange('desa', e.target.value)} disabled={loading || filters.kecamatan === 'Semua Kecamatan'}>
            {desaList.map(desa => <option key={desa} value={desa}>{desa}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
});

export default FilterPanel;