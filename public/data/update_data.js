import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// =================================================================
// PENTING: Isi dengan URL dan KUNCI SERVICE_ROLE Anda
// =================================================================
const supabaseUrl = 'https://zpdxdwzervdhlpodrmep.supabase.co';
// GANTI DENGAN KUNCI SERVICE_ROLE YANG SUDAH ANDA SALIN
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZHhkd3plcnZkaGxwb2RybWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjEwNzEsImV4cCI6MjA3MjEzNzA3MX0.nsQz7DpqWV4z4c6_V9Lr01MUSqoN-K-KcqnB3OYhcvM';
// =================================================================

// Cek konfigurasi sebelum berjalan
if (supabaseKey.includes('MASUKKAN') || supabaseKey.length < 100) {
    console.error("\n[GAGAL] Harap isi supabaseKey dengan KUNCI SERVICE_ROLE yang benar di dalam file update_data.js.\n");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const dataFiles = [
    { level: 'PAUD', path: 'paud.json' },
    { level: 'SD', path: 'sd_new.json' },
    { level: 'SMP', path: 'smp.json' },
    { level: 'PKBM', path: 'pkbm.json' },
];

async function importAllData() {
    console.log('Memulai proses impor data ke Supabase...');

    for (const fileInfo of dataFiles) {
        try {
            console.log(`\n-----------------------------------------`);
            console.log(`Membaca file: ${fileInfo.path}`);

            const filePath = path.join(path.resolve(), 'public', 'data', fileInfo.path);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const jsonData = JSON.parse(fileContent);

            let schools = [];
            // Logika cerdas untuk mendeteksi struktur data
            if (Array.isArray(jsonData)) {
                console.log('  Format terdeteksi: Array langsung.');
                schools = jsonData;
            } else if (typeof jsonData === 'object' && jsonData !== null) {
                console.log('  Format terdeteksi: Objek per kecamatan.');
                for (const districtName in jsonData) {
                    if (Array.isArray(jsonData[districtName])) {
                        schools.push(...jsonData[districtName]);
                    }
                }
            }

            if (schools.length === 0) {
                console.log('  Tidak ada data sekolah yang ditemukan dalam format yang dikenali.');
                continue;
            }
            
            console.log(`  Total ditemukan ${schools.length} data sekolah. Memulai proses unggah...`);
            let successCount = 0;
            let errorCount = 0;

            for (const school of schools) {
                const coords = school.coordinates; // Ambil properti 'coordinates'

                // Validasi data yang benar
                if (!school.npsn || !Array.isArray(coords) || coords.length !== 2) {
                    console.warn(`    [DILEWATI] Data tidak lengkap/format koordinat salah untuk: ${school.name || 'Tanpa Nama'}`);
                    errorCount++;
                    continue;
                }
                
                // Filter tambahan untuk data di luar Garut
                const lat = coords[0];
                const lng = coords[1];
                if (lat > -6.5 || lat < -8.0 || lng < 107.0 || lng > 108.5) {
                    console.warn(`    [DILEWATI] Koordinat di luar Garut untuk ${school.npsn}: [${lat}, ${lng}]`);
                    errorCount++;
                    continue;
                }

                const { data: newSchool, error: schoolError } = await supabase
                    .from('schools')
                    .insert({
                        name: school.name, npsn: school.npsn, address: school.address,
                        village: school.village, type: school.type,
                        level: fileInfo.level, 
                        latitude: lat,
                        longitude: lng,
                        student_count: school.student_count,
                    })
                    .select('id').single();

                if (schoolError || !newSchool) {
                    console.error(`    [GAGAL DB] Sekolah ${school.npsn}:`, schoolError?.message || 'Data tidak kembali');
                    errorCount++;
                    continue;
                }

                const classCond = school.class_condition || {};
                const { error: conditionError } = await supabase
                    .from('class_conditions')
                    .insert({
                        school_id: newSchool.id,
                        classrooms_good: classCond.classrooms_good || 0,
                        classrooms_moderate_damage: classCond.classrooms_moderate_damage || 0,
                        classrooms_heavy_damage: classCond.classrooms_heavy_damage || 0,
                        total_room: school.rombel?.kb || school.rombel?.total || classCond.total_room || 0,
                        lacking_rkb: classCond.lacking_rkb || 0,
                    });

                if (conditionError) {
                    console.error(`    [GAGAL DB] Kondisi untuk ${school.npsn}:`, conditionError.message);
                    errorCount++;
                } else {
                    successCount++;
                }
            }
            console.log(`  Selesai: ${successCount} berhasil diimpor, ${errorCount} gagal/dilewati.`);

        } catch (err) {
            console.error(`[ERROR FATAL] Gagal memproses file ${fileInfo.path}:`, err.message);
        }
    }
    console.log(`\n-----------------------------------------`);
    console.log('Semua proses impor telah selesai.');
}

importAllData();