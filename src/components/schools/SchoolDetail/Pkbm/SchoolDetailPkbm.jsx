import React from 'react';
import styles from './SchoolDetailPkbm.module.css';
import Button from '../../../ui/Button/Button';

const SchoolDetail = ({ schoolData, onBack }) => {
  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{schoolData?.name || 'KB AL ITTIHADIYAH'}</h1>
        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.npsn || ''}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.address || ''}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.village || ''}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.district || ''}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.totalStudents || ''}</span>
          </div>
        </div>
        <button className={styles.locationButton}>
          Lihat Lokasi KB AL ITTIHADIYAH di Google Maps
        </button>
      </div>

      {/* Kondisi Kelas Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Kondisi Kelas</h2>
        <div className={styles.card}>
          <div className={styles.chartContainer}>
            <div className={styles.chart}>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar0}`}>
                  <span className={styles.barLabel}>0</span>
                </div>
                <span className={styles.barText}>Rehabilitasi Ruang Kelas</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar0}`}>
                  <span className={styles.barLabel}>0</span>
                </div>
                <span className={styles.barText}>Rusak Berat</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar0}`}>
                  <span className={styles.barLabel}>0</span>
                </div>
                <span className={styles.barText}>Rusak Sedang</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar3}`}>
                  <span className={styles.barLabel}>3</span>
                </div>
                <span className={styles.barText}>Pembangunan RKB</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar0}`}>
                  <span className={styles.barLabel}>0</span>
                </div>
                <span className={styles.barText}>Kurang RKB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rombel Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Rombel</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>KB: {schoolData?.rombel?.kb || '0'}</span>
          </div>
        </div>
      </div>

      {/* Data Siswa Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Siswa</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Siswa Laki-Laki : {schoolData?.students?.male || '29'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Siswa Perempuan : {schoolData?.students?.female || '22'}</span>
          </div>
        </div>
      </div>

      {/* Status Tanah, Gedung & Bangunan Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Status Tanah, Gedung & Bangunan</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Tanah</h3>
            <div className={styles.dataRow}>
              <span>Hibah: {schoolData?.landStatus?.grant || 'Ya'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Lahan Tersedia: {schoolData?.landStatus?.availableLand || '500'}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Status Gedung</h3>
            <div className={styles.dataRow}>
              <span>Hibah: {schoolData?.buildingStatus?.grant || 'Ya'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Guru Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Guru: {schoolData?.teachers?.total || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Guru: {schoolData?.teachers?.shortage || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Tenaga Kependidikan: {schoolData?.teachers?.staff || '0'}</span>
          </div>
        </div>
      </div>

      {/* Data Furniture dan Komputer Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Furniture dan Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Meja: {schoolData?.furniture?.tables || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Kursi: {schoolData?.furniture?.chairs || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Meja: {schoolData?.furniture?.tableShortage || '50'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kekurangan Kursi: {schoolData?.furniture?.chairShortage || '50'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Papan Tulis: {schoolData?.furniture?.whiteboards || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Komputer: {schoolData?.computers?.total || '0'}</span>
          </div>
        </div>
      </div>

      {/* Toilet Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Toilet Tersedia: {schoolData?.toilet?.available || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Toilet Kekurangan: {schoolData?.toilet?.shortage || '2'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Toilet Baik: {schoolData?.toilet?.goodCondition || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Toilet Rusak Sedang: {schoolData?.toilet?.mediumDamage || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi Toilet Rusak Berat: {schoolData?.toilet?.heavyDamage || '0'}</span>
          </div>
        </div>
      </div>

      {/* Data RGKS Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data RGKS</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>RGKS: {schoolData?.rgks?.available || 'Tidak Ada'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi RGKS Baik: {schoolData?.rgks?.goodCondition || '-'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi RGKS Rusak Sedang: {schoolData?.rgks?.mediumDamage || '-'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kondisi RGKS Rusak Berat: {schoolData?.rgks?.heavyDamage || '-'}</span>
          </div>
        </div>
      </div>

      {/* Area Bermain Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Area Bermain</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Lahan Bermain: {schoolData?.playArea?.field || '-'}</span>
          </div>
        </div>
      </div>

      {/* UKS Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>UKS</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Fasilitas UKS: {schoolData?.uks?.facility || 'Tidak Ada'}</span>
          </div>
        </div>
      </div>

      {/* Alat Permainan Edukatif Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Alat Permainan Edukatif</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>APE Luar</h3>
            <div className={styles.dataRow}>
              <span>APE Luar: {schoolData?.ape?.outdoor?.available || 'Tidak Ada'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kondisi APE Luar: {schoolData?.ape?.outdoor?.condition || '-'}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>APE Dalam</h3>
            <div className={styles.dataRow}>
              <span>APE Dalam: {schoolData?.ape?.indoor?.available || 'Tidak Ada'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Kondisi APE Dalam: {schoolData?.ape?.indoor?.condition || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tombol Kembali */}
      <div className={styles.backButtonContainer}>
        <Button onClick={onBack}>Kembali</Button>
      </div>
    </div>
  );
};

export default SchoolDetail;
