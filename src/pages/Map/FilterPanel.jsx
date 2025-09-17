// src/pages/Map/FilterPanel.jsx
import React, { useMemo } from 'react';
import styles from './Map.module.css';
import { Filter } from 'lucide-react';

const FilterPanel = ({ filters, onFilterChange, allSchools }) => {
    
    // Memoize daftar kecamatan unik agar tidak dihitung ulang setiap render
    const uniqueKecamatan = useMemo(() => {
        return [...new Set(allSchools.map(s => s.kecamatan))].sort();
    }, [allSchools]);

    // Memoize daftar desa unik berdasarkan kecamatan yang dipilih
    const uniqueDesa = useMemo(() => {
        if (filters.kecamatan !== 'all') {
            return [...new Set(allSchools.filter(s => s.kecamatan === filters.kecamatan).map(s => s.village))].sort();
        }
        return [];
    }, [allSchools, filters.kecamatan]);

    return (
        <div className={styles.filterCard}>
            <div className={styles.filterHeader}>
                <Filter size={20} />
                <h3>Filter Peta</h3>
            </div>
            <div className={styles.filterContainer}>
                {/* Filter Jenjang */}
                <div className={styles.filterGroup}>
                    <label>Jenjang</label>
                    <select value={filters.jenjang} onChange={e => onFilterChange('jenjang', e.target.value)}>
                        <option value="all">Semua Jenjang</option>
                        <option value="PAUD">PAUD</option>
                        <option value="SD">SD</option>
                        <option value="SMP">SMP</option>
                        <option value="PKBM">PKBM</option>
                    </select>
                </div>

                {/* Filter Kecamatan */}
                <div className={styles.filterGroup}>
                    <label>Kecamatan</label>
                    <select value={filters.kecamatan} onChange={e => onFilterChange('kecamatan', e.target.value)}>
                        <option value="all">Semua Kecamatan</option>
                        {uniqueKecamatan.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>

                {/* Filter Desa */}
                <div className={styles.filterGroup}>
                    <label>Desa</label>
                    <select value={filters.desa} onChange={e => onFilterChange('desa', e.target.value)} disabled={filters.kecamatan === 'all'}>
                        <option value="all">Semua Desa</option>
                        {uniqueDesa.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>

                {/* Filter Kondisi Fasilitas */}
                <div className={styles.filterGroup}>
                    <label>Kondisi Fasilitas</label>
                    <select value={filters.facility} onChange={e => onFilterChange('facility', e.target.value)}>
                        <option value="all">Tampilkan Ringkasan Kecamatan</option>
                        <option value="Baik/Rehabilitasi">Baik / Rehabilitasi</option>
                        <option value="Rusak Sedang">Rusak Sedang</option>
                        <option value="Kekurangan RKB">Kekurangan RKB</option>
                        <option value="Rusak Berat">Rusak Berat</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default FilterPanel;