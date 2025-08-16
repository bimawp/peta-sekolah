import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

const Dashboard = () => {
  const [selectedJenjang, setSelectedJenjang] = useState('Semua Jenjang');
  const [selectedKecamatan, setSelectedKecamatan] = useState('Semua Kecamatan');
  const [selectedTipe, setSelectedTipe] = useState('Rusak Berat');
  const [jumlah, setJumlah] = useState(20);

  const intervensiData = {
    PAUD: { rehab: 0, pembangunan: 0 },
    SD: { rehab: 0, pembangunan: 0 },
    SMP: { rehab: 0, pembangunan: 0 },
    PKBM: { rehab: 0, pembangunan: 0 }
  };

  const topKecamatanData = [
    { name: '', value: 0, color: '#ff6b6b' },
    { name: '', value: 0, color: '#4ecdc4' },
    { name: '', value: 0, color: '#ffe66d' },
    { name: '', value: 0, color: '#a8e6cf' },
    { name: '', value: 0, color: '#ff9f1c' }
  ];

  const topDesaData = Array.from({ length: 20 }, (_, i) => ({ name: '', value: 0 }));

  const renderIntervensiChart = (title, barColor) => {
    const chartHeight = 180;
    const maxVal = 250;
    const step = 50;
    const lines = Array.from({ length: maxVal / step + 1 }, (_, i) => i * step);

    return (
      <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '16px', fontWeight: '600', color: '#1e293b' }}>{title}</h3>

        {/* Chart Container */}
        <div style={{ position: 'relative', height: `${chartHeight}px`, borderLeft: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', paddingLeft: '30px' }}>
          {/* Garis horizontal + angka */}
          {lines.map((val) => {
            const bottomPos = (val / maxVal) * chartHeight;
            return (
              <div key={val} style={{ position: 'absolute', bottom: `${bottomPos}px`, left: 0, width: '100%', borderTop: '1px dashed #e2e8f0' }}>
                <span style={{
                  position: 'absolute',
                  left: '-25px',
                  fontSize: '10px',
                  color: '#64748b',
                  transform: 'translateY(-50%)'
                }}>{val}</span>
              </div>
            );
          })}

          {/* Batang */}
          <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '100%' }}>
            {['PAUD','SD','SMP','PKBM'].map(j => (
              <div key={j} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '30px', height: '0px', backgroundColor: barColor, borderRadius: '4px' }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Label jenjang */}
        <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '10px' }}>
          {['PAUD','SD','SMP','PKBM'].map(j => (
            <div key={j} style={{ fontSize: '12px', fontWeight: '600', color: '#1e293b', textAlign: 'center', width: '30px' }}>
              {j}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
  <div style={{ padding: '20px', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
    {/* Header Dashboard */}
      <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1f2937' }}>Dashboard</h1>
      </div>

    {/* Dashboard Stat (Summary Cards) */}
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', marginBottom: '30px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        {['TOTAL PAUD', 'TOTAL SD', 'TOTAL SMP', 'TOTAL PKBM', 'TENAGA PENDIDIK'].map((label, idx) => (
          <div key={idx} style={{ backgroundColor: '#f1f5f9', padding: '15px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '14px', fontWeight: '500', color: '#64748b' }}>{label}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{/* kosong */}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Intervensi & Kondisi side by side */}
    <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', marginBottom: '40px' }}>
      {renderIntervensiChart('Intervensi Ruang Kelas Berdasarkan Kategori Sekolah', '#22c55e')}
      {renderIntervensiChart('Kondisi Sekolah berdasarkan Ruang Kelas', '#3b82f6')}
    </div>

    {/* Top Kecamatan Chart */}
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', marginBottom: '30px' }}>
      <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
        Top 5 Kecamatan dengan Kelas Rusak Berat Terbanyak per Jenjang
      </h2>
      <div style={{ overflowX: 'auto' }}>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={topKecamatanData} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 5 }} barSize={30}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 80]} />
            <YAxis type="category" dataKey="name" width={140} fontSize={12} />
            <Tooltip />
            <Bar dataKey="value">
              {topKecamatanData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || '#ccc'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>

    {/* Top Desa Chart */}
    <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
        Top {jumlah} Desa dengan Kelas Rusak Berat Terbanyak (Semua Jenjang, Semua Kecamatan)
      </h2>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={topDesaData.slice(0, jumlah)} layout="vertical" margin={{ top: 20, right: 30, left: 150, bottom: 5 }} barSize={30}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, 20]} />
          <YAxis type="category" dataKey="name" width={150} fontSize={12} interval={0} tick={{ fill: '#555' }} />
          <Tooltip />
          <Bar dataKey="value" fill="#4ecdc4" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

};

export default Dashboard;
