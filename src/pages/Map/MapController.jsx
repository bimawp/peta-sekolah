import React, { useEffect, useState } from 'react';
import styles from './MapController.module.css';

const MapController = ({ map, mapMode, filters }) => {
  const [viewMode, setViewMode] = useState('default');
  const [isVisible, setIsVisible] = useState(true);

  // Auto-hide controller after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [filters, mapMode]);

  // Show controller on mouse movement
  useEffect(() => {
    const showController = () => setIsVisible(true);
    
    if (map) {
      const mapContainer = map.getContainer();
      mapContainer.addEventListener('mousemove', showController);
      
      return () => {
        mapContainer.removeEventListener('mousemove', showController);
      };
    }
  }, [map]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    
    if (map) {
      switch (mode) {
        case 'satellite':
          // Switch to satellite view (you'll need to implement this)
          break;
        case 'terrain':
          // Switch to terrain view
          break;
        default:
          // Default map view
          break;
      }
    }
  };

  const zoomToGarut = () => {
    if (map) {
      map.setView([-7.2186, 107.8934], 10);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const getCurrentModeDescription = () => {
    if (mapMode === 'kecamatan') {
      if (filters.kondisi !== 'semua') {
        return `Tampilan kecamatan - Filter kondisi: ${filters.kondisi.replace('_', ' ')}`;
      }
      return 'Tampilan ringkasan per kecamatan';
    } else {
      const activeFilters = [];
      if (filters.jenjang !== 'semua') activeFilters.push(`Jenjang: ${filters.jenjang.toUpperCase()}`);
      if (filters.kecamatan !== 'semua') activeFilters.push(`Kecamatan: ${filters.kecamatan}`);
      if (filters.desa !== 'semua') activeFilters.push(`Desa: ${filters.desa}`);
      if (filters.kondisi !== 'semua') activeFilters.push(`Kondisi: ${filters.kondisi.replace('_', ' ')}`);
      
      return `Tampilan detail sekolah${activeFilters.length > 0 ? ' - ' + activeFilters.join(', ') : ''}`;
    }
  };

  if (!isVisible) {
    return (
      <div className={styles.hiddenController}>
        <button 
          className={styles.showButton}
          onClick={() => setIsVisible(true)}
          title="Tampilkan kontrol peta"
        >
          ⚙️
        </button>
      </div>
    );
  }

  return (
    <div className={styles.controller}>
      {/* Mode Description */}
      <div className={styles.modeDescription}>
        <div className={styles.modeIcon}>
          {mapMode === 'kecamatan' ? '🏘️' : '🏫'}
        </div>
        <div className={styles.modeText}>
          <div className={styles.modeTitle}>
            {mapMode === 'kecamatan' ? 'Mode Kecamatan' : 'Mode Detail Sekolah'}
          </div>
          <div className={styles.modeSubtitle}>
            {getCurrentModeDescription()}
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className={styles.controlSection}>
        <h4>🗺️ Tampilan Peta</h4>
        <div className={styles.buttonGroup}>
          <button 
            className={`${styles.controlButton} ${viewMode === 'default' ? styles.active : ''}`}
            onClick={() => handleViewModeChange('default')}
            title="Peta standar"
          >
            📍 Standar
          </button>
          <button 
            className={`${styles.controlButton} ${viewMode === 'satellite' ? styles.active : ''}`}
            onClick={() => handleViewModeChange('satellite')}
            title="Tampilan satelit"
          >
            🛰️ Satelit
          </button>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className={styles.controlSection}>
        <h4>🧭 Navigasi</h4>
        <div className={styles.buttonGroup}>
          <button 
            className={styles.controlButton}
            onClick={zoomToGarut}
            title="Kembali ke tampilan Garut"
          >
            🏠 Reset Zoom
          </button>
          <button 
            className={styles.controlButton}
            onClick={toggleFullscreen}
            title="Mode layar penuh"
          >
            📺 Layar Penuh
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className={styles.controlSection}>
        <h4>🏷️ Legenda</h4>
        <div className={styles.legend}>
          {mapMode === 'sekolah' && (
            <div className={styles.legendGroup}>
              <div className={styles.legendTitle}>Jenis Sekolah</div>
              <div className={styles.legendItems}>
                <div className={styles.legendItem}>
                  <span className={styles.legendIcon}>🧸</span>
                  <span>PAUD</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendIcon}>🎒</span>
                  <span>SD</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendIcon}>📚</span>
                  <span>SMP</span>
                </div>
                <div className={styles.legendItem}>
                  <span className={styles.legendIcon}>🎓</span>
                  <span>PKBM</span>
                </div>
              </div>
            </div>
          )}
          
          <div className={styles.legendGroup}>
            <div className={styles.legendTitle}>Kondisi Bangunan</div>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.goodColor}`}></div>
                <span>Baik</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.warningColor}`}></div>
                <span>Rusak Sedang</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.dangerColor}`}></div>
                <span>Rusak Berat</span>
              </div>
              <div className={styles.legendItem}>
                <div className={`${styles.legendColor} ${styles.infoColor}`}></div>
                <span>Kurang RKB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className={styles.controlSection}>
        <h4>💡 Petunjuk</h4>
        <div className={styles.instructions}>
          {mapMode === 'kecamatan' ? (
            <ul>
              <li>Klik wilayah kecamatan untuk melihat statistik</li>
              <li>Pilih kecamatan/desa di filter untuk detail sekolah</li>
              <li>Gunakan filter kondisi untuk melihat sebaran masalah</li>
            </ul>
          ) : (
            <ul>
              <li>Klik ikon sekolah untuk detail lengkap</li>
              <li>Hover untuk informasi cepat</li>
              <li>Gunakan filter untuk menyaring data</li>
            </ul>
          )}
        </div>
      </div>

      {/* Hide Button */}
      <div className={styles.controlSection}>
        <button 
          className={styles.hideButton}
          onClick={() => setIsVisible(false)}
          title="Sembunyikan panel kontrol"
        >
          👁️ Sembunyikan Panel
        </button>
      </div>
    </div>
  );
};

export default MapController;