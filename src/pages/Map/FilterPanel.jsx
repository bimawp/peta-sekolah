// src/pages/Map/FilterPanel.jsx - PERBAIKAN DENGAN PENGAMAN DATA

import React, { useMemo } from 'react';
import styles from './FilterPanel.module.css';

const FilterPanel = ({ schools, geoData, filters, setFilter, resetFilters }) => {
    
    const { jenjangList, kecamatanList, desaList } = useMemo(() => {
        const jenjangSet = new Set();
        // [PERBAIKAN] Pastikan schools adalah array sebelum di-loop
        if (Array.isArray(schools)) {
            schools.forEach(school => {
                if (school.jenjang) jenjangSet.add(school.jenjang);
            });
        }

        // [PERBAIKAN] Ambil daftar kecamatan dari geoData dengan pengecekan
        let allKecamatan = [];
        if (geoData?.kecamatan?.features) {
            allKecamatan = geoData.kecamatan.features
                .map(feature => feature.properties.KECAMATAN)
                .filter(Boolean);
            allKecamatan = [...new Set(allKecamatan)].sort();
        }

        const desaSet = new Set();
        if (Array.isArray(schools)) {
            const filteredByKecamatan = schools.filter(school =>
                filters.kecamatan === 'Semua Kecamatan' || school.kecamatan === filters.kecamatan
            );
            filteredByKecamatan.forEach(school => {
                if (school.desa) desaSet.add(school.desa);
            });
        }

        return {
            jenjangList: [...jenjangSet].sort(),
            kecamatanList: allKecamatan,
            desaList: [...desaSet].sort()
        };
    }, [schools, geoData, filters.kecamatan]);

    return (
        <div className={styles.filterPanel}>
            <div className={styles.header}>
                <h4>Filter Peta</h4>
                <button onClick={resetFilters} className={styles.backButton}>Reset</button>
            </div>
            
            <div className={styles.filterGroup}>
                <label>Jenjang</label>
                <select value={filters.jenjang} onChange={(e) => setFilter('jenjang', e.target.value)}>
                    <option value="Semua Jenjang">Semua Jenjang</option>
                    {jenjangList.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>
            
            <div className={styles.filterGroup}>
                <label>Kecamatan</label>
                <select value={filters.kecamatan} onChange={(e) => setFilter('kecamatan', e.target.value)}>
                    <option value="Semua Kecamatan">Semua Kecamatan</option>
                    {/* List ini sekarang dijamin terisi jika geoData ada */}
                    {kecamatanList.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
            </div>
            
            <div className={styles.filterGroup}>
                <label>Desa</label>
                <select 
                    value={filters.desa} 
                    onChange={(e) => setFilter('desa', e.target.value)} 
                    disabled={filters.kecamatan === 'Semua Kecamatan' || filters.kondisi !== 'Semua Kondisi'}
                >
                    <option value="Semua Desa">Semua Desa</option>
                    {desaList.map(item => <option key={item} value={item}>{item}</option>)}
                </select>
                {filters.kondisi !== 'Semua Kondisi' && <small>Filter desa dinonaktifkan.</small>}
            </div>

            <div className={styles.filterGroup}>
                <label>Kondisi Ruang Kelas</label>
                <select value={filters.kondisi} onChange={(e) => setFilter('kondisi', e.target.value)}>
                    <option value="Semua Kondisi">Semua Kondisi</option>
                    <option value="Baik">Baik</option>
                    <option value="Rusak Sedang">Rusak Sedang</option>
                    <option value="Rusak Berat">Rusak Berat</option>
                    <option value="Kurang RKB">Kurang RKB</option>
                </select>
            </div>
        </div>
    );
};

export default FilterPanel;