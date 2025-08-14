import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard = () => {
  // Data untuk grafik pertama - Top 20 Desa
  const topDesaData = [
    { name: 'Sukamulya (Talegong)', value: 19, label: '19' },
    { name: 'Jayaraga (Tarogong Kidul)', value: 18, label: '18' },
    { name: 'Jatimulya (Pameungpeuk)', value: 17, label: '17' },
    { name: 'Sindangsari (Leuwigoong)', value: 16, label: '16' },
    { name: 'Mekarwangi (Cihurip)', value: 15, label: '15' },
    { name: 'Sancang (Cibalong)', value: 13, label: '13' },
    { name: 'Simajaya (Cisurupan)', value: 13, label: '13' },
    { name: 'Sukarame (Caringin)', value: 12, label: '12' },
    { name: 'Pamalayan (Cikelet)', value: 12, label: '12' },
    { name: 'Sukajaya (Cisewu)', value: 12, label: '12' }
  ];

  // Data untuk grafik kedua - Top 5 Kecamatan
  const topKecamatanData = [
    { name: 'Cisurupan (PAUD)', value: 18, category: 'PAUD', color: '#ff6b6b' },
    { name: 'Sukawening (PAUD)', value: 15, category: 'PAUD', color: '#ff6b6b' },
    { name: 'Talegong (PAUD)', value: 14, category: 'PAUD', color: '#ff6b6b' },
    { name: 'Leuwigoong (SD)', value: 70, category: 'SD', color: '#4ecdc4' },
    { name: 'Cikelet (SD)', value: 66, category: 'SD', color: '#4ecdc4' },
    { name: 'Kadungora (SMP)', value: 54, category: 'SMP', color: '#ffe66d' },
    { name: 'Caringin (SMP)', value: 48, category: 'SMP', color: '#ffe66d' },
    { name: 'Bungbulang (SMP)', value: 27, category: 'SMP', color: '#ffe66d' },
    { name: 'Pasirwangi (PKBM)', value: 18, category: 'PKBM', color: '#a8e6cf' },
    { name: 'Cilawu (PKBM)', value: 17, category: 'PKBM', color: '#a8e6cf' }
  ];

  // Data untuk kondisi sekolah
  const kondisiSekolahData = {
    PAUD: {
      totalKelas: 2167,
      kondisiBaik: 874,
      rusakSedang: 1098,
      rusakBerat: 1147,
      kurangRKB: 204
    },
    SD: {
      totalKelas: 9807,
      kondisiBaik: 6309,
      rusakSedang: 2315,
      rusakBerat: 1147,
      kurangRKB: 1950
    },
    SMP: {
      totalKelas: 3677,
      kondisiBaik: 2666,
      rusakSedang: 701,
      rusakBerat: 1012,
      kurangRKB: 444
    },
    PKBM: {
      totalKelas: 379,
      kondisiBaik: 191,
      rusakSedang: 20,
      rusakBerat: 0,
      kurangRKB: 0
    }
  };

  // Data untuk intervensi ruang kelas
  const intervensiData = {
    PAUD: { rehab: 29, pembangunan: 18 },
    SD: { rehab: 192, pembangunan: 6 },
    SMP: { rehab: 127, pembangunan: 5 },
    PKBM: { rehab: 2, pembangunan: 5 }
  };

  const [selectedJenjang, setSelectedJenjang] = useState('Semua Jenjang');
  const [selectedKecamatan, setSelectedKecamatan] = useState('Semua Kecamatan');
  const [selectedTipe, setSelectedTipe] = useState('Rusak Berat');
  const [jumlah, setJumlah] = useState(20);
  const [urutan, setUrutan] = useState('Teratas');

  // Fungsi untuk mendapatkan tinggi bar yang proporsional
  const getBarHeight = (value, maxValue, baseHeight = 200) => {
    return Math.max((value / maxValue) * baseHeight, 2);
  };

  const maxKondisiValue = Math.max(
    ...Object.values(kondisiSekolahData).map(data => data.totalKelas)
  );

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f8fafc',
      fontFamily: 'Arial, sans-serif',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>Dashboard</h1>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',  // diubah dari 4 ke 5 kolom agar muat 5 item
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>TOTAL PAUD</span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 4V6C15 7.1 14.1 8 13 8S11 7.1 11 6V4L5 7V9C5 10.1 5.9 11 7 11S9 10.1 9 9V15L15 12V9C15 10.1 15.9 11 17 11S19 10.1 19 9Z"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>2567</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>TOTAL SD</span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L2 12H5V20H19V12H22L12 3ZM12 8.75C12.69 8.75 13.25 9.31 13.25 10S12.69 11.25 12 11.25 10.75 10.69 10.75 10 11.31 8.75 12 8.75ZM7 18V12.5L12 8.5L17 12.5V18H7Z"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>1540</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>TOTAL SMP</span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#8b5cf6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3L1 9L5 11.18V17.18L12 21L19 17.18V11.18L21 10.09V17H23V9L12 3ZM18.82 9L12 12.72L5.18 9L12 5.28L18.82 9ZM17 16L12 18.72L7 16V12.27L12 15L17 12.27V16Z"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>421</div>
        </div>

        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>TOTAL PKBM</span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#06b6d4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 4C16.55 4 17 4.45 17 5V9.5L20.5 13L17 16.5V21C17 21.55 16.55 22 16 22H8C7.45 22 7 21.55 7 21V16.5L3.5 13L7 9.5V5C7 4.45 7.45 4 8 4H16ZM15 6H9V10L5.5 13.5L9 17V20H15V17L18.5 13.5L15 10V6Z"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>314</div>
        </div>

        {/* Tambahan Tenaga Pendidik */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '500' }}>TENAGA PENDIDIK</span>
            <div style={{
              width: '30px',
              height: '30px',
              borderRadius: '6px',
              backgroundColor: '#22c55e',  // warna hijau sebagai pembeda
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e293b' }}>--</div> {/* Ganti -- dengan data sebenarnya jika ada */}
        </div>
      </div>


      {/* Charts Section - Kondisi Sekolah dan Intervensi */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Kondisi Sekolah Chart */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '3px solid #4f46e5',
          borderTop: '8px solid #4f46e5',
          position: 'relative'
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            fontSize: '16px',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            Kondisi Sekolah berdasarkan Ruang Kelas:
          </h3>
          
          {/* Legend */}
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap',
            gap: '15px',
            marginBottom: '20px',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#8b5cf6' }}></div>
              <span>Total Kelas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#22d3ee' }}></div>
              <span>Kondisi Baik</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#fbbf24' }}></div>
              <span>Rusak Sedang</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#f87171' }}></div>
              <span>Rusak Berat</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#fef08a' }}></div>
              <span>Kurang RKB</span>
            </div>
          </div>

          {/* Y-axis labels */}
          <div style={{ 
            position: 'absolute', 
            left: '10px', 
            top: '80px',
            height: '220px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#64748b'
          }}>
            <span>12.000</span>
            <span>10.000</span>
            <span>8.000</span>
            <span>6.000</span>
            <span>4.000</span>
            <span>2.000</span>
            <span>0</span>
          </div>

          {/* Chart */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'end',
            justifyContent: 'space-around',
            height: '280px',
            padding: '20px 30px 20px 40px',
            marginLeft: '20px'
          }}>
            {Object.entries(kondisiSekolahData).map(([jenjang, data]) => (
              <div key={jenjang} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}>
                {/* Bars Container */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'end',
                  gap: '3px',
                  height: '220px'
                }}>
                  {/* Total Kelas */}
                  <div style={{
                    width: '18px',
                    height: `${getBarHeight(data.totalKelas, maxKondisiValue)}px`,
                    backgroundColor: '#8b5cf6',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }}>
                      {data.totalKelas}
                    </span>
                  </div>

                  {/* Kondisi Baik */}
                  <div style={{
                    width: '18px',
                    height: `${getBarHeight(data.kondisiBaik, maxKondisiValue)}px`,
                    backgroundColor: '#22d3ee',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }}>
                      {data.kondisiBaik}
                    </span>
                  </div>

                  {/* Rusak Sedang */}
                  <div style={{
                    width: '18px',
                    height: `${getBarHeight(data.rusakSedang, maxKondisiValue)}px`,
                    backgroundColor: '#fbbf24',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }}>
                      {data.rusakSedang}
                    </span>
                  </div>

                  {/* Rusak Berat */}
                  <div style={{
                    width: '18px',
                    height: `${getBarHeight(data.rusakBerat, maxKondisiValue)}px`,
                    backgroundColor: '#f87171',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }}>
                      {data.rusakBerat}
                    </span>
                  </div>

                  {/* Kurang RKB */}
                  <div style={{
                    width: '18px',
                    height: `${getBarHeight(data.kurangRKB, maxKondisiValue)}px`,
                    backgroundColor: '#fef08a',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }}>
                      {data.kurangRKB}
                    </span>
                  </div>
                </div>

                {/* Label */}
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1e293b',
                  textAlign: 'center'
                }}>
                  {jenjang}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Intervensi Chart */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          border: '3px solid #4f46e5',
          borderTop: '8px solid #4f46e5',
          position: 'relative'
        }}>
          <h3 style={{ 
            margin: '0 0 15px 0', 
            fontSize: '16px',
            fontWeight: '600',
            color: '#1e293b'
          }}>
            Intervensi Ruang Kelas Berdasarkan Kategori Sekolah
          </h3>
          
          {/* Legend */}
          <div style={{ 
            display: 'flex', 
            gap: '20px',
            marginBottom: '20px',
            fontSize: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#22c55e' }}></div>
              <span>Rehab Ruang Kelas</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '12px', height: '12px', backgroundColor: '#3b82f6' }}></div>
              <span>Pembangunan RKB</span>
            </div>
          </div>

          {/* Y-axis labels */}
          <div style={{ 
            position: 'absolute', 
            left: '10px', 
            top: '80px',
            height: '220px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#64748b'
          }}>
            <span>250</span>
            <span>200</span>
            <span>150</span>
            <span>100</span>
            <span>50</span>
            <span>0</span>
          </div>

          {/* Chart */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'end',
            justifyContent: 'space-around',
            height: '280px',
            padding: '20px 30px 20px 40px',
            marginLeft: '20px'
          }}>
            {Object.entries(intervensiData).map(([jenjang, data]) => (
              <div key={jenjang} style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px'
              }}>
                {/* Bars Container */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'end',
                  gap: '8px',
                  height: '220px'
                }}>
                  {/* Rehab */}
                  <div style={{
                    width: '30px',
                    height: `${Math.max((data.rehab / 200) * 200, 8)}px`,
                    backgroundColor: '#22c55e',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }}>
                      {data.rehab}
                    </span>
                  </div>

                  {/* Pembangunan */}
                  <div style={{
                    width: '30px',
                    height: `${Math.max((data.pembangunan / 200) * 200, 8)}px`,
                    backgroundColor: '#3b82f6',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center'
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-20px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#1e293b'
                    }}>
                      {data.pembangunan}
                    </span>
                  </div>
                </div>

                {/* Label */}
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1e293b',
                  textAlign: 'center'
                }}>
                  {jenjang}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Section untuk Top Kecamatan */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Tampilkan Grafik:</label>
          <select style={{ 
            padding: '8px 12px', 
            borderRadius: '6px', 
            border: '1px solid #d1d5db',
            fontSize: '14px' 
          }} defaultValue="Rusak Berat">
            <option>Rusak Berat</option>
            <option>Rusak Sedang</option>
            <option>Kurang RKB</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Jumlah:</label>
          <input 
            type="number" 
            defaultValue={5} 
            min="1" 
            max="20"
            style={{ 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db',
              fontSize: '14px',
              width: '80px'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Urutan:</label>
          <select style={{ 
            padding: '8px 12px', 
            borderRadius: '6px', 
            border: '1px solid #d1d5db',
            fontSize: '14px' 
          }} defaultValue="Teratas">
            <option>Teratas</option>
            <option>Terbawah</option>
          </select>
        </div>
      </div>

      {/* Top Kecamatan Chart */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h2 style={{ 
          margin: '0 0 15px 0', 
          fontSize: '18px',
          fontWeight: '600',
          color: '#1e293b'
        }}>
          Top 5 Kecamatan dengan Kelas Rusak Berat Terbanyak per Jenjang
        </h2>
        <div style={{ 
          display: 'flex', 
          gap: '20px',
          marginBottom: '20px',
          fontSize: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#ff6b6b' }}></div>
            <span>PAUD</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#4ecdc4' }}></div>
            <span>SD</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#ffe66d' }}></div>
            <span>SMP</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: '#a8e6cf' }}></div>
            <span>PKBM</span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <ResponsiveContainer
            width={Math.min(topKecamatanData.length * 50, window.innerWidth * 0.95)}
            height={400}
          >
            <BarChart
              data={topKecamatanData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
              barSize={30}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 80]} />
              <YAxis type="category" dataKey="name" width={140} fontSize={12} />
              <Tooltip />
              <Bar dataKey="value">
                {topKecamatanData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter Section untuk Top Desa */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Jenjang:</label>
          <select 
            value={selectedJenjang} 
            onChange={(e) => setSelectedJenjang(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db',
              fontSize: '14px',
              minWidth: '150px'
            }}
          >
            <option>Semua Jenjang</option>
            <option>PAUD</option>
            <option>SD</option>
            <option>SMP</option>
            <option>PKBM</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Kecamatan:</label>
          <select 
            value={selectedKecamatan} 
            onChange={(e) => setSelectedKecamatan(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db',
              fontSize: '14px',
              minWidth: '180px'
            }}
          >
            <option>Semua Kecamatan</option>
            <option>Banjarwangi</option>
            <option>Banyuresmi</option>
            <option>Bayongbong</option>
            <option>Blubur Limbangan</option>
            <option>Caringin</option>
            <option>Cibalong</option>
            <option>Cibatu</option>
            <option>Cibolang</option>
            <option>Cibuntu</option>
            <option>Cigalontang</option>
            <option>Cikajang</option>
            <option>Cikelet</option>
            <option>Cilengkrang</option>
            <option>Cilawu</option>
            <option>Cisewu</option>
            <option>Cisompet</option>
            <option>Cisurupan</option>
            <option>Garut Kota</option>
            <option>Karangpawitan</option>
            <option>Kersamanah</option>
            <option>Leles</option>
            <option>Lembang</option>
            <option>Leuwigoong</option>
            <option>Malangbong</option>
            <option>Melong</option>
            <option>Pamulihan</option>
            <option>Pameungpeuk</option>
            <option>Pasirwangi</option>
            <option>Singajaya</option>
            <option>Sukaresmi</option>
            <option>Sukawening</option>
            <option>Sukawingi</option>
            <option>Talegong</option>
            <option>Tarogong Kaler</option>
            <option>Tarogong Kidul</option>
            <option>Wanaraja</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Tipe:</label>
          <select 
            value={selectedTipe} 
            onChange={(e) => setSelectedTipe(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
          >
            <option>Rusak Berat</option>
            <option>Rusak Sedang</option>
            <option>Kurang RKB</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Jumlah:</label>
          <input
            type="number"
            value={jumlah}
            onChange={(e) => setJumlah(Number(e.target.value))}
            min={1}
            max={100}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db',
              fontSize: '14px',
              width: '80px'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Urutan:</label>
          <select 
            value={urutan} 
            onChange={(e) => setUrutan(e.target.value)}
            style={{ 
              padding: '8px 12px', 
              borderRadius: '6px', 
              border: '1px solid #d1d5db',
              fontSize: '14px'
            }}
          >
            <option>Teratas</option>
            <option>Terbawah</option>
          </select>
        </div>
      </div>

      {/* Top Desa Chart */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ 
          margin: '0 0 20px 0', 
          fontSize: '18px',
          fontWeight: '600',
          color: '#1e293b'
        }}>
          Top {jumlah} Desa dengan Kelas Rusak Berat Terbanyak per Jenjang
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart
            data={topDesaData.slice(0, jumlah)}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
            barSize={30}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 20]} />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              fontSize={12}
              interval={0}
              tick={{ fill: '#555' }}
            />
            <Tooltip />
            <Bar dataKey="value" fill="#4ecdc4" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Dashboard;