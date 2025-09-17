// src/pages/Map/Popups.jsx
import React from 'react';
import styles from './Map.module.css';
import { Hash, MapPin } from 'lucide-react';
import { FACILITY_COLORS } from '../../config/mapConstants';

// Komponen Popup untuk ringkasan (Memoized untuk performa)
export const SummaryPopup = React.memo(({ title, stats }) => (
    <div className={styles.popupCard}>
        <div className={styles.popupHeader}>
            <h3 className={styles.popupTitle}>{title}</h3>
            {stats.kecamatanName && <p className={styles.popupSubtitle}>Kec. {stats.kecamatanName}</p>}
        </div>
        <div className={styles.popupBody}>
            <div className={styles.summaryTotal}>
                <span>Total Sekolah</span>
                <strong>{stats.total}</strong>
            </div>
            <div className={styles.conditionList}>
                {stats.rusakBerat > 0 && <div className={styles.conditionItem}><span className={styles.conditionCircle} style={{ background: FACILITY_COLORS['Rusak Berat'] }}></span>Rusak Berat: <strong>{stats.rusakBerat}</strong></div>}
                {stats.kekuranganRKB > 0 && <div className={styles.conditionItem}><span className={styles.conditionCircle} style={{ background: FACILITY_COLORS['Kekurangan RKB'] }}></span>Kurang RKB: <strong>{stats.kekuranganRKB}</strong></div>}
                {stats.rusakSedang > 0 && <div className={styles.conditionItem}><span className={styles.conditionCircle} style={{ background: FACILITY_COLORS['Rusak Sedang'] }}></span>Rusak Sedang: <strong>{stats.rusakSedang}</strong></div>}
                {stats.baik > 0 && <div className={styles.conditionItem}><span className={styles.conditionCircle} style={{ background: FACILITY_COLORS['Baik/Rehabilitasi'] }}></span>Baik/Rehab: <strong>{stats.baik}</strong></div>}
            </div>
        </div>
    </div>
));

// Komponen Popup untuk detail sekolah (Memoized untuk performa)
export const SchoolPopup = React.memo(({ school }) => (
    <div className={styles.popupCard}>
        <div className={styles.popupHeader}>
            <h3 className={styles.popupTitle}>{school.nama}</h3>
            <span className={`${styles.jenjangBadge} ${styles[school.jenjang.toLowerCase()]}`}>{school.jenjang}</span>
        </div>
        <div className={styles.popupBody}>
            <div className={styles.infoRow}><Hash size={14} /><span>NPSN: {school.npsn || '-'}</span></div>
            <div className={styles.infoRow}><MapPin size={14} /><span>{school.village}, {school.kecamatan}</span></div>
        </div>
    </div>
));