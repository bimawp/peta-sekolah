// src/pages/Map/FilterPanel.jsx
import React, { useMemo } from 'react';
import Select from 'react-select';
import { Layers, Map, Home, Building, X, BarChart3 } from 'lucide-react';
import styles from './FilterPanel.module.css';

const customSelectStyles = {
  control: (provided, state) => ({
    ...provided, backgroundColor: '#ffffff', minHeight: '42px',
    borderColor: state.isFocused ? '#4f46e5' : '#d1d5db',
    borderRadius: '8px', boxShadow: state.isFocused ? '0 0 0 1px #4f46e5' : 'none',
    '&:hover': { borderColor: '#a5b4fc' },
  }),
  option: (provided, state) => ({
    ...provided, backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#e0e7ff' : '#ffffff',
    color: state.isSelected ? 'white' : '#111827', fontSize: '0.875rem', cursor: 'pointer',
  }),
  menu: (provided) => ({ ...provided, zIndex: 5, borderRadius: '8px'}),
};

const StatisticsDisplay = ({ schools }) => {
  const total = useMemo(() => schools?.length || 0, [schools]);
  if (total === 0) return null;
  return (
    <div className={styles.statsDisplay}>
      <BarChart3 size={20} className={styles.statsIcon} />
      <div className={styles.statsText}>
        <span>Menampilkan</span>
        <strong>{total}</strong>
        <span>Sekolah</span>
      </div>
    </div>
  );
};

const FilterPanel = ({ filters, onFilterChange, onReset, options, schools }) => {
  const jenjangOptions = useMemo(() => [
    { value: 'all', label: 'Semua Jenjang' }, { value: 'PAUD', label: 'PAUD' },
    { value: 'SD', label: 'SD' }, { value: 'SMP', label: 'SMP' }, { value: 'PKBM', label: 'PKBM' },
  ], []);

  const kecamatanOptions = useMemo(() => [
    { value: 'all', label: 'Semua Kecamatan' },
    ...(options.kecamatan || []).map(kec => ({ value: kec, label: kec }))
  ], [options.kecamatan]);

  const desaOptions = useMemo(() => {
    const selectedKecamatan = filters.kecamatan;
    if (selectedKecamatan && selectedKecamatan !== 'all' && options.desa[selectedKecamatan]) {
      return [
        { value: 'all', label: 'Semua Desa' },
        ...options.desa[selectedKecamatan].map(desa => ({ value: desa, label: desa }))
      ];
    }
    return [{ value: 'all', label: 'Pilih kecamatan dulu', isDisabled: true }];
  }, [filters.kecamatan, options.desa]);

  const kondisiOptions = useMemo(() => [
    { value: 'all', label: 'Semua Kondisi' }, { value: 'Baik/Rehabilitasi', label: 'Baik' },
    { value: 'Rusak Sedang', label: 'Rusak Sedang' }, { value: 'Rusak Berat', label: 'Rusak Berat' },
    { value: 'Kekurangan RKB', label: 'Kurang RKB' },
  ], []);

  return (
    <div className={styles.filterPanel}>
      <div className={styles.filterGrid}>
        <div className={styles.filterItem}>
          <Layers size={16} className={styles.filterIcon} />
          <Select value={jenjangOptions.find(o => o.value === filters.jenjang)} onChange={s => onFilterChange('jenjang', s.value)} options={jenjangOptions} styles={customSelectStyles} classNamePrefix="react-select" />
        </div>
        <div className={styles.filterItem}>
          <Map size={16} className={styles.filterIcon} />
          <Select value={kecamatanOptions.find(o => o.value === filters.kecamatan)} onChange={s => onFilterChange('kecamatan', s.value)} options={kecamatanOptions} styles={customSelectStyles} isSearchable classNamePrefix="react-select"/>
        </div>
        <div className={styles.filterItem}>
          <Home size={16} className={styles.filterIcon} />
          <Select value={desaOptions.find(o => o.value === filters.desa)} onChange={s => onFilterChange('desa', s.value)} options={desaOptions} styles={customSelectStyles} isDisabled={filters.kecamatan === 'all'} isSearchable classNamePrefix="react-select"/>
        </div>
        <div className={styles.filterItem}>
          <Building size={16} className={styles.filterIcon} />
          <Select value={kondisiOptions.find(o => o.value === filters.facility)} onChange={s => onFilterChange('facility', s.value)} options={kondisiOptions} styles={customSelectStyles} classNamePrefix="react-select"/>
        </div>
      </div>
      <div className={styles.controls}>
        <StatisticsDisplay schools={schools} />
        <button onClick={onReset} className={styles.resetButton}>
          <X size={16} />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};

export default FilterPanel;