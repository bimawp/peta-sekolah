import React from 'react';
import styles from './SchoolDetailPaud.module.css';
import Button from '../../../ui/Button/Button';


const SchoolDetailPaud = ({ onBack }) => {
  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1>AL-ALIFA</h1>
        <div className={styles.basicInfo}>
          <p><strong>NPSN:</strong> 69826911</p>
          <p><strong>Alamat:</strong> KP. CI SIIH</p>
          <p><strong>Desa:</strong> Kadongdong</p>
          <p><strong>Kecamatan:</strong> Banjarwangi</p>
          <p><strong>Jumlah Siswa:</strong> 23</p>
          <button className={styles.mapButton}>
            Lihat Lokasi AL-ALIFA di Google Maps
          </button>
        </div>
      </div>

      {/* Kondisi Kelas */}
      <div className={styles.section}>
        <h2>Kondisi Kelas</h2>
        <div className={styles.chartContainer}>
          <div className={styles.chart}>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{height: '0%'}}>0</div>
              <span>Rehabilitasi Ruang Kelas</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{height: '100%', backgroundColor: '#FF4444'}}>1</div>
              <span>Rusak Berat</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{height: '0%'}}>0</div>
              <span>Rusak Sedang</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{height: '0%'}}>0</div>
              <span>Pembangunan RKB</span>
            </div>
            <div className={styles.chartBar}>
              <div className={styles.bar} style={{height: '100%', backgroundColor: '#FFFF00'}}>1</div>
              <span>Kurang RKB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Tanah, Gedung & Bangunan */}
      <div className={styles.section}>
        <h2>Status Tanah, Gedung & Bangunan</h2>
        <div className={styles.subSection}>
          <h3>Status Tanah</h3>
          <p>Hibah: Ya</p>
          <p>Lahan Tersedia: 994</p>
        </div>
        <div className={styles.subSection}>
          <h3>Status Gedung</h3>
          <p>Menumpang: Ya</p>
        </div>
      </div>

      {/* Data Siswa */}
      <div className={styles.section}>
        <h2>Data Siswa</h2>
        <p>Jumlah Siswa Laki-Laki: 11</p>
        <p>Jumlah Siswa Perempuan: 12</p>
      </div>

      {/* Rombel */}
      <div className={styles.section}>
        <h2>Rombel</h2>
        <p>KB: 2</p>
      </div>

      {/* Data Furniture dan Komputer */}
      <div className={styles.section}>
        <h2>Data Furniture dan Komputer</h2>
        <p>Jumlah Meja: 3</p>
        <p>Jumlah Kursi: 0</p>
        <p>Kekurangan Meja: 6</p>
        <p>Kekurangan Kursi: 24</p>
        <p>Jumlah Papan Tulis: 0</p>
        <p>Jumlah Komputer: 0</p>
      </div>

      {/* Data Guru */}
      <div className={styles.section}>
        <h2>Data Guru</h2>
        <p>Jumlah Guru: 0</p>
        <p>Kekurangan Guru: 0</p>
        <p>Tenaga Kependidikan: 0</p>
      </div>

      {/* Data RGKS */}
      <div className={styles.section}>
        <h2>Data RGKS</h2>
        <p>RGKS: Tidak Ada</p>
        <p>Kondisi RGKS Baik: -</p>
        <p>Kondisi RGKS Rusak Sedang: -</p>
        <p>Kondisi RGKS Rusak Berat: -</p>
      </div>

      {/* Toilet */}
      <div className={styles.section}>
        <h2>Toilet</h2>
        <p>Toilet Tersedia: 0</p>
        <p>Toilet Kekurangan: 0</p>
        <p>Kondisi Toilet Baik: 0</p>
        <p>Kondisi Toilet Rusak Sedang: 0</p>
        <p>Kondisi Toilet Rusak Berat: 0</p>
      </div>

      {/* Alat Permainan Edukatif */}
      <div className={styles.section}>
        <h2>Alat Permainan Edukatif</h2>
        <div className={styles.subSection}>
          <h3>APE Luar</h3>
          <p>APE Luar: Ada</p>
          <p>Kondisi APE Luar: Rusak</p>
        </div>
        <div className={styles.subSection}>
          <h3>APE Dalam</h3>
          <p>APE Dalam: Ada</p>
          <p>Kondisi APE Dalam: Baik</p>
        </div>
      </div>

      {/* UKS */}
      <div className={styles.section}>
        <h2>UKS</h2>
        <p>Fasilitas UKS: Tidak Ada</p>
      </div>

      {/* Area Bermain */}
      <div className={styles.section}>
        <h2>Area Bermain</h2>
        <p>Lahan Bermain: -</p>
      </div>

      {/* Tombol Kembali */}
      <Button onClick={onBack}>Kembali</Button>
    </div>
  );
};

export default SchoolDetailPaud;
