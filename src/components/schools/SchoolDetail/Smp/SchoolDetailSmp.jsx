import React from 'react';
import styles from './SchoolDetailSmp.module.css';
import Button from '../../../ui/Button/Button';



const SchoolDetailSmp = ({ schoolData, onBack }) => {
  const handleLocationClick = () => {
    if (schoolData?.coordinates) {
      const [lat, lng] = schoolData.coordinates;
      if (lat !== 0 && lng !== 0) {
        const url = `https://www.google.com/maps?q=${lat},${lng}`;
        window.open(url, '_blank');
      } else {
        alert('Koordinat untuk sekolah ini tidak tersedia.');
      }
    }
  };

  return (
    <div className={styles.container}>
      {/* Back Button */}
      <button onClick={onBack} className={styles.backButton}>
        ← Kembali ke Daftar Sekolah
      </button>

      {/* Header Section */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{schoolData?.name || 'Nama Sekolah Tidak Tersedia'}</h1>
        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.npsn || 'Tidak Tersedia'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.address || 'Tidak Tersedia'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.village || 'Tidak Tersedia'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.kecamatan || 'Tidak Tersedia'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.student_count || 'Tidak Tersedia'}</span>
          </div>
        </div>
        <button className={styles.locationButton} onClick={handleLocationClick}>
          Lihat Lokasi {schoolData?.name || 'Nama Sekolah Tidak Tersedia'} di Google Maps
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
                  <span className={styles.barLabel}>{schoolData?.class_condition?.total_mh || 0}</span>
                </div>
                <span className={styles.barText}>Rehabilitasi Ruang Kelas</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar0}`}>
                  <span className={styles.barLabel}>{schoolData?.class_condition?.classrooms_heavy_damage || 0}</span>
                </div>
                <span className={styles.barText}>Rusak Berat</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar0}`}>
                  <span className={styles.barLabel}>{schoolData?.class_condition?.classrooms_moderate_damage || 0}</span>
                </div>
                <span className={styles.barText}>Rusak Sedang</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar3}`}>
                  <span className={styles.barLabel}>{schoolData?.class_condition?.classrooms_good || 0}</span>
                </div>
                <span className={styles.barText}>Baik</span>
              </div>
              <div className={styles.barContainer}>
                <div className={`${styles.bar} ${styles.bar0}`}>
                  <span className={styles.barLabel}>{schoolData?.class_condition?.lacking_rkb || 0}</span>
                </div>
                <span className={styles.barText}>Kurang RKB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Perpustakaan Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Perpustakaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Perpustakaan Kondisi Baik: {schoolData?.library?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Perpustakaan Rusak Sedang: {schoolData?.library?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Perpustakaan Rusak Berat: {schoolData?.library?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Perpustakaan Rusak: {schoolData?.library?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Perpustakaan: {schoolData?.library?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Lab. Komputer Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Komputer Kondisi Baik: {schoolData?.laboratory_comp?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Komputer Rusak Sedang: {schoolData?.laboratory_comp?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Komputer Rusak Berat: {schoolData?.laboratory_comp?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. Komputer Rusak: {schoolData?.laboratory_comp?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. Komputer: {schoolData?.laboratory_comp?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Lab. Bahasa Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Bahasa</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Bahasa Kondisi Baik: {schoolData?.laboratory_langua?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Bahasa Rusak Sedang: {schoolData?.laboratory_langua?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Bahasa Rusak Berat: {schoolData?.laboratory_langua?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. Bahasa Rusak: {schoolData?.laboratory_langua?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. Bahasa: {schoolData?.laboratory_langua?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Lab. IPA Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. IPA</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. IPA Kondisi Baik: {schoolData?.laboratory_ipa?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. IPA Rusak Sedang: {schoolData?.laboratory_ipa?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. IPA Rusak Berat: {schoolData?.laboratory_ipa?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. IPA Rusak: {schoolData?.laboratory_ipa?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. IPA: {schoolData?.laboratory_ipa?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Lab. Fisika Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Fisika</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Fisika Kondisi Baik: {schoolData?.laboratory_fisika?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Fisika Rusak Sedang: {schoolData?.laboratory_fisika?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Fisika Rusak Berat: {schoolData?.laboratory_fisika?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. Fisika Rusak: {schoolData?.laboratory_fisika?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. Fisika: {schoolData?.laboratory_fisika?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Lab. Biologi Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Biologi</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Biologi Kondisi Baik: {schoolData?.laboratory_biologi?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Biologi Rusak Sedang: {schoolData?.laboratory_biologi?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Biologi Rusak Berat: {schoolData?.laboratory_biologi?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. Biologi Rusak: {schoolData?.laboratory_biologi?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. Biologi: {schoolData?.laboratory_biologi?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Ruang Kepala Sekolah Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Kepala Sekolah</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Kepala Sekolah Kondisi Baik: {schoolData?.kepsek_room?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Kepala Sekolah Rusak Sedang: {schoolData?.kepsek_room?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Kepala Sekolah Rusak Berat: {schoolData?.kepsek_room?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Kepala Sekolah Rusak: {schoolData?.kepsek_room?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Kepala Sekolah: {schoolData?.kepsek_room?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Ruang Guru Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Guru Kondisi Baik: {schoolData?.teacher_room?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Guru Rusak Sedang: {schoolData?.teacher_room?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Guru Rusak Berat: {schoolData?.teacher_room?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Guru Rusak: {schoolData?.teacher_room?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Guru: {schoolData?.teacher_room?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Ruang Tata Usaha Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Tata Usaha</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Tata Usaha Kondisi Baik: {schoolData?.administration_room?.good || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Tata Usaha Rusak Sedang: {schoolData?.administration_room?.moderate_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Tata Usaha Rusak Berat: {schoolData?.administration_room?.heavy_damage || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Tata Usaha Rusak: {schoolData?.administration_room?.total_mh || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Tata Usaha: {schoolData?.administration_room?.total_all || 0}</span>
          </div>
        </div>
      </div>

      {/* Toilet Guru Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet Guru</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}>
              <span>Toilet Guru Laki-laki Kondisi Baik: {schoolData?.teachers_toilet?.male?.good || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Guru Laki-laki Rusak Sedang: {schoolData?.teachers_toilet?.male?.moderate_damage || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Guru Laki-laki Rusak Berat: {schoolData?.teachers_toilet?.male?.heavy_damage || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Toilet Guru Laki-laki Rusak: {schoolData?.teachers_toilet?.male?.total_mh || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Keseluruhan Toilet Guru Laki-laki: {schoolData?.teachers_toilet?.male?.total_all || 0}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Toilet Guru Perempuan Kondisi Baik: {schoolData?.teachers_toilet?.female?.good || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Guru Perempuan Rusak Sedang: {schoolData?.teachers_toilet?.female?.moderate_damage || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Guru Perempuan Rusak Berat: {schoolData?.teachers_toilet?.female?.heavy_damage || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Toilet Guru Perempuan Rusak: {schoolData?.teachers_toilet?.female?.total_mh || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Keseluruhan Toilet Guru Perempuan: {schoolData?.teachers_toilet?.female?.total_all || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Toilet Siswa Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Toilet Siswa</h2>
        <div className={styles.card}>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Laki-laki</h3>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Laki-laki Kondisi Baik: {schoolData?.students_toilet?.male?.good || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Laki-laki Rusak Sedang: {schoolData?.students_toilet?.male?.moderate_damage || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Laki-laki Rusak Berat: {schoolData?.students_toilet?.male?.heavy_damage || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Toilet Siswa Laki-laki Rusak: {schoolData?.students_toilet?.male?.total_mh || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Keseluruhan Toilet Siswa Laki-laki: {schoolData?.students_toilet?.male?.total_all || 0}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Perempuan Kondisi Baik: {schoolData?.students_toilet?.female?.good || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Perempuan Rusak Sedang: {schoolData?.students_toilet?.female?.moderate_damage || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Perempuan Rusak Berat: {schoolData?.students_toilet?.female?.heavy_damage || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Toilet Siswa Perempuan Rusak: {schoolData?.students_toilet?.female?.total_mh || 0}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Keseluruhan Toilet Siswa Perempuan: {schoolData?.students_toilet?.female?.total_all || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Furnitur dan Komputer Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Furnitur dan Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Meja Siswa: {schoolData?.furniture_computer?.tables || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Kursi Siswa: {schoolData?.furniture_computer?.chairs || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Papan Tulis: {schoolData?.furniture_computer?.boards || 0}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Komputer: {schoolData?.furniture_computer?.computer || 0}</span>
          </div>
        </div>
      </div>
                      {/* Tombol Kembali */}
                      <Button onClick={onBack}>Kembali</Button>
    </div>
  );
};

export default SchoolDetailSmp;