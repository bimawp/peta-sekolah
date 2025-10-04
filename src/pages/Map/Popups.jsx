// src/pages/Map/Popups.jsx - VERSI BARU UNTUK KLASTER

import React from 'react';
import styles from './Popups.module.css';

const KecamatanPopup = ({ kecamatanName, total, jenjangCount, activeFilter }) => {
    return (
        <div className={styles.popup}>
            <div className={styles.header}>
                <div className={styles.titleSection}>
                    <h4 className={styles.schoolName}>{kecamatanName}</h4>
                    <p className={styles.schoolType}>
                        Total Sekolah: <strong>{total}</strong>
                        {activeFilter !== 'Semua Kondisi' && ` (Filter: ${activeFilter})`}
                    </p>
                </div>
            </div>
            
            {activeFilter === 'Semua Kondisi' && (
                <div className={styles.section}>
                    <h5 className={styles.sectionTitle}>Rincian per Jenjang</h5>
                    <div className={styles.infoGrid}>
                        {Object.entries(jenjangCount).map(([jenjang, count]) => (
                            count > 0 && (
                                <div className={styles.infoItem} key={jenjang}>
                                    <span className={styles.label}>{jenjang}:</span>
                                    <span className={styles.value}>{count} sekolah</span>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default KecamatanPopup;