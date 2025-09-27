// src/pages/Map/FilterPanel.jsx

import React, { useMemo } from 'react';
import styles from './FilterPanel.module.css';

const FilterPanel = ({ schools, filters, setFilters }) => {
    // Buat daftar unik untuk dropdown dari semua data sekolah
    const { jenjangList, kecamatanList, desaList } = useMemo(() => {
        if (!schools || schools.length === 0) {
            return { jenjangList: [], kecamatanList: [], desaList: [] };
        }
        const jenjangSet = new Set();
        const kecamatanSet = new Set();
        const desaSet = new Set();

        // Filter desa berdasarkan kecamatan yang dipilih
        const filteredSchoolsByKecamatan = schools.filter(school => 
            filters.kecamatan === 'Semua Kecamatan' || school.kecamatan === filters.kecamatan
        );

        for (const school of schools) {
            if (school.jenjang) jenjangSet.add(school.jenjang);
            if (school.kecamatan) kecamatanSet.add(school.kecamatan);
        }
        for (const school of filteredSchoolsByKecamatan) {
            if (school.desa) desaSet.add(school.desa);
        }
        
        return {
            jenjangList: [...jenjangSet].sort(),
            kecamatanList: [...kecamatanSet].sort(),
            desaList: [...desaSet].sort()
        };
    }, [schools, filters.kecamatan]);

    const handleFilterChange = (filterType, value) => {
        const newFilters = { ...filters, [filterType]: value };
        // Jika kecamatan berubah, reset desa
        if (filterType === 'kecamatan') {
            newFilters.desa = 'Semua Desa';
        }
        setFilters(newFilters);
    };
    
    const resetFilters = () => {
        setFilters({
            jenjang: 'Semua Jenjang',
            kecamatan: 'Semua Kecamatan',
            desa: 'Semua Desa',
            kondisi: 'Semua Kondisi' // Jika Anda ingin menambahkan filter kondisi
        });
    };

    return (
        <div className={styles.filterPanel}>
            <div className={styles.header}>
                <h4>Filter Peta</h4>
                <button onClick={resetFilters} className={styles.resetButton}>Reset</button>
            </div>
            <div className={styles.filterGroup}>
                <label>Jenjang</label>
                <select value={filters.jenjang} onChange={(e) => handleFilterChange('jenjang', e.target.value)}>
                    <option value="Semua Jenjang">Semua Jenjang</option>
                    {jenjangList.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>
            <div className={styles.filterGroup}>
                <label>Kecamatan</label>
                <select value={filters.kecamatan} onChange={(e) => handleFilterChange('kecamatan', e.target.value)}>
                    <option value="Semua Kecamatan">Semua Kecamatan</option>
                    {kecamatanList.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>
            <div className={styles.filterGroup}>
                <label>Desa</label>
                <select value={filters.desa} onChange={(e) => handleFilterChange('desa', e.target.value)}>
                    <option value="Semua Desa">Semua Desa</option>
                    {desaList.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>
        </div>
    );
};

export default FilterPanel;