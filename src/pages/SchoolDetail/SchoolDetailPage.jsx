// SchoolDetailPage.jsx
import React, { useState } from 'react';
import styles from './SchoolDetailPage.module.css';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import Map from '../Map/Map'; // Pastikan path benar

// PieChart Component
const PieChartComponent = ({ title, data }) => (
  <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
    <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, borderBottom: '2px solid #3b82f6', paddingBottom: 8, color: '#1e40af' }}>
      {title}
    </h3>
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ percent }) => `${(percent * 100).toFixed(1)}%`}
            labelPosition="outside"
            labelLine={true}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// BarChart Component
const BarChartComponent = ({ title, data, colors }) => (
  <div style={{ background: 'white', padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb' }}>
    <h3 style={{ fontWeight: 600, fontSize: 18, marginBottom: 16, borderBottom: '2px solid #3b82f6', paddingBottom: 8, color: '#1e40af' }}>{title}</h3>
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 14 }} />
          <YAxis />
          <Bar dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-bar-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Data Table Component
const DataTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const filteredData = data.filter(school =>
    school.namaSekolah?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.npsn?.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = filteredData.slice(startIndex, endIndex);

  const handleReset = () => {
    setSearchTerm('');
    setCurrentPage(1);
    setItemsPerPage(5);
  };

  return (
    <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto', border: '1px solid #e5e7eb' }}>
      <div style={{ padding: 16, backgroundColor: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <input
          type="text"
          placeholder="Cari nama sekolah atau NPSN..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', flexGrow: 1, minWidth: 200 }}
        />
        <select
          value={itemsPerPage}
          onChange={e => setItemsPerPage(Number(e.target.value))}
          style={{ padding: 8, borderRadius: 6, border: '1px solid #d1d5db', width: 120 }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={25}>25</option>
        </select>
        <button
          onClick={handleReset}
          style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer' }}
        >
          Reset Filter
        </button>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 11,
          fontFamily: 'Inter, Arial, sans-serif',
          tableLayout: 'fixed',
          minWidth: 900,
          background: 'white',
        }}
      >
        <thead>
          <tr style={{
            backgroundColor: '#f3f4f6',
            color: '#1e293b',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontSize: 11,
            borderBottom: '2px solid #3b82f6',
          }}>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '4%' }}>NO</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '7%' }}>NPSN</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '13%' }}>NAMA SEKOLAH</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '6%' }}>JENJANG</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '7%' }}>TIPE SEKOLAH</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '7%' }}>DESA</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '7%' }}>KECAMATAN</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '5%' }}>KELAS BAIK</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '5%' }}>KELAS RUSAK SEDANG</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '5%' }}>KELAS RUSAK BERAT</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '5%' }}>KURANG RKB</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '7%' }}>REHAB RUANG KELAS</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '8%' }}>PEMBANGUNAN RKB</th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '8%' }}>INTERVENSI RKB</th>
            <th style={{ padding: '6px 3px', textAlign: 'center', width: '6%' }}>DETAIL</th>
          </tr>
        </thead>
        <tbody>
          {currentData.map((school, index) => (
            <tr
              key={index}
              style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.no || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.npsn || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.namaSekolah || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.jenjang || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.tipeSekolah || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.desa || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kecamatan || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kondisiKelas?.baik || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kondisiKelas?.rusakSedang || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kondisiKelas?.rusakBerat || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kurangRKB || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.rehabRuangKelas || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.pembangunanRKB || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.intervensiRuangKelas || 0}</td>
              <td style={{ textAlign: 'center' }}>
                <button
                  className={styles.detailButton}
                  onClick={() => alert(`Detail sekolah: ${school.namaSekolah}`)}
                >
                  Detail
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#f9fafb' }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
            backgroundColor: currentPage === 1 ? '#e5e7eb' : '#3b82f6',
            color: currentPage === 1 ? '#9ca3af' : 'white',
          }}
        >
          Prev
        </button>
        <span style={{ lineHeight: '32px' }}>Page {currentPage} of {totalPages}</span>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: 'none',
            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
            backgroundColor: currentPage === totalPages ? '#e5e7eb' : '#3b82f6',
            color: currentPage === totalPages ? '#9ca3af' : 'white',
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

