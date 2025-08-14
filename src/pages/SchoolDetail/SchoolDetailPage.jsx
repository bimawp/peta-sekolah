// SchoolDetailPage.jsx
import React, { useState } from 'react';
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

// Sample Data Sekolah
const sampleSchoolData = [
  {
    no: 1,
    npsn: "69826911",
    namaSekolah: "AL-ALIFA",
    jenjang: "PAUD",
    tipeSekolah: "KB",
    desa: "Kadongdong",
    kecamatan: "Banjarwangi",
    kondisiKelas: { baik: 0, rusakSedang: 0, rusakBerat: 1 },
    kurangRKB: 1,
    rehabRuangKelas: 2,
    pembangunanRKB: 0,
    intervensiRuangKelas: 1,
  },
  {
    no: 2,
    npsn: "70047520",
    namaSekolah: "KB AINUL MARDIYYAH",
    jenjang: "PAUD",
    tipeSekolah: "KB",
    desa: "Bojong",
    kecamatan: "Banjarwangi",
    kondisiKelas: { baik: 0, rusakSedang: 0, rusakBerat: 0 },
    kurangRKB: 2,
    rehabRuangKelas: 1,
    pembangunanRKB: 1,
    intervensiRuangKelas: 0,
  },
  {
    no: 3,
    npsn: "70001435",
    namaSekolah: "KB AL FINNUR",
    jenjang: "PAUD",
    tipeSekolah: "KB",
    desa: "Talagasari",
    kecamatan: "Banjarwangi",
    kondisiKelas: { baik: 1, rusakSedang: 0, rusakBerat: 0 },
    kurangRKB: 1,
    rehabRuangKelas: 0,
    pembangunanRKB: 0,
    intervensiRuangKelas: 2,
  },
  {
    no: 4,
    npsn: "70034739",
    namaSekolah: "KB AL ITTIHADIYAH",
    jenjang: "PAUD",
    tipeSekolah: "KB",
    desa: "Tanjungjaya",
    kecamatan: "Banjarwangi",
    kondisiKelas: { baik: 0, rusakSedang: 3, rusakBerat: 0 },
    kurangRKB: 0,
    rehabRuangKelas: 1,
    pembangunanRKB: 1,
    intervensiRuangKelas: 1,
  },
  {
    no: 5,
    npsn: "70009862",
    namaSekolah: "KB Al-Barokah",
    jenjang: "PAUD",
    tipeSekolah: "KB",
    desa: "Padahurip",
    kecamatan: "Banjarwangi",
    kondisiKelas: { baik: 0, rusakSedang: 2, rusakBerat: 1 },
    kurangRKB: 0,
    rehabRuangKelas: 0,
    pembangunanRKB: 0,
    intervensiRuangKelas: 0,
  }
];

