import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import styles from './FacilitiesPage.module.css';

const FacilitiesPage = () => {
  const [currentView, setCurrentView] = useState('main');
  const [displayCount, setDisplayCount] = useState(10);

  // Data sekolah
  const schoolData = [
    { no: 1, npsn: '69826911', nama: 'AL-ALIFA', jenjang: 'PAUD', tipe: 'KB', desa: 'Kadonggong', kecamatan: 'Banjarwangi', toiletBaik: 0, toiletRusakSedang: 0, toiletRusakBerat: 0, totalToilet: 0 },
    { no: 2, npsn: '70047520', nama: 'KB AINUL MARDIYYAH', jenjang: 'PAUD', tipe: 'KB', desa: 'Bojong', kecamatan: 'Banjarwangi', toiletBaik: 0, toiletRusakSedang: 0, toiletRusakBerat: 0, totalToilet: 0 },
    { no: 3, npsn: '70001435', nama: 'KB AL FINNUR', jenjang: 'PAUD', tipe: 'KB', desa: 'Talagasari', kecamatan: 'Banjarwangi', toiletBaik: 0, toiletRusakSedang: 0, toiletRusakBerat: 0, totalToilet: 0 },
    { no: 4, npsn: '70034739', nama: 'KB AL ITTIHADIYAH', jenjang: 'PAUD', tipe: 'KB', desa: 'Tanjungjaya', kecamatan: 'Banjarwangi', toiletBaik: 0, toiletRusakSedang: 0, toiletRusakBerat: 0, totalToilet: 0 },
    { no: 5, npsn: '70009882', nama: 'KB Al-Barokah', jenjang: 'PAUD', tipe: 'KB', desa: 'Padahurip', kecamatan: 'Banjarwangi', toiletBaik: 0, toiletRusakSedang: 0, toiletRusakBerat: 0, totalToilet: 0 },
    { no: 6, npsn: '69890166', nama: 'KB AL-GHIFARI', jenjang: 'PAUD', tipe: 'KB', desa: 'Dangiang', kecamatan: 'Banjarwangi', toiletBaik: 0, toiletRusakSedang: 0, toiletRusakBerat: 0, totalToilet: 0 },
    { no: 7, npsn: '69867314', nama: 'KB AL-HIDAYAH', jenjang: 'PAUD', tipe: 'KB', desa: 'Mulyajaya', kecamatan: 'Banjarwangi', toiletBaik: 0, toiletRusakSedang: 0, toiletRusakBerat: 0, totalToilet: 0 },
    { no: 8, npsn: '69986674', nama: 'KB AL-IHSAN', jenjang: 'PAUD', tipe: 'KB', desa: 'Padahurip', kecamatan: 'Banjarwangi', toiletBaik: 0, toiletRusakSedang: 0, toiletRusakBerat: 0, totalToilet: 0 },
  ];

  const kondisiPieData = [
    { name: 'Baik', value: 46.1, color: '#4ECDC4' },
    { name: 'Rusak Sedang', value: 32.4, color: '#FFD93D' },
    { name: 'Rusak Berat', value: 21.5, color: '#FF6B6B' }
  ];

  const rehabilitasiPieData = [
    { name: 'Rusak Berat (Belum Direhab)', value: 60, color: '#FF6B6B' },
    { name: 'Rehabilitasi (Sudah Direhab)', value: 40, color: '#4CAF50' }
  ];

  const pembangunanPieData = [
    { name: 'Kebutuhan Toilet (Belum Dibangun)', value: 99.2, color: '#FFD93D' },
    { name: 'Pembangunan Dilakukan', value: 0.8, color: '#9B59B6' }
  ];

  const kondisiToiletData = [
    { name: 'Total', value: 5626, color: '#4ECDC4' },
    { name: 'Baik', value: 2594, color: '#4ECDC4' },
    { name: 'Rusak Sedang', value: 1824, color: '#FFD93D' },
    { name: 'Rusak Berat', value: 1208, color: '#FF6B6B' },
    { name: 'Tidak Ada Toilet', value: 1186, color: '#4ECDC4' }
  ];

  const intervensiToiletData = [
    { name: 'Total Intervensi', value: 9, color: '#4A90E2' },
    { name: 'Pembangunan Toilet', value: 9, color: '#9B59B6' },
    { name: 'Rehab Toilet', value: 0, color: '#95A5A6' }
  ];

  const renderLabelInside = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) / 2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14}>
        {`${value}%`}
      </text>
    );
  };

  const renderMainView = () => (
    <div className={styles.facilitiesContainer}>
      {/* Pie Charts */}
      <div className={styles.pieChartsGrid}>
        {[{ title: 'Kondisi Toilet', data: kondisiPieData },
          { title: 'Rehabilitasi Toilet', data: rehabilitasiPieData },
          { title: 'Pembangunan Toilet', data: pembangunanPieData }
        ].map((chart, idx) => (
          <div key={idx} className={styles.chartCard}>
            <h3 className={styles.pieChartTitle}>{chart.title}</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chart.data}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={renderLabelInside}
                  labelLine={false}
                >
                  {chart.data.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
                <Legend verticalAlign="bottom" align="center" formatter={(value, entry) => <span style={{ color: entry.color }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>

      {/* Bar Charts */}
      <div className={styles.barChartsGrid}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Kondisi Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kondisiToiletData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={0} textAnchor="middle" tick={{ fontSize: 12 }} interval={0} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">{kondisiToiletData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Intervensi Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={intervensiToiletData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={0} textAnchor="middle" tick={{ fontSize: 12 }} interval={0} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value">{intervensiToiletData.map((entry, index) => <Cell key={index} fill={entry.color} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.tableHeader}>
            <tr>
              {['NO','NPSN','NAMA SEKOLAH','JENJANG','TIPE SEKOLAH','DESA','KECAMATAN','TOILET BAIK','TOILET RUSAK SEDANG','TOILET RUSAK BERAT','TOTAL TOILET','LIHAT DETAIL'].map((title) => (
                <th key={title} className={styles.tableHeaderCell}>{title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schoolData.slice(0, displayCount).map((school) => (
              <tr key={school.no} className={styles.tableRow}>
                <td className={styles.tableCell}>{school.no}</td>
                <td className={styles.tableCell}>{school.npsn}</td>
                <td className={styles.tableCell}>{school.nama}</td>
                <td className={styles.tableCell}>{school.jenjang}</td>
                <td className={styles.tableCell}>{school.tipe}</td>
                <td className={styles.tableCell}>{school.desa}</td>
                <td className={styles.tableCell}>{school.kecamatan}</td>
                <td className={styles.tableCellCenter}>{school.toiletBaik}</td>
                <td className={styles.tableCellCenter}>{school.toiletRusakSedang}</td>
                <td className={styles.tableCellCenter}>{school.toiletRusakBerat}</td>
                <td className={styles.tableCellCenter}>{school.totalToilet}</td>
                <td className={styles.tableCell}>
                  <button onClick={() => setCurrentView('detail')} className={styles.detailButton}>Detail</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return <div>{currentView === 'main' ? renderMainView() : null}</div>;
};

export default FacilitiesPage;