const SchoolDetailPage = () => {
  const [schoolData, setSchoolData] = useState([]); // Data awal kosong

  const totalSekolah = schoolData.length;

  const kondisiSemuaJenjang = schoolData.reduce(
    (acc, curr) => {
      acc.baik += curr.kondisiKelas?.baik || 0;
      acc.rusakSedang += curr.kondisiKelas?.rusakSedang || 0;
      acc.rusakBerat += curr.kondisiKelas?.rusakBerat || 0;
      return acc;
    },
    { baik: 0, rusakSedang: 0, rusakBerat: 0 }
  );

  const totalRehab = schoolData.reduce((acc, curr) => acc + (curr.rehabRuangKelas || 0), 0);
  const totalIntervensi = schoolData.reduce((acc, curr) => acc + (curr.intervensiRuangKelas || 0), 0);

  const pieColors = ["#4ECDC4", "#FFD93D", "#FF6B6B"];
  const barColors = ["#4ECDC4", "#FFD93D"];

  const pieDataList = [
    {
      title: "Kondisi Ruang Kelas Semua Jenjang",
      data: [
        { name: "Baik", value: kondisiSemuaJenjang.baik, color: "#4ECDC4" },
        { name: "Rusak Sedang", value: kondisiSemuaJenjang.rusakSedang, color: "#FFD93D" },
        { name: "Rusak Berat", value: kondisiSemuaJenjang.rusakBerat, color: "#FF6B6B" },
      ],
    },
    {
      title: "Rehabilitasi Ruang Kelas",
      data: [
        { name: "Rehabilitasi", value: totalRehab, color: "#4ECDC4" },
        { name: "Belum Rehabilitasi", value: Math.max(totalSekolah - totalRehab, 0), color: "#FFD93D" },
      ],
    },
    {
      title: "Intervensi Ruang Kelas Semua Jenjang",
      data: [
        { name: "Intervensi", value: totalIntervensi, color: "#4ECDC4" },
        { name: "Belum Intervensi", value: Math.max(totalSekolah - totalIntervensi, 0), color: "#FFD93D" },
      ],
    },
  ];

  const barKondisiKelas = [
    { name: "Baik", value: kondisiSemuaJenjang.baik },
    { name: "Rusak Sedang", value: kondisiSemuaJenjang.rusakSedang },
    { name: "Rusak Berat", value: kondisiSemuaJenjang.rusakBerat },
  ];

  const barIntervensiKelas = [
    { name: "Intervensi", value: totalIntervensi },
    { name: "Belum Intervensi", value: Math.max(totalSekolah - totalIntervensi, 0) },
  ];

  return (
    <div style={{
      padding: 16,
      backgroundColor: '#f3f4f6',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif',
      fontSize: '12px'
    }}>
      {/* Header kotak putih */}
      <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1f2937' }}>Detail Sekolah</h1>
      </div>

      {/* === Filter Section === */}
      <div className={styles.filterContainer}>
        <h3>Filter Data</h3>
        <div className={styles.filterGroup}>
          <label>Filter Jenjang:</label>
          <select className={styles.selectDropdown}>
            <option>Semua Jenjang</option>
            <option>PAUD</option>
            <option>SD</option>
            <option>SMP</option>
            <option>PKBM</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Filter Kecamatan:</label>
          <select className={styles.selectDropdown}>
            <option>Semua Kecamatan</option>
            <option>Garut Kota</option>
            <option>Tarogong Kidul</option>
            <option>Tarogong Kaler</option>
            <option>Cisurupan</option>
            <option>Leles</option>
            <option>Bayongbong</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label>Filter Desa:</label>
          <select className={styles.selectDropdown}>
            <option>Semua Desa</option>
          </select>
        </div>
      </div>

      {/* Peta */}
        <section className={styles.section}>
          <h2 style={{ fontSize: 20, fontWeight: 600, borderBottom: '3px solid #3b82f6', paddingBottom: 8, marginBottom: 16, color: '#1e40af' }}>
            Peta Lokasi Sekolah
          </h2>
          <div className={styles.mapContainer}>
            <Map />
          </div>
        </section>

      {/* Pie Charts */}
      <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        {pieDataList.map((pie, idx) => (
          <div key={idx} style={{ flex: '1 1 30%' }}>
            <PieChartComponent title={pie.title} data={pie.data} />
          </div>
        ))}
      </section>

      {/* Bar Charts */}
      <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ flex: '1 1 48%' }}>
          <BarChartComponent title="Kondisi Ruang Kelas" data={barKondisiKelas} colors={pieColors} />
        </div>
        <div style={{ flex: '1 1 48%' }}>
          <BarChartComponent title="Intervensi Ruang Kelas" data={barIntervensiKelas} colors={barColors} />
        </div>
      </section>

      {/* Data Tabel */}
      <section>
        <DataTable data={schoolData} />
      </section>
    </div>
  );
};

export default SchoolDetailPage;