// PieChart Component
const PieChartComponent = ({ title, data }) => (
  <div style={{ background: 'white', padding: 24, borderRadius: 8, boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
    <h3 style={{ fontWeight: '600', fontSize: 18, marginBottom: 16, borderBottom: '2px solid #3b82f6', paddingBottom: 8, color: '#1e40af' }}>
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
            label={({ percent }) => `${(percent * 100).toFixed(1)}%`} // cuma tampilkan persen
            labelPosition="outside" // pindahkan persenan ke luar potongan
            labelLine={true} // garis penghubung
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
  <div style={{ background: 'white', padding: 24, borderRadius: 8, boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
    <h3 style={{ fontWeight: '600', fontSize: 18, marginBottom: 16, borderBottom: '2px solid #3b82f6', paddingBottom: 8, color: '#1e40af' }}>{title}</h3>
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
    school.namaSekolah.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.npsn.includes(searchTerm)
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
    <div style={{ background: 'white', borderRadius: 8, boxShadow: '0 0 10px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
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
          minWidth: 820, // lebih kecil agar muat di section
          background: 'white',
        }}
      >
        <thead>
          <tr style={{
            backgroundColor: '#f3f4f6',
            color: '#1e293b',
            fontWeight: 700,
            textTransform: 'uppercase',
            fontFamily: 'Inter, Arial, sans-serif',
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
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '5%' }}>
              KELAS BAIK <span style={{ color: '#3b82f6', fontWeight: 900 }}>↑</span>
            </th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '5%' }}>
              KELAS RUSAK SEDANG <span style={{ color: '#3b82f6', fontWeight: 900 }}>↕</span>
            </th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '5%' }}>
              KELAS RUSAK BERAT <span style={{ color: '#3b82f6', fontWeight: 900 }}>↕</span>
            </th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '5%' }}>
              KURANG RKB <span style={{ color: '#3b82f6', fontWeight: 900 }}>↕</span>
            </th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '7%' }}>
              REHAB RUANG KELAS <span style={{ color: '#3b82f6', fontWeight: 900 }}>↕</span>
            </th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '8%' }}>
              PEMBANGUNAN RKB <span style={{ color: '#3b82f6', fontWeight: 900 }}>↕</span>
            </th>
            <th style={{ padding: '6px 3px', textAlign: 'left', width: '8%' }}>
              INTERVENSI RKB
            </th>
          </tr>
        </thead>
        <tbody>
          {currentData.map(school => (
            <tr
              key={school.no}
              style={{
                borderBottom: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.no}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.npsn}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.namaSekolah}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.jenjang}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.tipeSekolah}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.desa}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kecamatan}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kondisiKelas.baik}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kondisiKelas.rusakSedang}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kondisiKelas.rusakBerat}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kurangRKB}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.rehabRuangKelas}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.pembangunanRKB}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.intervensiRuangKelas}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
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
  const totalSekolah = sampleSchoolData.length;

  // Hitung agregasi kondisi kelas
  const kondisiSemuaJenjang = sampleSchoolData.reduce(
    (acc, curr) => {
      acc.baik += curr.kondisiKelas.baik;
      acc.rusakSedang += curr.kondisiKelas.rusakSedang;
      acc.rusakBerat += curr.kondisiKelas.rusakBerat;
      return acc;
    },
    { baik: 0, rusakSedang: 0, rusakBerat: 0 }
  );

  const totalRehab = sampleSchoolData.reduce((acc, curr) => acc + curr.rehabRuangKelas, 0);
  const totalIntervensi = sampleSchoolData.reduce((acc, curr) => acc + curr.intervensiRuangKelas, 0);

  // Data Pie
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

  // Data Bar
  const barKondisiKelas = [
    { name: "Baik", value: kondisiSemuaJenjang.baik },
    { name: "Rusak Sedang", value: kondisiSemuaJenjang.rusakSedang },
    { name: "Rusak Berat", value: kondisiSemuaJenjang.rusakBerat },
  ];

  const barIntervensiKelas = [
    { name: "Intervensi", value: totalIntervensi },
    { name: "Belum Intervensi", value: Math.max(totalSekolah - totalIntervensi, 0) },
  ];

  const pieColors = ["#4ECDC4", "#FFD93D", "#FF6B6B"];
  const barColors = ["#4ECDC4", "#FFD93D"];

    return (
      <div style={{
        padding: 0, // lebih kecil, konten makin dekat ke sidebar
        backgroundColor: '#f3f4f6',
        minHeight: '100vh',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px' // isi konten lebih besar
      }}>
      <h1 style={{ fontSize: 28, fontWeight: '700', color: '#1e40af', marginBottom: 24 }}>Detail Kondisi Sekolah</h1>

      {/* Peta */}
      <section style={{ marginBottom: 32, backgroundColor: 'white', padding: 16, borderRadius: 8, boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: 20, fontWeight: '600', borderBottom: '3px solid #3b82f6', paddingBottom: 8, marginBottom: 16, color: '#1e40af' }}>Peta Lokasi Sekolah</h2>
        <div style={{ height: 500 }}>
          <Map />
        </div>
      </section>

      {/* Pie Charts */}
      <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        {pieDataList.map(({ title, data }) => (
          <div key={title} style={{ flex: '1 1 320px' }}>
            <PieChartComponent title={title} data={data} />
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
        <DataTable data={sampleSchoolData} />
      </section>
    </div>
  );
};

export default SchoolDetailPage;
