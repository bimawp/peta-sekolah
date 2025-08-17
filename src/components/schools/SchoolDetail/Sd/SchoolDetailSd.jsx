import React from 'react';
import styles from './SchoolDetailSd.module.css';
import Button from '../../../ui/Button/Button';



const SchoolDetailSd = ({ schoolData, onBack }) => {
  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.header}>
        <h1>SD IT AL-MINHAJ BANJARWANGI</h1>
        <div className={styles.basicInfo}>
          <p><strong>NPSN:</strong> 69910410</p>
          <p><strong>Alamat:</strong> Kp. Cidatar RT 01/02</p>
          <p><strong>Desa:</strong> Tanjungjaya</p>
          <p><strong>Kecamatan:</strong> Banjarwangi</p>
          <p><strong>Jumlah Siswa:</strong> 168</p>
          <button className={styles.mapButton}>
            Lihat Lokasi SD IT AL-MINHAJ BANJARWANGI di Google Maps (Banjarwangi)
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
              <div className={styles.bar} style={{height: '0%'}}>0</div>
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

      {/* Data Fisik Bangunan Sekolah */}
      <div className={styles.section}>
        <h2>Data Fisik Bangunan Sekolah</h2>
        <p>Luas Tanah: 6700</p>
        <p>Luas Bangunan: 720</p>
        <p>Luas Halaman: 3500</p>
      </div>

      {/* Data Kelas */}
      <div className={styles.section}>
        <h2>Data Kelas</h2>
        <div className={styles.gradeGrid}>
          <div className={styles.gradeItem}>
            <p>Jumlah kelas 1 laki‑laki: 19</p>
            <p>Jumlah kelas 1 perempuan: 15</p>
          </div>
          <div className={styles.gradeItem}>
            <p>Jumlah kelas 2 laki‑laki: 18</p>
            <p>Jumlah kelas 2 perempuan: 17</p>
          </div>
          <div className={styles.gradeItem}>
            <p>Jumlah kelas 3 laki‑laki: 11</p>
            <p>Jumlah kelas 3 perempuan: 15</p>
          </div>
          <div className={styles.gradeItem}>
            <p>Jumlah kelas 4 laki‑laki: 17</p>
            <p>Jumlah kelas 4 perempuan: 12</p>
          </div>
          <div className={styles.gradeItem}>
            <p>Jumlah kelas 5 laki‑laki: 9</p>
            <p>Jumlah kelas 5 perempuan: 10</p>
          </div>
          <div className={styles.gradeItem}>
            <p>Jumlah kelas 6 laki‑laki: 16</p>
            <p>Jumlah kelas 6 perempuan: 9</p>
          </div>
        </div>
      </div>

      {/* Rombel */}
      <div className={styles.section}>
        <h2>Rombel</h2>
        <p>Jumlah Rombel Kelas 1: 1</p>
        <p>Jumlah Rombel Kelas 2: 1</p>
        <p>Jumlah Rombel Kelas 3: 1</p>
        <p>Jumlah Rombel Kelas 4: 1</p>
        <p>Jumlah Rombel Kelas 5: 1</p>
        <p>Jumlah Rombel Kelas 6: 1</p>
        <p><strong>Jumlah Keseluruhan Rombel: 6</strong></p>
      </div>

      {/* Data Perpustakaan */}
      <div className={styles.section}>
        <h2>Data Perpustakaan</h2>
        <p>Jumlah Ruang Perspustakaan: 1</p>
        <p>Ruang Perspustakaan Baik: 1</p>
        <p>Ruang Perspustakaan Rusak Sedang: 0</p>
        <p>Ruang Perspustakaan Rusak Berat: 0</p>
      </div>

      {/* Data Ruang Guru */}
      <div className={styles.section}>
        <h2>Data Ruang Guru</h2>
        <p>Jumlah Ruang Guru: 1</p>
        <p>Ruang Guru Kondisi Baik: 1</p>
        <p>Ruang Guru Rusak Sedang: 0</p>
        <p>Ruang Guru Rusak Berat: 0</p>
      </div>

      {/* UKS */}
      <div className={styles.section}>
        <h2>UKS</h2>
        <p>Jumlah Ruang UKS: 1</p>
        <p>Ruang UKS Kondisi Baik: 1</p>
        <p>Ruang UKS Rusak Sedang: 0</p>
        <p>Ruang UKS Rusak Berat: 0</p>
      </div>

      {/* Toilet */}
      <div className={styles.section}>
        <h2>Toilet</h2>
        <p>Jumlah Toilet: 3</p>
        <p>Toilet Kondisi Baik: 0</p>
        <p>Toilet Rusak Sedang: 2</p>
        <p>Toilet Rusak Berat: 1</p>
      </div>

      {/* Data Furniture dan Komputer */}
      <div className={styles.section}>
        <h2>Data Furniture dan Komputer</h2>
        <div className={styles.subSection}>
          <h3>Meja</h3>
          <p>Jumlah Meja: 168</p>
          <p>Meja Kondisi Baik: 168</p>
          <p>Meja Rusak Sedang: 0</p>
          <p>Meja Rusak Berat: 0</p>
        </div>
        <div className={styles.subSection}>
          <h3>Kursi</h3>
          <p>Jumlah Kursi: 168</p>
          <p>Kursi Kondisi Baik: 168</p>
          <p>Kursi Rusak Sedang: 0</p>
          <p>Kursi Rusak Berat: 0</p>
        </div>
      </div>

      {/* Data Rumah Dinas */}
      <div className={styles.section}>
        <h2>Data Rumah Dinas</h2>
        <p>Jumlah Rumah Dinas: 0</p>
        <p>Rumah Dinas Kondisi Baik: 0</p>
        <p>Rumah Dinas Rusak Sedang: 0</p>
        <p>Rumah Dinas Rusak Berat: 0</p>
      </div>
                      {/* Tombol Kembali */}
                      <Button onClick={onBack}>Kembali</Button>
    </div>
  );
};

export default SchoolDetailSd;