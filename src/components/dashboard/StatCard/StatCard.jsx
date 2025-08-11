// src/components/DashboardCards/StatCard.jsx
import React from 'react';

export default function StatCard({ title, value, icon, color }) {
  return (
    <div style={{
      backgroundColor: color || '#fff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      color: '#fff',
    }}>
      <div>{icon}</div>
      <div>
        <h4 style={{ margin: 0 }}>{title}</h4>
        <p style={{ fontSize: '1.5rem', margin: 0 }}>{value}</p>
      </div>
    </div>
  );
}
