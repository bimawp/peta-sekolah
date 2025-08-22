// SchoolDetailPage.jsx
import React, { useState, useEffect } from 'react';
import styles from './SchoolDetailPage.module.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import Map from '../Map/Map';

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
            labelLine
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

const BarChartComponent = ({ title, data, colors }) => (
  <div className={styles.container}>
    <h3 className={styles.title}>{title}</h3>
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 14 }}
            interval={0}
            angle={-20}
            textAnchor="end"
          />
          <YAxis />
          <Bar dataKey="value">
            {data.map((entry, index) => (
              <Cell
                key={`cell-bar-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const DataTable = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const filteredData = data.filter(school => {
    const namaSekolah = school.namaSekolah || school.nama_sekolah || school.school_name || school.nama || '';
    const npsn = school.npsn || school.school_id || school.id || '';
    
    return namaSekolah.toLowerCase().includes(searchTerm.toLowerCase()) ||
           npsn.toString().includes(searchTerm);
  });

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
        <button onClick={handleReset} style={{ backgroundColor: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer' }}>
          Reset Filter
        </button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Inter, Arial, sans-serif', tableLayout: 'fixed', minWidth: 900, background: 'white' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6', color: '#1e293b', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, borderBottom: '2px solid #3b82f6' }}>
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
              onClick={() => alert(`Detail sekolah: ${school.namaSekolah}`)}
            >
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.no || school.nomor || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.npsn || school.school_id || school.id || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.namaSekolah || school.nama_sekolah || school.school_name || school.nama || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.jenjang || school.tingkat_pendidikan || school.level || school.bentuk_pendidikan || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.tipeSekolah || school.tipe_sekolah || school.school_type || school.status || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.desa || school.kelurahan || school.desa_kelurahan || school.village || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kecamatan || school.kec || school.kecamatan_nama || school.subdistrict || '-'}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>
                {(school.kondisiKelas?.baik || school.kondisi_ruang_kelas?.baik || school.classroom_condition?.good || 0)}
              </td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>
                {(school.kondisiKelas?.rusakSedang || school.kondisi_ruang_kelas?.rusak_sedang || school.classroom_condition?.slightly_damaged || 0)}
              </td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>
                {(school.kondisiKelas?.rusakBerat || school.kondisi_ruang_kelas?.rusak_berat || school.classroom_condition?.heavily_damaged || 0)}
              </td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.kurangRKB || school.kurang_rkb || school.shortage_classrooms || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.rehabRuangKelas || school.rehab_ruang_kelas || school.classroom_rehabilitation || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.pembangunanRKB || school.pembangunan_rkb || school.classroom_construction || 0}</td>
              <td style={{ padding: '6px 3px', textAlign: 'left' }}>{school.intervensiRuangKelas || school.intervensi_ruang_kelas || school.classroom_intervention || 0}</td>
              <td style={{ textAlign: 'center' }}>
                <button className={styles.detailButton}>
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
            padding: '6px 12px', borderRadius: 6, border: 'none',
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
            padding: '6px 12px', borderRadius: 6, border: 'none',
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
  const [schoolData, setSchoolData] = useState([]);
  const [filterJenjang, setFilterJenjang] = useState('Semua Jenjang');
  const [filterKecamatan, setFilterKecamatan] = useState('Semua Kecamatan');
  const [filterDesa, setFilterDesa] = useState('Semua Desa');
  const [filteredData, setFilteredData] = useState([]);

  const [jenjangList, setJenjangList] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaByKecamatan, setDesaByKecamatan] = useState({});
  const [loading, setLoading] = useState(true);

  // === Load all data sources ===
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        console.log('Starting to load data from all sources...');

        // Define all data sources
        const dataSources = [
          { url: 'https://peta-sekolah.vercel.app/paud/data/paud.json', jenjang: 'PAUD', type: 'school' },
          { url: 'https://peta-sekolah.vercel.app/sd/data/sd_new.json', jenjang: 'SD', type: 'school' },
          { url: 'https://peta-sekolah.vercel.app/smp/data/smp.json', jenjang: 'SMP', type: 'school' },
          { url: 'https://peta-sekolah.vercel.app/pkbm/data/pkbm.json', jenjang: 'PKBM', type: 'school' },
          { url: 'https://peta-sekolah.vercel.app/paud/data/data_kegiatan.json', jenjang: 'PAUD', type: 'kegiatan' },
          { url: 'https://peta-sekolah.vercel.app/sd/data/data_kegiatan.json', jenjang: 'SD', type: 'kegiatan' },
          { url: 'https://peta-sekolah.vercel.app/smp/data/data_kegiatan.json', jenjang: 'SMP', type: 'kegiatan' },
          { url: 'https://peta-sekolah.vercel.app/pkbm/data/data_kegiatan.json', jenjang: 'PKBM', type: 'kegiatan' },
          { url: 'https://peta-sekolah.vercel.app/data/kecamatan.geojson', type: 'geo' },
          { url: 'https://peta-sekolah.vercel.app/data/desa.geojson', type: 'geo' }
        ];

        // Load all data with detailed logging
        let combinedSchoolData = [];
        let combinedKegiatanData = [];
        let kecamatanGeoJson = null;
        let desaGeoJson = null;

        for (const source of dataSources) {
          try {
            console.log(`Loading data from: ${source.url}`);
            const response = await fetch(source.url);
            
            if (!response.ok) {
              console.error(`Failed to fetch ${source.url}: ${response.status} ${response.statusText}`);
              continue;
            }

            const data = await response.json();
            console.log(`Successfully loaded ${source.url}, data type:`, typeof data, 'length:', Array.isArray(data) ? data.length : 'not array');

            if (source.type === 'school' && Array.isArray(data)) {
              // Add jenjang to school data
              const schoolsWithJenjang = data.map(school => ({
                ...school,
                jenjang: school.jenjang || school.tingkat_pendidikan || source.jenjang,
                namaSekolah: school.namaSekolah || school.nama_sekolah || school.school_name || school.nama,
                npsn: school.npsn || school.school_id || school.id
              }));
              combinedSchoolData = [...combinedSchoolData, ...schoolsWithJenjang];
              console.log(`Added ${schoolsWithJenjang.length} schools from ${source.jenjang}`);
            }
            
            else if (source.type === 'kegiatan' && Array.isArray(data)) {
              const kegiatanWithJenjang = data.map(kegiatan => ({
                ...kegiatan,
                jenjang: kegiatan.jenjang || source.jenjang,
                npsn: kegiatan.npsn || kegiatan.school_id || kegiatan.id
              }));
              combinedKegiatanData = [...combinedKegiatanData, ...kegiatanWithJenjang];
              console.log(`Added ${kegiatanWithJenjang.length} kegiatan from ${source.jenjang}`);
            }
            
            else if (source.type === 'geo') {
              if (source.url.includes('kecamatan')) {
                kecamatanGeoJson = data;
                console.log('Loaded kecamatan GeoJSON with', data.features?.length || 0, 'features');
              } else if (source.url.includes('desa')) {
                desaGeoJson = data;
                console.log('Loaded desa GeoJSON with', data.features?.length || 0, 'features');
              }
            }

          } catch (error) {
            console.error(`Error loading ${source.url}:`, error);
          }
        }

        console.log('Total combined school data:', combinedSchoolData.length);
        console.log('Total combined kegiatan data:', combinedKegiatanData.length);

        // Create a map of kegiatan data by NPSN for easy lookup
        const kegiatanMap = {};
        combinedKegiatanData.forEach(kegiatan => {
          const npsn = kegiatan.npsn || kegiatan.school_id || kegiatan.id;
          if (npsn) {
            kegiatanMap[npsn] = kegiatan;
          }
        });

        // Merge school data with kegiatan data
        const mergedSchoolData = combinedSchoolData.map((school, index) => {
          const npsn = school.npsn || school.school_id || school.id;
          const kegiatanData = kegiatanMap[npsn] || {};
          
          return {
            ...school,
            no: index + 1,
            namaSekolah: school.namaSekolah || school.nama_sekolah || school.school_name || school.nama || 'Tidak diketahui',
            npsn: npsn || 'Tidak ada',
            jenjang: school.jenjang || school.tingkat_pendidikan || 'Lainnya',
            tipeSekolah: school.tipeSekolah || school.tipe_sekolah || school.school_type || school.status || 'Negeri',
            desa: school.desa || school.kelurahan || school.desa_kelurahan || school.village || 'Tidak diketahui',
            kecamatan: school.kecamatan || school.kec || school.kecamatan_nama || school.subdistrict || 'Tidak diketahui',
            // Merge classroom condition data dengan default values
            kondisiKelas: {
              baik: parseInt(school.kondisiKelas?.baik || kegiatanData.kondisiKelas?.baik || 
                           school.classroom_condition?.good || kegiatanData.classroom_condition?.good || 0),
              rusakSedang: parseInt(school.kondisiKelas?.rusakSedang || kegiatanData.kondisiKelas?.rusakSedang || 
                                  school.classroom_condition?.slightly_damaged || kegiatanData.classroom_condition?.slightly_damaged || 0),
              rusakBerat: parseInt(school.kondisiKelas?.rusakBerat || kegiatanData.kondisiKelas?.rusakBerat || 
                                 school.classroom_condition?.heavily_damaged || kegiatanData.classroom_condition?.heavily_damaged || 0)
            },
            // Merge intervention data dengan default values
            rehabRuangKelas: parseInt(school.rehabRuangKelas || kegiatanData.rehabRuangKelas || 
                                    school.classroom_rehabilitation || kegiatanData.classroom_rehabilitation || 0),
            pembangunanRKB: parseInt(school.pembangunanRKB || kegiatanData.pembangunanRKB || 
                                   school.classroom_construction || kegiatanData.classroom_construction || 0),
            intervensiRuangKelas: parseInt(school.intervensiRuangKelas || kegiatanData.intervensiRuangKelas || 
                                         school.classroom_intervention || kegiatanData.classroom_intervention || 0),
            kurangRKB: parseInt(school.kurangRKB || kegiatanData.kurangRKB || 
                              school.shortage_classrooms || kegiatanData.shortage_classrooms || 0)
          };
        });

        console.log('Final merged school data:', mergedSchoolData.length);
        console.log('Sample merged data:', mergedSchoolData[0]);

        setSchoolData(mergedSchoolData);

        // Process geo data
        let kecamatanNames = [];
        if (kecamatanGeoJson && kecamatanGeoJson.features) {
          kecamatanNames = kecamatanGeoJson.features
            .map(feature => {
              const props = feature.properties;
              return props?.district || props?.NAMOBJ || props?.name || 
                     props?.kecamatan || props?.nama || props?.KECAMATAN || props?.kec;
            })
            .filter(name => name && name.trim() !== '')
            .sort();
        }

        // Get unique kecamatan names from school data as well
        const schoolKecamatanNames = mergedSchoolData
          .map(school => school.kecamatan)
          .filter(name => name && name.trim() !== '' && name !== 'Tidak diketahui');

        const allKecamatanNames = [...new Set([...kecamatanNames, ...schoolKecamatanNames])].sort();
        setKecamatanList(allKecamatanNames);

        // Extract desa names by kecamatan
        const desaMap = {};
        if (desaGeoJson && desaGeoJson.features) {
          desaGeoJson.features.forEach(feature => {
            const props = feature.properties;
            const kecamatan = props?.district || props?.KECAMATAN || props?.kecamatan || 
                             props?.kec || props?.NAMKEC || props?.kecamatan_nama;
            const desa = props?.village || props?.NAMOBJ || props?.name || props?.desa || 
                        props?.nama || props?.DESA || props?.kelurahan || props?.desa_kelurahan;
            
            if (kecamatan && desa) {
              if (!desaMap[kecamatan]) {
                desaMap[kecamatan] = new Set();
              }
              desaMap[kecamatan].add(desa);
            }
          });
        }

        // Add desa names from school data
        mergedSchoolData.forEach(school => {
          const kecamatan = school.kecamatan;
          const desa = school.desa;
          
          if (kecamatan && desa && kecamatan !== 'Tidak diketahui' && desa !== 'Tidak diketahui') {
            if (!desaMap[kecamatan]) {
              desaMap[kecamatan] = new Set();
            }
            desaMap[kecamatan].add(desa);
          }
        });

        // Convert Set to sorted arrays
        const desaObj = {};
        Object.keys(desaMap).forEach(kec => {
          desaObj[kec] = Array.from(desaMap[kec]).sort();
        });
        setDesaByKecamatan(desaObj);

        // Generate jenjang list
        const jenjangSet = new Set();
        mergedSchoolData.forEach(school => {
          if (school.jenjang) {
            jenjangSet.add(school.jenjang);
          }
        });
        
        setJenjangList(Array.from(jenjangSet).sort());

        console.log('Data loading completed:', {
          schools: mergedSchoolData.length,
          kegiatan: combinedKegiatanData.length,
          kecamatan: allKecamatanNames.length,
          jenjang: jenjangSet.size,
          desaByKecamatan: Object.keys(desaObj).length
        });

      } catch (error) {
        console.error('Error loading data:', error);
        
        // Fallback: set default values with sample data
        const sampleData = [
          {
            no: 1,
            npsn: '12345678',
            namaSekolah: 'Contoh Sekolah',
            jenjang: 'SD',
            tipeSekolah: 'Negeri',
            desa: 'Contoh Desa',
            kecamatan: 'Contoh Kecamatan',
            kondisiKelas: { baik: 5, rusakSedang: 2, rusakBerat: 1 },
            rehabRuangKelas: 1,
            pembangunanRKB: 0,
            intervensiRuangKelas: 1,
            kurangRKB: 2
          }
        ];
        
        setSchoolData(sampleData);
        setJenjangList(['PKBM', 'PAUD', 'SD', 'SMP']);
        setKecamatanList(['Contoh Kecamatan']);
        setDesaByKecamatan({ 'Contoh Kecamatan': ['Contoh Desa'] });
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  // Filter schoolData berdasarkan Jenjang, Kecamatan, Desa
  useEffect(() => {
    let data = [...schoolData];
    
    // Filter Jenjang
    if (filterJenjang !== 'Semua Jenjang') {
      data = data.filter(d => {
        const jenjang = d.jenjang || d.tingkat_pendidikan || d.level || d.bentuk_pendidikan;
        return jenjang === filterJenjang;
      });
    }
    
    // Filter Kecamatan
    if (filterKecamatan !== 'Semua Kecamatan') {
      data = data.filter(d => {
        const kecamatan = d.kecamatan || d.kec || d.kecamatan_nama || d.subdistrict;
        return kecamatan === filterKecamatan;
      });
    }
    
    // Filter Desa
    if (filterDesa !== 'Semua Desa') {
      data = data.filter(d => {
        const desa = d.desa || d.kelurahan || d.desa_kelurahan || d.village;
        return desa === filterDesa;
      });
    }
    
    setFilteredData(data);
  }, [schoolData, filterJenjang, filterKecamatan, filterDesa]);

  // Statistik untuk chart
  const totalSekolah = filteredData.length;
  
  const kondisiSemuaJenjang = filteredData.reduce((acc, curr) => {
    const kondisi = curr.kondisiKelas || curr.kondisi_ruang_kelas || curr.classroom_condition || {};
    
    acc.baik += kondisi.baik || kondisi.good || kondisi.bagus || 0;
    acc.rusakSedang += kondisi.rusakSedang || kondisi.rusak_sedang || kondisi.slightly_damaged || 0;
    acc.rusakBerat += kondisi.rusakBerat || kondisi.rusak_berat || kondisi.heavily_damaged || 0;
    
    return acc;
  }, { baik: 0, rusakSedang: 0, rusakBerat: 0 });
  
  const totalRehab = filteredData.reduce((acc, curr) => {
    const rehab = curr.rehabRuangKelas || curr.rehab_ruang_kelas || curr.classroom_rehabilitation || 0;
    return acc + rehab;
  }, 0);
  
  const totalIntervensi = filteredData.reduce((acc, curr) => {
    const intervensi = curr.intervensiRuangKelas || curr.intervensi_ruang_kelas || curr.classroom_intervention || 0;
    return acc + intervensi;
  }, 0);

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
        { name: "Pembangunan Dilakukan", value: totalIntervensi, color: "#4ECDC4" },
        { name: "Kebutuhan RKB", value: Math.max(totalSekolah - totalIntervensi, 0), color: "#FFD93D" },
        
      ],
    },
  ];

// 🔹 Bar Chart Kondisi Ruang Kelas
const barKondisiKelas = [
  { name: "Total Kelas", value: 0 },
  { name: "Kondisi Baik", value: 0 },
  { name: "Rusak Sedang", value: 0 },
  { name: "Rusak Berat", value: 0 },
  { name: "Kurang RKB", value: 0 },
];
// 🔹 Bar Chart Intervensi Ruang Kelas
const barIntervensiKelas = [
  { name: "Total Intervensi", value: 0 },
  { name: "Pembangunan RKB", value: 0 },
  { name: "Rehab Ruang Kelas", value: 0 },
];
  // Handler untuk reset filter desa ketika kecamatan berubah
  const handleKecamatanChange = (e) => {
    setFilterKecamatan(e.target.value);
    setFilterDesa('Semua Desa'); // Reset filter desa
  };
  // Reset semua filter
  const handleResetAllFilters = () => {
    setFilterJenjang('Semua Jenjang');
    setFilterKecamatan('Semua Kecamatan');
    setFilterDesa('Semua Desa');
  };

  if (loading) {
    return (
      <div style={{ 
        padding: 40, 
        textAlign: 'center', 
        backgroundColor: '#f3f4f6', 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div>
          <div style={{ fontSize: 18, color: '#374151' }}>Memuat data...</div>
          <div style={{ marginTop: 8, color: '#6b7280' }}>
            Mengambil data sekolah dari semua jenjang...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, backgroundColor: '#f3f4f6', minHeight: '100vh', fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
      {/* Header */}
      <div style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e5e7eb', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#1f2937' }}>Detail Sekolah</h1>
        <p style={{ margin: '8px 0 0 0', color: '#6b7280' }}>
          Total: {totalSekolah} sekolah | 
          Kecamatan: {kecamatanList.length} | 
          Jenjang: {jenjangList.length}
        </p>
      </div>

      {/* Filter Section */}
      <div className={styles.filterContainer}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Filter Data</h3>
          <button 
            onClick={handleResetAllFilters}
            style={{ 
              backgroundColor: '#ef4444', 
              color: 'white', 
              padding: '8px 16px', 
              borderRadius: 6, 
              border: 'none', 
              cursor: 'pointer',
              fontSize: 12
            }}
          >
            Reset Semua Filter
          </button>
        </div>
        
        <div className={styles.filterGroup}>
          <label>Filter Jenjang:</label>
          <select 
            className={styles.selectDropdown} 
            value={filterJenjang} 
            onChange={e => setFilterJenjang(e.target.value)}
          >
            <option>Semua Jenjang</option>
            {jenjangList.map((jenjang, idx) => (
              <option key={idx} value={jenjang}>{jenjang}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterGroup}>
          <label>Filter Kecamatan:</label>
          <select 
            className={styles.selectDropdown} 
            value={filterKecamatan} 
            onChange={handleKecamatanChange}
          >
            <option>Semua Kecamatan</option>
            {kecamatanList.map((kec, idx) => (
              <option key={idx} value={kec}>{kec}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.filterGroup}>
          <label>Filter Desa:</label>
          <select 
            className={styles.selectDropdown} 
            value={filterDesa} 
            onChange={e => setFilterDesa(e.target.value)}
            disabled={filterKecamatan === 'Semua Kecamatan'}
          >
            <option>Semua Desa</option>
            {filterKecamatan !== 'Semua Kecamatan' && 
             desaByKecamatan[filterKecamatan]?.map((desa, idx) => (
              <option key={idx} value={desa}>{desa}</option>
            ))}
          </select>
          {filterKecamatan === 'Semua Kecamatan' && (
            <small style={{ color: '#6b7280', marginLeft: 8 }}>
              Pilih kecamatan terlebih dahulu
            </small>
          )}
        </div>
      </div>

      {/* Map Section */}
      <section className={styles.section}>
        <h2 style={{
          fontSize: 20, fontWeight: 600,
          borderBottom: '3px solid #3b82f6',
          paddingBottom: 8, marginBottom: 16, color: '#1e40af'
        }}>
          Peta Lokasi Sekolah
        </h2>
        <div className={styles.mapContainer}>
          <Map 
            schools={schoolData} // data asli sekolah
            filter={{
              jenjang: filterJenjang,
              kecamatan: filterKecamatan,
              desa: filterDesa
            }} 
          />
        </div>
      </section>

      {/* Pie Charts Section */}
      <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        {pieDataList.map((pie, idx) => (
          <div key={idx} style={{ flex: '1 1 30%' }}>
            <PieChartComponent title={pie.title} data={pie.data} />
          </div>
        ))}
      </section>

      {/* Bar Charts Section */}
      <section style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 32 }}>
        <div style={{ flex: '1 1 48%' }}>
          <BarChartComponent
  title="Kondisi Ruang Kelas"
  data={barKondisiKelas}
  colors={["#4ECDC4", "#2ECC71", "#FFD93D", "#FF6B6B", "#9B59B6"]}
/>
        </div>
        <div style={{ flex: '1 1 48%' }}>
          <BarChartComponent
  title="Intervensi Ruang Kelas"
  data={barIntervensiKelas}
  colors={["#36A2EB", "#F39C12", "#8E44AD"]}
/>
        </div>
      </section>

      {/* Data Table Section */}
      <section>
        <DataTable data={filteredData} />
      </section>
    </div>
  );
};

export default SchoolDetailPage;