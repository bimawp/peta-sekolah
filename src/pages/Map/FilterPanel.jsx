import React, { useMemo } from 'react';
import Select from 'react-select';
import { Layers, Map, Home, Building, X, BarChart3 } from 'lucide-react';
import styles from './FilterPanel.module.css';

const StatisticsDisplay = ({ count }) => {
  if (count === 0) return null;
  return (
    <div className={styles.statsDisplay}>
      <BarChart3 size={20} className={styles.statsIcon} />
      <div className={styles.statsText}>
        <span>Menampilkan</span>
        <strong>{count}</strong>
        <span>Sekolah</span>
      </div>
    </div>
  );
};

const FilterPanel = ({ filters, onFilterChange, onReset, regionOptions, schoolCount }) => {
  const jenjangOptions = [
    { value: 'all', label: 'Semua Jenjang' }, { value: 'PAUD', label: 'PAUD' },
    { value: 'SD', label: 'SD' }, { value: 'SMP', label: 'SMP' }, { value: 'PKBM', label: 'PKBM' },
  ];

  const kondisiOptions = [
    { value: 'all', label: 'Semua Kondisi' }, { value: 'Baik', label: 'Baik' },
    { value: 'Rusak Sedang', label: 'Rusak Sedang' }, { value: 'Rusak Berat', label: 'Rusak Berat' },
    { value: 'Kekurangan RKB', label: 'Kurang RKB' },
  ];

  const desaOptions = useMemo(() => {
    const selectedKecamatan = filters.kecamatan;
    if (selectedKecamatan && selectedKecamatan !== 'all' && regionOptions.desaOptions[selectedKecamatan]) {
      return [
        { value: 'all', label: 'Semua Desa' },
        ...regionOptions.desaOptions[selectedKecamatan]
      ];
    }
    return [{ value: 'all', label: 'Pilih kecamatan dulu', isDisabled: true }];
  }, [filters.kecamatan, regionOptions.desaOptions]);

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterGrid}>
        <div className={styles.filterItem}>
          <Layers size={16} className={styles.filterIcon} />
          <Select value={jenjangOptions.find(o => o.value === filters.jenjang)} onChange={s => onFilterChange('jenjang', s.value)} options={jenjangOptions} placeholder="Pilih Jenjang..."/>
        </div>
        <div className={styles.filterItem}>
          <Map size={16} className={styles.filterIcon} />
          <Select value={regionOptions.kecamatanOptions.find(o => o.value === filters.kecamatan)} onChange={s => onFilterChange('kecamatan', s.value)} options={[{ value: 'all', label: 'Semua Kecamatan' }, ...regionOptions.kecamatanOptions]} placeholder="Pilih Kecamatan..."/>
        </div>
        <div className={styles.filterItem}>
          <Home size={16} className={styles.filterIcon} />
          <Select value={desaOptions.find(o => o.value === filters.desa)} onChange={s => onFilterChange('desa', s.value)} options={desaOptions} isDisabled={filters.kecamatan === 'all'} placeholder="Pilih Desa..."/>
        </div>
        <div className={styles.filterItem}>
          <Building size={16} className={styles.filterIcon} />
          <Select value={kondisiOptions.find(o => o.value === filters.facility)} onChange={s => onFilterChange('facility', s.value)} options={kondisiOptions} placeholder="Pilih Kondisi..."/>
        </div>
      </div>
      <div className={styles.controls}>
        <StatisticsDisplay count={schoolCount} />
        <button onClick={onReset} className={styles.resetButton}>
          <X size={16} />
          <span>Reset Filter</span>
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;