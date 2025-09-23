// src/pages/Map/Popups.jsx - BUAT FILE BARU INI

import React, { memo } from 'react';
import styles from './Popups.module.css';

const Popups = memo(({ data }) => {
  if (!data || data.type !== 'school' || !data.school) {
    return (
      <div className={styles.popup}>
        <div className={styles.error}>
          ⚠️ Data tidak tersedia
        </div>
      </div>
    );
  }

  const { school } = data;

  // Helper functions
  const getJenjangIcon = (jenjang) => {
    const icons = {
      paud: '🧸',
      sd: '🎒', 
      smp: '📚',
      pkbm: '🎓'
    };
    return icons[jenjang?.toLowerCase()] || '🏫';
  };

  const getJenjangLabel = (jenjang) => {
    const labels = {
      paud: 'PAUD',
      sd: 'Sekolah Dasar',
      smp: 'Sekolah Menengah Pertama', 
      pkbm: 'Pusat Kegiatan Belajar Masyarakat'
    };
    return labels[jenjang?.toLowerCase()] || 'Sekolah';
  };

  const getConditionStatus = (condition) => {
    if (!condition) return null;
    
    const statuses = [];
    if (condition.classrooms_heavy_damage) {
      statuses.push({ label: 'Rusak Berat', color: '#f44336', icon: '🔴' });
    }
    if (condition.classrooms_moderate_damage) {
      statuses.push({ label: 'Rusak Sedang', color: '#ff9800', icon: '🟡' });
    }
    if (condition.lacking_rkb) {
      statuses.push({ label: 'Kurang RKB', color: '#ff5722', icon: '🟠' });
    }
    
    return statuses.length > 0 ? statuses : null;
  };

  const formatCoordinate = (coord) => {
    if (!coord || isNaN(coord)) return 'N/A';
    return parseFloat(coord).toFixed(6);
  };

  const conditionStatuses = getConditionStatus(school.class_condition);

  return (
    <div className={styles.popup}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.icon}>
          {getJenjangIcon(school.jenjang)}
        </div>
        <div className={styles.titleSection}>
          <h3 className={styles.schoolName}>
            {school.nama_sekolah || school.school_name || 'Nama tidak tersedia'}
          </h3>
          <div className={styles.schoolType}>
            {getJenjangLabel(school.jenjang)}
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <div className={styles.section}>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.label}>📍 Kecamatan:</span>
            <span className={styles.value}>{school.kecamatan || 'N/A'}</span>
          </div>
          
          <div className={styles.infoItem}>
            <span className={styles.label}>🏘️ Desa:</span>
            <span className={styles.value}>{school.desa || school.village || 'N/A'}</span>
          </div>

          {school.npsn && (
            <div className={styles.infoItem}>
              <span className={styles.label}>🆔 NPSN:</span>
              <span className={styles.value}>{school.npsn}</span>
            </div>
          )}

          {(school.status_sekolah || school.school_status) && (
            <div className={styles.infoItem}>
              <span className={styles.label}>📋 Status:</span>
              <span className={styles.value}>
                {school.status_sekolah || school.school_status}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Condition Status */}
      {conditionStatuses && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            🏗️ Kondisi Bangunan
          </div>
          <div className={styles.conditionList}>
            {conditionStatuses.map((status, index) => (
              <div 
                key={index}
                className={styles.conditionItem}
                style={{ borderLeft: `4px solid ${status.color}` }}
              >
                <span className={styles.conditionIcon}>{status.icon}</span>
                <span className={styles.conditionLabel}>{status.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Additional Info */}
      {(school.alamat || school.address) && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            📍 Alamat
          </div>
          <div className={styles.address}>
            {school.alamat || school.address}
          </div>
        </div>
      )}

      {/* Coordinates */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          🌐 Koordinat
        </div>
        <div className={styles.coordinates}>
          <div className={styles.coordinate}>
            <span className={styles.coordinateLabel}>Lat:</span>
            <span className={styles.coordinateValue}>
              {formatCoordinate(school.latitude)}
            </span>
          </div>
          <div className={styles.coordinate}>
            <span className={styles.coordinateLabel}>Lng:</span>
            <span className={styles.coordinateValue}>
              {formatCoordinate(school.longitude)}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.jenjangBadge}>
          {getJenjangIcon(school.jenjang)} {school.jenjang?.toUpperCase()}
        </div>
      </div>
    </div>
  );
});

Popups.displayName = 'Popups';

export default Popups;