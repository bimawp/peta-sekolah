import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

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

  // Data untuk chart kondisi toilet
  const kondisiToiletData = [
    { name: 'Total', value: 5626, color: '#4ECDC4' },
    { name: 'Baik', value: 2594, color: '#4ECDC4' },
    { name: 'Rusak Sedang', value: 1824, color: '#FFD93D' },
    { name: 'Rusak Berat', value: 1208, color: '#FF6B6B' },
    { name: 'Tidak Ada Toilet', value: 1186, color: '#4ECDC4' }
  ];

  // Data untuk chart intervensi toilet
  const intervensiToiletData = [
    { name: 'Total Intervensi', value: 9, color: '#4A90E2' },
    { name: 'Pembangunan Toilet', value: 9, color: '#9B59B6' },
    { name: 'Rehab Toilet', value: 0, color: '#95A5A6' }
  ];

  // Data untuk pie charts
  const kondisiPieData = [
    { name: 'Baik', value: 46.1, color: '#4ECDC4' },
    { name: 'Rusak Sedang', value: 32.4, color: '#FFD93D' },
    { name: 'Rusak Berat', value: 21.5, color: '#FF6B6B' }
  ];

  const rehabilitasiPieData = [
    { name: 'Rusak Berat (Belum Direhab)', value: 100, color: '#FF6B6B' }
  ];

  const pembangunanPieData = [
    { name: 'Kebutuhan Toilet (Belum Dibangun)', value: 99.2, color: '#FFD93D' },
    { name: 'Pembangunan Dilakukan', value: 0.8, color: '#9B59B6' }
  ];

  const renderMainView = () => (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-gray-600">Cari Sekolah/NPSN:</span>
          <input 
            type="text" 
            placeholder="Cari nama sekolah atau NP"
            className="px-3 py-2 border border-gray-300 rounded-md w-64"
          />
          <span className="text-gray-600">Tampilkan jumlah baris:</span>
          <select 
            value={displayCount} 
            onChange={(e) => setDisplayCount(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
            Reset Filter
          </button>
        </div>
      </div>

      {/* 1. Pie Charts Row (Diagram Bulet) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Kondisi Toilet Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Kondisi Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={kondisiPieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {kondisiPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-teal-400"></div>
              <span className="text-sm">Baik</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400"></div>
              <span className="text-sm">Rusak Sedang</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400"></div>
              <span className="text-sm">Rusak Berat</span>
            </div>
          </div>
        </div>

        {/* Rehabilitasi Toilet Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Rehabilitasi Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={rehabilitasiPieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {rehabilitasiPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400"></div>
              <span className="text-sm">Rehab Dilakukan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400"></div>
              <span className="text-sm">Rusak Berat (Belum Direhab)</span>
            </div>
          </div>
        </div>

        {/* Pembangunan Toilet Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Pembangunan Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pembangunanPieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {pembangunanPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-400"></div>
              <span className="text-sm">Pembangunan Dilakukan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400"></div>
              <span className="text-sm">Kebutuhan Toilet (Belum Dibangun)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bar Charts Row (Diagram Batang) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Kondisi Toilet Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">Kondisi Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kondisiToiletData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4ECDC4">
                {kondisiToiletData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Intervensi Toilet Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-6 text-gray-800">Intervensi Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={intervensiToiletData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={12}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#4A90E2">
                {intervensiToiletData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Table (Tabel) */}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">NO</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">NPSN</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">NAMA SEKOLAH</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">JENJANG</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">TIPE SEKOLAH</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">DESA</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">KECAMATAN</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">TOILET BAIK</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">TOILET RUSAK SEDANG</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">TOILET RUSAK BERAT</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">TOTAL TOILET</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">LIHAT DETAIL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {schoolData.slice(0, displayCount).map((school) => (
              <tr key={school.no} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">{school.no}</td>
                <td className="px-4 py-3 text-sm">{school.npsn}</td>
                <td className="px-4 py-3 text-sm">{school.nama}</td>
                <td className="px-4 py-3 text-sm">{school.jenjang}</td>
                <td className="px-4 py-3 text-sm">{school.tipe}</td>
                <td className="px-4 py-3 text-sm">{school.desa}</td>
                <td className="px-4 py-3 text-sm">{school.kecamatan}</td>
                <td className="px-4 py-3 text-sm text-center">{school.toiletBaik}</td>
                <td className="px-4 py-3 text-sm text-center">{school.toiletRusakSedang}</td>
                <td className="px-4 py-3 text-sm text-center">{school.toiletRusakBerat}</td>
                <td className="px-4 py-3 text-sm text-center">{school.totalToilet}</td>
                <td className="px-4 py-3">
                  <button 
                    onClick={() => setCurrentView('detail')}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
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

  const renderDetailView = () => (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Detail Sekolah Lainnya - Kondisi Toilet</h2>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-sm">Admin</span>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter Jenjang:</span>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>Semua Jenjang</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter Kecamatan:</span>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>Semua Kecamatan</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filter Desa:</span>
            <select className="px-3 py-2 border border-gray-300 rounded-md text-sm">
              <option>Semua Desa</option>
            </select>
          </div>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600">
            Reset Semua Filter
          </button>
          <button 
            onClick={() => setCurrentView('main')}
            className="px-4 py-2 bg-gray-500 text-white rounded-md text-sm hover:bg-gray-600"
          >
            Kembali
          </button>
        </div>
      </div>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Kondisi Toilet Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Kondisi Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={kondisiPieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {kondisiPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-teal-400"></div>
              <span className="text-sm">Baik</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400"></div>
              <span className="text-sm">Rusak Sedang</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400"></div>
              <span className="text-sm">Rusak Berat</span>
            </div>
          </div>
        </div>

        {/* Rehabilitasi Toilet Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Rehabilitasi Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={rehabilitasiPieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {rehabilitasiPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400"></div>
              <span className="text-sm">Rehab Dilakukan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400"></div>
              <span className="text-sm">Rusak Berat (Belum Direhab)</span>
            </div>
          </div>
        </div>

        {/* Pembangunan Toilet Pie Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">Pembangunan Toilet</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pembangunanPieData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ value }) => `${value}%`}
              >
                {pembangunanPieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-400"></div>
              <span className="text-sm">Pembangunan Dilakukan</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400"></div>
              <span className="text-sm">Kebutuhan Toilet (Belum Dibangun)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {currentView === 'main' ? renderMainView() : renderDetailView()}
    </div>
  );
};

export default FacilitiesPage;