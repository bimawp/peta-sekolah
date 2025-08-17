import React from 'react';
import styles from './SchoolDetailSmp.module.css';
import Button from '../../../ui/Button/Button';



const SchoolDetailSmp = ({ schoolData, onBack }) => {
  return (
    <div className={styles.container}>
      {/* Back Button */}
      <button onClick={onBack} className={styles.backButton}>
        ← Kembali ke Daftar Sekolah
      </button>

      {/* Header Section */}
      <div className={styles.header}>
        <h1 className={styles.schoolName}>{schoolData?.nama || 'SMPN 1 Banjarwangi'}</h1>
        <div className={styles.schoolInfo}>
          <div className={styles.infoRow}>
            <span className={styles.label}>NPSN</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.npsn || '20209285'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Alamat</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.address || 'Jalan Raya Banjarwangi'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Desa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.desa || 'Banjarwangi'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Kecamatan</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.kecamatan || 'Banjarwangi'}</span>
          </div>
          <div className={styles.infoRow}>
            <span className={styles.label}>Jumlah Siswa</span>
            <span className={styles.colon}>:</span>
            <span className={styles.value}>{schoolData?.totalStudents || '419'}</span>
          </div>
        </div>
        <button className={styles.locationButton}>
          Lihat Lokasi {schoolData?.nama || 'SMPN 1 Banjarwangi'} di Google Maps ({schoolData?.kecamatan || 'Banjarwangi'})
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
                  <span className={styles.barLabel}>18</span>
                </div>
                <span className={styles.barText}>Baik</span>
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

      {/* Data Perpustakaan Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Data Perpustakaan</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Perpustakaan Kondisi Baik: {schoolData?.perpustakaan?.kondisiBaik || '1'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Perpustakaan Rusak Sedang: {schoolData?.perpustakaan?.rusakSedang || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Perpustakaan Rusak Berat: {schoolData?.perpustakaan?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Perpustakaan Rusak: {schoolData?.perpustakaan?.totalRusak || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Perpustakaan: {schoolData?.perpustakaan?.jumlahTotal || '1'}</span>
          </div>
        </div>
      </div>

      {/* Lab. Komputer Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Komputer Kondisi Baik: {schoolData?.labKomputer?.kondisiBaik || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Komputer Rusak Sedang: {schoolData?.labKomputer?.rusakSedang || '1'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Komputer Rusak Berat: {schoolData?.labKomputer?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. Komputer Rusak: {schoolData?.labKomputer?.totalRusak || '1'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. Komputer: {schoolData?.labKomputer?.jumlahTotal || '1'}</span>
          </div>
        </div>
      </div>

      {/* Lab. Bahasa Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Bahasa</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Bahasa Kondisi Baik: {schoolData?.labBahasa?.kondisiBaik || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Bahasa Rusak Sedang: {schoolData?.labBahasa?.rusakSedang || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Bahasa Rusak Berat: {schoolData?.labBahasa?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. Bahasa Rusak: {schoolData?.labBahasa?.totalRusak || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. Bahasa: {schoolData?.labBahasa?.jumlahTotal || '0'}</span>
          </div>
        </div>
      </div>

      {/* Lab. IPA Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. IPA</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. IPA Kondisi Baik: {schoolData?.labIpa?.kondisiBaik || '1'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. IPA Rusak Sedang: {schoolData?.labIpa?.rusakSedang || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. IPA Rusak Berat: {schoolData?.labIpa?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. IPA Rusak: {schoolData?.labIpa?.totalRusak || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. IPA: {schoolData?.labIpa?.jumlahTotal || '1'}</span>
          </div>
        </div>
      </div>

      {/* Lab. Fisika Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Fisika</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Fisika Kondisi Baik: {schoolData?.labFisika?.kondisiBaik || '1'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Fisika Rusak Sedang: {schoolData?.labFisika?.rusakSedang || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Fisika Rusak Berat: {schoolData?.labFisika?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. Fisika Rusak: {schoolData?.labFisika?.totalRusak || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. Fisika: {schoolData?.labFisika?.jumlahTotal || '1'}</span>
          </div>
        </div>
      </div>

      {/* Lab. Biologi Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Lab. Biologi</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Biologi Kondisi Baik: {schoolData?.labBiologi?.kondisiBaik || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Biologi Rusak Sedang: {schoolData?.labBiologi?.rusakSedang || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Lab. Biologi Rusak Berat: {schoolData?.labBiologi?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Lab. Biologi Rusak: {schoolData?.labBiologi?.totalRusak || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Lab. Biologi: {schoolData?.labBiologi?.jumlahTotal || '0'}</span>
          </div>
        </div>
      </div>

      {/* Ruang Kepala Sekolah Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Kepala Sekolah</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Kepala Sekolah Kondisi Baik: {schoolData?.ruangKepsek?.kondisiBaik || '1'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Kepala Sekolah Rusak Sedang: {schoolData?.ruangKepsek?.rusakSedang || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Kepala Sekolah Rusak Berat: {schoolData?.ruangKepsek?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Kepala Sekolah Rusak: {schoolData?.ruangKepsek?.totalRusak || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Kepala Sekolah: {schoolData?.ruangKepsek?.jumlahTotal || '1'}</span>
          </div>
        </div>
      </div>

      {/* Ruang Guru Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Guru</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Guru Kondisi Baik: {schoolData?.ruangGuru?.kondisiBaik || '1'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Guru Rusak Sedang: {schoolData?.ruangGuru?.rusakSedang || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Guru Rusak Berat: {schoolData?.ruangGuru?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Guru Rusak: {schoolData?.ruangGuru?.totalRusak || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Guru: {schoolData?.ruangGuru?.jumlahTotal || '1'}</span>
          </div>
        </div>
      </div>

      {/* Ruang Tata Usaha Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Ruang Tata Usaha</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Ruang Tata Usaha Kondisi Baik: {schoolData?.ruangTu?.kondisiBaik || '1'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Tata Usaha Rusak Sedang: {schoolData?.ruangTu?.rusakSedang || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Ruang Tata Usaha Rusak Berat: {schoolData?.ruangTu?.rusakBerat || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Total Ruang Tata Usaha Rusak: {schoolData?.ruangTu?.totalRusak || '0'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Jumlah Keseluruhan Ruang Tata Usaha: {schoolData?.ruangTu?.jumlahTotal || '1'}</span>
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
              <span>Toilet Guru Laki-laki Kondisi Baik: {schoolData?.toiletGuruL?.kondisiBaik || '1'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Guru Laki-laki Rusak Sedang: {schoolData?.toiletGuruL?.rusakSedang || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Guru Laki-laki Rusak Berat: {schoolData?.toiletGuruL?.rusakBerat || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Toilet Guru Laki-laki Rusak: {schoolData?.toiletGuruL?.totalRusak || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Keseluruhan Toilet Guru Laki-laki: {schoolData?.toiletGuruL?.jumlahTotal || '1'}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Toilet Guru Perempuan Kondisi Baik: {schoolData?.toiletGuruP?.kondisiBaik || '1'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Guru Perempuan Rusak Sedang: {schoolData?.toiletGuruP?.rusakSedang || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Guru Perempuan Rusak Berat: {schoolData?.toiletGuruP?.rusakBerat || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Toilet Guru Perempuan Rusak: {schoolData?.toiletGuruP?.totalRusak || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Keseluruhan Toilet Guru Perempuan: {schoolData?.toiletGuruP?.jumlahTotal || '1'}</span>
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
              <span>Toilet Siswa Laki-laki Kondisi Baik: {schoolData?.toiletSiswaL?.kondisiBaik || '1'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Laki-laki Rusak Sedang: {schoolData?.toiletSiswaL?.rusakSedang || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Laki-laki Rusak Berat: {schoolData?.toiletSiswaL?.rusakBerat || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Toilet Siswa Laki-laki Rusak: {schoolData?.toiletSiswaL?.totalRusak || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Keseluruhan Toilet Siswa Laki-laki: {schoolData?.toiletSiswaL?.jumlahTotal || '1'}</span>
            </div>
          </div>
          <div className={styles.subsection}>
            <h3 className={styles.subsectionTitle}>Perempuan</h3>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Perempuan Kondisi Baik: {schoolData?.toiletSiswaP?.kondisiBaik || '1'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Perempuan Rusak Sedang: {schoolData?.toiletSiswaP?.rusakSedang || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Toilet Siswa Perempuan Rusak Berat: {schoolData?.toiletSiswaP?.rusakBerat || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Total Toilet Siswa Perempuan Rusak: {schoolData?.toiletSiswaP?.totalRusak || '0'}</span>
            </div>
            <div className={styles.dataRow}>
              <span>Jumlah Keseluruhan Toilet Siswa Perempuan: {schoolData?.toiletSiswaP?.jumlahTotal || '1'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Furnitur dan Komputer Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Furnitur dan Komputer</h2>
        <div className={styles.card}>
          <div className={styles.dataRow}>
            <span>Jumlah Rumah Dinas: {schoolData?.furniture?.jumlahRumahDinas || '498'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rumah Dinas Kondisi Baik: {schoolData?.furniture?.rumahDinasKondisiBaik || '803'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rumah Dinas Rusak Sedang: {schoolData?.furniture?.rumahDinasRusakSedang || '31'}</span>
          </div>
          <div className={styles.dataRow}>
            <span>Rumah Dinas Rusak Berat: {schoolData?.furniture?.rumahDinasRusakBerat || '49'}</span>
          </div>
        </div>
      </div>
                      {/* Tombol Kembali */}
                      <Button onClick={onBack}>Kembali</Button>
    </div>
  );
};

export default SchoolDetailSmp;