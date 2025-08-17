import React, { useState } from 'react'; 
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip, Legend
} from 'recharts';
import styles from './FacilitiesPage.module.css';

// Import komponen detail per jenjang
import SchoolDetailPaud from '../../components/schools/SchoolDetail/Paud/SchoolDetailPaud';
import SchoolDetailSd from '../../components/schools/SchoolDetail/Sd/SchoolDetailSd';
import SchoolDetailSmp from '../../components/schools/SchoolDetail/Smp/SchoolDetailSmp';
import SchoolDetailPkbm from '../../components/schools/SchoolDetail/Pkbm/SchoolDetailPkbm';

const FacilitiesPage = () => {
  const [currentView, setCurrentView] = useState('main');
  const [displayCount, setDisplayCount] = useState(10);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Data sekolah diinisialisasi kosong
  const [schoolData, setSchoolData] = useState([]);

  // Data Pie/Bar diinisialisasi kosong
  const [kondisiPieData, setKondisiPieData] = useState([]);
  const [rehabilitasiPieData, setRehabilitasiPieData] = useState([]);
  const [pembangunanPieData, setPembangunanPieData] = useState([]);
  const [kondisiToiletData, setKondisiToiletData] = useState([]);
  const [intervensiToiletData, setIntervensiToiletData] = useState([]);

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

      {/* Judul Halaman */}
      <div className={styles.sectionBox}>
        <h2 className={styles.pageTitle}>Detail Sekolah Lainnya - Kondisi Toilet</h2>
      </div>

      {/* Filter Diagram */}
      <div className={styles.sectionBox}>
        <div className={styles.filterRow}>
          <div>
            <label>Filter Jenjang:</label>
            <select>
              <option>Semua Jenjang</option>
              <option>PAUD</option>
              <option>SD</option>
              <option>SMP</option>
              <option>PKBM</option>
            </select>
          </div>
          <div>
            <label>Filter Kecamatan:</label>
            <select>
              <option>Semua Kecamatan</option>
            </select>
          </div>
          <div>
            <label>Filter Desa:</label>
            <select>
              <option>Semua Desa</option>
            </select>
          </div>
          <button>Reset Semua Filter</button>
        </div>
      </div>

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

      {/* Filter Tabel */}
      <div className={styles.sectionBox}>
        <div className={styles.filterRow}>
          <div>
            <label>Cari Sekolah/NPSN:</label>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="pkbm" />
          </div>
          <div>
            <label>Tampilkan jumlah baris:</label>
            <select value={displayCount} onChange={(e) => setDisplayCount(Number(e.target.value))}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <button onClick={() => setSearchQuery('')}>Reset Filter</button>
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
            {schoolData
              .filter(s => s.nama?.toLowerCase().includes(searchQuery.toLowerCase()) || s.npsn?.includes(searchQuery))
              .slice(0, displayCount)
              .map((school, index) => (
              <tr key={index} className={styles.tableRow}>
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
                  <button
                    onClick={() => {
                      setSelectedSchool(school);
                      setCurrentView('detail');
                    }}
                    className={styles.detailButton}
                  >
                    Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );

  // Render
  return (
    <div>
      {currentView === 'main' && renderMainView()}

      {currentView === 'detail' && selectedSchool && (() => {
        const jenjang = selectedSchool.jenjang;
        let DetailComponent = null;

        switch (jenjang) {
          case 'PAUD':
            DetailComponent = SchoolDetailPaud;
            break;
          case 'SD':
            DetailComponent = SchoolDetailSd;
            break;
          case 'SMP':
            DetailComponent = SchoolDetailSmp;
            break;
          case 'PKBM':
            DetailComponent = SchoolDetailPkbm;
            break;
          default:
            return null;
        }

        return <DetailComponent school={selectedSchool} onBack={() => setCurrentView('main')} />;
      })()}
    </div>
  );
};

export default FacilitiesPage;
