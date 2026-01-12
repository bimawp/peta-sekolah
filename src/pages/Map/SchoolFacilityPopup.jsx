// src/pages/Map/SchoolFacilityPopup.jsx - FILE BARU

import React from 'react';
import styles from './Popups.module.css'; // Kita akan pakai style yang sama

const SchoolFacilityPopup = ({ school }) => {
    if (!school) return <div className={styles.error}>Data sekolah tidak tersedia.</div>;

    const {
        name, npsn, jenjang, address,
        class_condition: cond,
        library,
        laboratory_comp: labComp,
        toilets
    } = school;

    return (
        <div className={styles.popup}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h4 className={styles.schoolName}>{name || 'Nama Tidak Diketahui'}</h4>
                    <p className={styles.schoolType}>NPSN: {npsn || '-'} | Jenjang: {jenjang || '-'}</p>
                </div>
            </div>

            <div className={styles.section}>
                <h5 className={styles.sectionTitle}>Kondisi Ruang Kelas</h5>
                <div className={styles.conditionList}>
                    <div className={styles.conditionItem}>
                        <span className={styles.conditionLabel}>Baik:</span> 
                        <span className={styles.value}>{(cond?.classrooms_good || 0)}</span>
                    </div>
                    <div className={styles.conditionItem}>
                        <span className={styles.conditionLabel}>Rusak Sedang:</span> 
                        <span className={styles.value}>{(cond?.classrooms_moderate_damage || 0)}</span>
                    </div>
                    <div className={styles.conditionItem}>
                        <span className={styles.conditionLabel}>Rusak Berat:</span> 
                        <span className={styles.value}>{(cond?.classrooms_heavy_damage || 0)}</span>
                    </div>
                    <div className={styles.conditionItem}>
                        <span className={styles.conditionLabel}>Kurang RKB:</span> 
                        <span className={styles.value}>{(cond?.lacking_rkb || 0)}</span>
                    </div>
                </div>
            </div>

            <div className={styles.section}>
                <h5 className={styles.sectionTitle}>Fasilitas Lain</h5>
                <div className={styles.infoGrid}>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Perpustakaan:</span>
                        <span className={styles.value}>{library?.total > 0 ? `${library.total} Ruang` : 'Tidak Ada'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Lab Komputer:</span>
                        <span className={styles.value}>{labComp?.total_all > 0 ? `${labComp.total_all} Ruang` : 'Tidak Ada'}</span>
                    </div>
                    <div className={styles.infoItem}>
                        <span className={styles.label}>Total Toilet:</span>
                        <span className={styles.value}>{toilets?.total || (school.totalToilet || 0)}</span>
                    </div>
                </div>
            </div>
            
            <div className={styles.address}>
                {address || 'Alamat tidak tersedia'}
            </div>
        </div>
    );
};

export default SchoolFacilityPopup;