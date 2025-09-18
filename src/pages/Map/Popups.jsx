// src/pages/Map/Popups.jsx (PERBAIKAN LENGKAP)
import React from 'react';
import { Hash, MapPin } from 'lucide-react';
import { FACILITY_COLORS } from '../../config/mapConstants';

// Menggunakan React.memo untuk optimisasi performa
export const SummaryPopup = React.memo(({ title, stats }) => (
    <div style={{ width: 240, fontFamily: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` }}>
        <div style={{ borderBottom: '1px solid #eee', paddingBottom: '8px', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{title}</h3>
        </div>
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f7f7f7', padding: '8px 12px', borderRadius: '6px', marginBottom: '4px' }}>
                <span style={{ fontSize: '0.9rem' }}>Total Sekolah</span>
                <strong style={{ fontSize: '1.2rem' }}>{stats.total}</strong>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px', fontSize: '0.85rem' }}>
                {stats.rusakBerat > 0 && <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: FACILITY_COLORS['Rusak Berat'], marginRight: 8 }}></span>Rusak Berat: <strong style={{ marginLeft: 'auto' }}>{stats.rusakBerat}</strong></div>}
                {stats.kekuranganRKB > 0 && <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: FACILITY_COLORS['Kekurangan RKB'], marginRight: 8 }}></span>Kurang RKB: <strong style={{ marginLeft: 'auto' }}>{stats.kekuranganRKB}</strong></div>}
                {stats.rusakSedang > 0 && <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: FACILITY_COLORS['Rusak Sedang'], marginRight: 8 }}></span>Rusak Sedang: <strong style={{ marginLeft: 'auto' }}>{stats.rusakSedang}</strong></div>}
                {stats.baik > 0 && <div style={{ display: 'flex', alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: FACILITY_COLORS['Baik/Rehabilitasi'], marginRight: 8 }}></span>Baik/Rehab: <strong style={{ marginLeft: 'auto' }}>{stats.baik}</strong></div>}
            </div>
        </div>
    </div>
));

export const SchoolPopup = React.memo(({ school }) => (
    <div style={{ width: 240, fontFamily: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, lineHeight: 1.3, marginRight: 8 }}>{school.nama}</h3>
            <span style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '0.75rem', color: 'white', backgroundColor: '#6b7280' }}>{school.jenjang}</span>
        </div>
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: '#555' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Hash size={14} /><span>NPSN: {school.npsn || '-'}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><MapPin size={14} /><span>{school.village}, {school.kecamatan}</span></div>
        </div>
    </div>
));