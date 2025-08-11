import React from 'react';
import StatCard from '../../components/dashboard/StatCard/StatCard';
import { FaSchool, FaUsers } from 'react-icons/fa';

export default function Dashboard() {
  return (
    <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 20 }}>
      <StatCard title="Jumlah Sekolah" value="45" icon={<FaSchool size={40} />} color="#4caf50" />
      <StatCard title="Jumlah Siswa" value="1200" icon={<FaUsers size={40} />} color="#2196f3" />
      {/* Tambah card lain sesuai kebutuhan */}
    </div>
  );
}
