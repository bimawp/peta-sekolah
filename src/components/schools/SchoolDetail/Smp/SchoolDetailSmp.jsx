// src/components/schools/SchoolDetail/Smp/SchoolDetailSmp.jsx (KODE LENGKAP YANG SUDAH DIPERBAIKI)
import React from 'react';
import styles from './SchoolDetailSmp.module.css';
import Button from '../../../ui/Button/Button';

const SchoolDetailSmp = ({ schoolData, onBack }) => {
  // Fungsi untuk membuka Google Maps di tab baru
  const handleLocationClick = () => {
    if (schoolData?.coordinates && schoolData.coordinates.length === 2) {
      const lat = schoolData.coordinates[0];
      const lng = schoolData.coordinates[1];
      // Menggunakan URL yang lebih standar dan aman
      const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      alert('Koordinat lokasi untuk sekolah ini tidak tersedia.');
    }
  };

  // Fungsi bantuan untuk mengambil data secara aman, mengembalikan 0 jika tidak ada
  const getData = (path, defaultValue = 0) => {
    // Fungsi ini bisa mengambil data bertingkat (nested) maupun data level atas
    return path.reduce((obj, key) => (obj && obj[key] != null) ? obj[key] : defaultValue, schoolData);
  };

  // Pengecekan jika data tidak ada, untuk mencegah error
  if (!schoolData) {
    return (
      <div className={styles.container}>
        <button onClick={onBack} className={styles.backButton}>
          ← Kembali
        </button>
        <p>Data sekolah tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Tombol Kembali */}
      <button onClick={onBack} className={styles.backButton}>
        ← Kembali ke Daftar Sekolah
      </button>

      {/* Bagian Header */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{schoolData?.name || 'Nama Sekolah Tidak Tersedia'}</h1>
        <div className={styles.schoolInfo}>
          {/* ... (bagian info sekolah tetap sama) ... */}
          <div className={styles.infoRow}><span className={styles.label}>NPSN</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData?.npsn || '-'}</span></div>
          <div className={styles.infoRow}><span className={styles.label}>Alamat</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData?.address || '-'}</span></div>
          <div className={styles.infoRow}><span className={styles.label}>Desa</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData?.village || '-'}</span></div>
          <div className={styles.infoRow}><span className={styles.label}>Kecamatan</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData?.kecamatan || '-'}</span></div>
          <div className={styles.infoRow}><span className={styles.label}>Jumlah Siswa</span><span className={styles.colon}>:</span><span className={styles.value}>{schoolData?.student_count || '0'}</span></div>
        </div>
        <button onClick={handleLocationClick} className={styles.locationButton}>
          Lihat Lokasi {schoolData?.name || ''} di Google Maps ({schoolData?.kecamatan || ''})
        </button>
      </div>

      {/* Kondisi Kelas Section (DIPERBARUI DENGAN GRAFIK LENGKAP) */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Kondisi & Intervensi Ruang Kelas</h2>
        <div className={styles.card}>
          <div className={styles.chartContainer}>
            <div className={styles.chart}>
                <div className={styles.barContainer}>
                    <div className={`${styles.bar} ${styles.barGreen}`}>
                        <span className={styles.barLabel}>{getData(['class_condition', 'classrooms_good'])}</span>
                    </div>
                    <span className={styles.barText}>Baik</span>
                </div>
                <div className={styles.barContainer}>
                    <div className={`${styles.bar} ${styles.barYellow}`}>
                        <span className={styles.barLabel}>{getData(['class_condition', 'classrooms_moderate_damage'])}</span>
                    </div>
                    <span className={styles.barText}>Rusak Sedang</span>
                </div>
                <div className={styles.barContainer}>
                    <div className={`${styles.bar} ${styles.barRed}`}>
                        <span className={styles.barLabel}>{getData(['class_condition', 'classrooms_heavy_damage'])}</span>
                    </div>
                    <span className={styles.barText}>Rusak Berat</span>
                </div>
                <div className={styles.barContainer}>
                    <div className={`${styles.bar} ${styles.barBlue}`}>
                        <span className={styles.barLabel}>{getData(['class_condition', 'lacking_rkb'])}</span>
                    </div>
                    <span className={styles.barText}>Kurang RKB</span>
                </div>
                {/* === BARU: Rehabilitasi Ruang Kelas === */}
                <div className={styles.barContainer}>
                    <div className={`${styles.bar} ${styles.barPurple}`}>
                        <span className={styles.barLabel}>{getData(['rehabRuangKelas'])}</span>
                    </div>
                    <span className={styles.barText}>Rehabilitasi</span>
                </div>
                {/* === BARU: Pembangunan RKB === */}
                <div className={styles.barContainer}>
                    <div className={`${styles.bar} ${styles.barOrange}`}>
                        <span className={styles.barLabel}>{getData(['pembangunanRKB'])}</span>
                    </div>
                    <span className={styles.barText}>Pembangunan RKB</span>
                </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sisa komponen tetap sama, menggunakan fungsi getData */}
        <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Perpustakaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}><span>Ruang Perpustakaan Kondisi Baik: {getData(['library', 'good'])}</span></div>
          <div className={styles.dataRow}><span>Ruang Perpustakaan Rusak Sedang: {getData(['library', 'moderate_damage'])}</span></div>
          <div className={styles.dataRow}><span>Ruang Perpustakaan Rusak Berat: {getData(['library', 'heavy_damage'])}</span></div>
          <div className={styles.dataRow}><span>Total Ruang Perpustakaan Rusak: {getData(['library', 'total_mh'])}</span></div>
          <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Perpustakaan: {getData(['library', 'total_all'])}</span></div>
        </div>
      </div>

      {/* Lab. Komputer Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Komputer</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Ruang Lab. Komputer Kondisi Baik: {getData(['laboratory_comp', 'good'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. Komputer Rusak Sedang: {getData(['laboratory_comp', 'moderate_damage'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. Komputer Rusak Berat: {getData(['laboratory_comp', 'heavy_damage'])}</span></div>
            <div className={styles.dataRow}><span>Total Ruang Lab. Komputer Rusak: {getData(['laboratory_comp', 'total_mh'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. Komputer: {getData(['laboratory_comp', 'total_all'])}</span></div>
        </div>
      </div>

      {/* Lab. Bahasa Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Bahasa</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Ruang Lab. Bahasa Kondisi Baik: {getData(['laboratory_langua', 'good'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. Bahasa Rusak Sedang: {getData(['laboratory_langua', 'moderate_damage'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. Bahasa Rusak Berat: {getData(['laboratory_langua', 'heavy_damage'])}</span></div>
            <div className={styles.dataRow}><span>Total Ruang Lab. Bahasa Rusak: {getData(['laboratory_langua', 'total_mh'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. Bahasa: {getData(['laboratory_langua', 'total_all'])}</span></div>
        </div>
      </div>

      {/* Lab. IPA Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. IPA</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Ruang Lab. IPA Kondisi Baik: {getData(['laboratory_ipa', 'good'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. IPA Rusak Sedang: {getData(['laboratory_ipa', 'moderate_damage'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. IPA Rusak Berat: {getData(['laboratory_ipa', 'heavy_damage'])}</span></div>
            <div className={styles.dataRow}><span>Total Ruang Lab. IPA Rusak: {getData(['laboratory_ipa', 'total_mh'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. IPA: {getData(['laboratory_ipa', 'total_all'])}</span></div>
        </div>
      </div>

      {/* Lab. Fisika Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Fisika</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Ruang Lab. Fisika Kondisi Baik: {getData(['laboratory_fisika', 'good'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. Fisika Rusak Sedang: {getData(['laboratory_fisika', 'moderate_damage'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. Fisika Rusak Berat: {getData(['laboratory_fisika', 'heavy_damage'])}</span></div>
            <div className={styles.dataRow}><span>Total Ruang Lab. Fisika Rusak: {getData(['laboratory_fisika', 'total_mh'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. Fisika: {getData(['laboratory_fisika', 'total_all'])}</span></div>
        </div>
      </div>

      {/* Lab. Biologi Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Biologi</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Ruang Lab. Biologi Kondisi Baik: {getData(['laboratory_biologi', 'good'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. Biologi Rusak Sedang: {getData(['laboratory_biologi', 'moderate_damage'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Lab. Biologi Rusak Berat: {getData(['laboratory_biologi', 'heavy_damage'])}</span></div>
            <div className={styles.dataRow}><span>Total Ruang Lab. Biologi Rusak: {getData(['laboratory_biologi', 'total_mh'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Lab. Biologi: {getData(['laboratory_biologi', 'total_all'])}</span></div>
        </div>
      </div>
      
      {/* Ruang Kepala Sekolah Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Kepala Sekolah</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Ruang Kepala Sekolah Kondisi Baik: {getData(['kepsek_room', 'good'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Kepala Sekolah Rusak Sedang: {getData(['kepsek_room', 'moderate_damage'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Kepala Sekolah Rusak Berat: {getData(['kepsek_room', 'heavy_damage'])}</span></div>
            <div className={styles.dataRow}><span>Total Ruang Kepala Sekolah Rusak: {getData(['kepsek_room', 'total_mh'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Kepala Sekolah: {getData(['kepsek_room', 'total_all'])}</span></div>
        </div>
      </div>
      
      {/* Ruang Guru Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Guru</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Ruang Guru Kondisi Baik: {getData(['teacher_room', 'good'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Guru Rusak Sedang: {getData(['teacher_room', 'moderate_damage'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Guru Rusak Berat: {getData(['teacher_room', 'heavy_damage'])}</span></div>
            <div className={styles.dataRow}><span>Total Ruang Guru Rusak: {getData(['teacher_room', 'total_mh'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Guru: {getData(['teacher_room', 'total_all'])}</span></div>
        </div>
      </div>

      {/* Ruang Tata Usaha Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Tata Usaha</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Ruang Tata Usaha Kondisi Baik: {getData(['administration_room', 'good'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Tata Usaha Rusak Sedang: {getData(['administration_room', 'moderate_damage'])}</span></div>
            <div className={styles.dataRow}><span>Ruang Tata Usaha Rusak Berat: {getData(['administration_room', 'heavy_damage'])}</span></div>
            <div className={styles.dataRow}><span>Total Ruang Tata Usaha Rusak: {getData(['administration_room', 'total_mh'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Keseluruhan Ruang Tata Usaha: {getData(['administration_room', 'total_all'])}</span></div>
        </div>
      </div>

      {/* Toilet Guru Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet Guru</h2>
        <div className={styles.card}>
            <div className={styles.subsection}><h3 className={styles.subsectionTitle}>Laki-laki</h3>
                <div className={styles.dataRow}><span>Kondisi Baik: {getData(['teachers_toilet', 'male', 'good'])}</span></div>
                <div className={styles.dataRow}><span>Rusak Sedang: {getData(['teachers_toilet', 'male', 'moderate_damage'])}</span></div>
                <div className={styles.dataRow}><span>Rusak Berat: {getData(['teachers_toilet', 'male', 'heavy_damage'])}</span></div>
                <div className={styles.dataRow}><span>Total Rusak: {getData(['teachers_toilet', 'male', 'total_mh'])}</span></div>
                <div className={styles.dataRow}><span>Jumlah Total: {getData(['teachers_toilet', 'male', 'total_all'])}</span></div>
            </div>
            <div className={styles.subsection}><h3 className={styles.subsectionTitle}>Perempuan</h3>
                <div className={styles.dataRow}><span>Kondisi Baik: {getData(['teachers_toilet', 'female', 'good'])}</span></div>
                <div className={styles.dataRow}><span>Rusak Sedang: {getData(['teachers_toilet', 'female', 'moderate_damage'])}</span></div>
                <div className={styles.dataRow}><span>Rusak Berat: {getData(['teachers_toilet', 'female', 'heavy_damage'])}</span></div>
                <div className={styles.dataRow}><span>Total Rusak: {getData(['teachers_toilet', 'female', 'total_mh'])}</span></div>
                <div className={styles.dataRow}><span>Jumlah Total: {getData(['teachers_toilet', 'female', 'total_all'])}</span></div>
            </div>
        </div>
      </div>

      {/* Toilet Siswa Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet Siswa</h2>
        <div className={styles.card}>
            <div className={styles.subsection}><h3 className={styles.subsectionTitle}>Laki-laki</h3>
                <div className={styles.dataRow}><span>Kondisi Baik: {getData(['students_toilet', 'male', 'good'])}</span></div>
                <div className={styles.dataRow}><span>Rusak Sedang: {getData(['students_toilet', 'male', 'moderate_damage'])}</span></div>
                <div className={styles.dataRow}><span>Rusak Berat: {getData(['students_toilet', 'male', 'heavy_damage'])}</span></div>
                <div className={styles.dataRow}><span>Total Rusak: {getData(['students_toilet', 'male', 'total_mh'])}</span></div>
                <div className={styles.dataRow}><span>Jumlah Total: {getData(['students_toilet', 'male', 'total_all'])}</span></div>
            </div>
            <div className={styles.subsection}><h3 className={styles.subsectionTitle}>Perempuan</h3>
                <div className={styles.dataRow}><span>Kondisi Baik: {getData(['students_toilet', 'female', 'good'])}</span></div>
                <div className={styles.dataRow}><span>Rusak Sedang: {getData(['students_toilet', 'female', 'moderate_damage'])}</span></div>
                <div className={styles.dataRow}><span>Rusak Berat: {getData(['students_toilet', 'female', 'heavy_damage'])}</span></div>
                <div className={styles.dataRow}><span>Total Rusak: {getData(['students_toilet', 'female', 'total_mh'])}</span></div>
                <div className={styles.dataRow}><span>Jumlah Total: {getData(['students_toilet', 'female', 'total_all'])}</span></div>
            </div>
        </div>
      </div>

      {/* Furnitur dan Komputer Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Furnitur dan Komputer</h2>
        <div className={styles.card}>
            <div className={styles.dataRow}><span>Jumlah Meja: {getData(['furniture_computer', 'tables'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Kursi: {getData(['furniture_computer', 'chairs'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Papan Tulis: {getData(['furniture_computer', 'boards'])}</span></div>
            <div className={styles.dataRow}><span>Jumlah Komputer: {getData(['furniture_computer', 'computer'])}</span></div>
        </div>
      </div>

      {/* Tombol Kembali di bagian bawah */}
      <div style={{ marginTop: '20px' }}>
        <Button onClick={onBack}>Kembali</Button>
      </div>
    </div>
  );
};

export default SchoolDetailSmp;