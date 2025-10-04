// final_check.js - VERSI BARU SESUAI STRUKTUR JSON

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- KONFIGURASI ---
// Ganti dengan URL dan Key Supabase proyek Anda
const SUPABASE_URL = 'https://zpdxdwzervdhlpodrmep.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpwZHhkd3plcnZkaGxwb2RybWVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NjEwNzEsImV4cCI6MjA3MjEzNzA3MX0.nsQz7DpqWV4z4c6_V9Lr01MUSqoN-K-KcqnB3OYhcvM';  
// --- SELESAI KONFIGURASI ---

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const dataFolderPath = path.join(process.cwd(), 'public', 'data');

// Fungsi untuk membaca sekolah pertama dari sebuah file dengan struktur baru
function getFirstSchool(fileName) {
  try {
    const filePath = path.join(dataFolderPath, fileName);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const dataByKecamatan = JSON.parse(fileContent);
    
    // Ambil nama kecamatan pertama
    const namaKecamatan = Object.keys(dataByKecamatan)[0];
    if (!namaKecamatan) return null;

    // Ambil array sekolah dari kecamatan tersebut
    const schoolsInKecamatan = dataByKecamatan[namaKecamatan];
    if (!schoolsInKecamatan || schoolsInKecamatan.length === 0) return null;
    
    const school = schoolsInKecamatan.find(s => s.npsn);
    if (school) {
        // Tambahkan properti kecamatan ke objek sekolah
        school.kecamatan = namaKecamatan;
    }
    return school || null;

  } catch (e) {
    console.error(`Gagal membaca file ${fileName}: ${e.message}`);
    return null;
  }
}

async function runFinalCheck() {
  if (!SUPABASE_URL || SUPABASE_URL === 'URL_SUPABASE_ANDA') {
    console.error('ERROR: Harap isi SUPABASE_URL dan SUPABASE_ANON_KEY di dalam skrip.');
    return;
  }

  const schoolToTest = getFirstSchool('sd_new.json');

  if (!schoolToTest) {
    console.error('Tidak dapat menemukan data sekolah valid di sd_new.json untuk diuji.');
    return;
  }

  // Menghilangkan spasi kosong tersembunyi
  const npsn = String(schoolToTest.npsn).trim();
  const kecamatan = String(schoolToTest.kecamatan).trim();

  console.log('--- MEMULAI PEMERIKSAAN FINAL ---');
  console.log(`Menggunakan data dari sd_new.json:`);
  console.log(`- NPSN: "${npsn}"`);
  console.log(`- Kecamatan Seharusnya: "${kecamatan}"\n`);

  // 1. Ambil data SEBELUM update
  console.log('Langkah 1: Mengambil data dari Supabase SEBELUM diubah...');
  const { data: beforeData, error: beforeError } = await supabase
    .from('schools')
    .select('id, name, npsn, kecamatan')
    .eq('npsn', npsn)
    .single(); // Menggunakan .single() untuk hasil yang lebih bersih

  if (beforeError) {
    console.error('\n--- HASIL GAGAL ---');
    console.error('Gagal saat mencoba MEMBACA (SELECT) data:', beforeError.message);
    return;
  }

  if (!beforeData) {
    console.error('\n--- HASIL GAGAL ---');
    console.error(`Sekolah dengan NPSN ${npsn} tidak ditemukan di database.`);
    return;
  }

  console.log('Data Ditemukan. Kecamatan saat ini:', `"${beforeData.kecamatan}"\n`);

  // 2. Coba lakukan UPDATE
  console.log(`Langkah 2: Mencoba mengubah data kecamatan menjadi "${kecamatan}"...`);
  const { data: updateData, error: updateError } = await supabase
    .from('schools')
    .update({ kecamatan: kecamatan })
    .eq('npsn', npsn)
    .select();

  if (updateError) {
    console.error('\n--- HASIL GAGAL ---');
    console.error('Gagal saat mencoba MENGUBAH (UPDATE) data.');
    console.error('Pesan Error dari Supabase:', updateError);
    return;
  }

  if (!updateData || updateData.length === 0) {
    console.error('\n--- HASIL GAGAL ---');
    console.error('Operasi UPDATE berjalan tanpa error, TAPI tidak ada baris yang berhasil diubah.');
    return;
  }

  console.log('\n--- BERHASIL! ---');
  console.log('Data sekolah setelah diubah:');
  console.log(updateData[0]);
  console.log('------------------');
}

runFinalCheck();