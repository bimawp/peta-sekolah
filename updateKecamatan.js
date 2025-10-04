// updateKecamatan.js - VERSI FINAL

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

const jsonFiles = [
  'paud.json',
  'sd_new.json',
  'smp.json',
  'pkbm.json'
];

async function updateKecamatanData() {
  if (!SUPABASE_URL || SUPABASE_URL === 'URL_SUPABASE_ANDA') {
    console.error('ERROR: Harap isi SUPABASE_URL dan SUPABASE_ANON_KEY di dalam skrip.');
    return;
  }

  console.log('Memulai proses update data kecamatan...');

  for (const fileName of jsonFiles) {
    const filePath = path.join(dataFolderPath, fileName);
    let totalUpdatedInFile = 0;

    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const dataByKecamatan = JSON.parse(fileContent);

      // Loop melalui setiap kecamatan di file JSON
      for (const namaKecamatan in dataByKecamatan) {
        if (dataByKecamatan.hasOwnProperty(namaKecamatan)) {
          const schools = dataByKecamatan[namaKecamatan];
          console.log(`\nMemproses ${schools.length} sekolah dari kecamatan: ${namaKecamatan} (file: ${fileName})`);

          for (const school of schools) {
            if (school.npsn) {
              const npsn = String(school.npsn).trim();
              
              const { data, error } = await supabase
                .from('schools')
                .update({ kecamatan: namaKecamatan.trim() })
                .eq('npsn', npsn);

              if (error) {
                console.error(`- Gagal update NPSN ${npsn}:`, error.message);
              } else {
                 totalUpdatedInFile++;
              }
            }
          }
        }
      }
      console.log(`\nSelesai! Total ${totalUpdatedInFile} sekolah dari file ${fileName} berhasil diupdate.`);

    } catch (err) {
      console.error(`\nError saat memproses file ${fileName}:`, err.message);
    }
  }

  console.log('\nProses update data kecamatan selesai untuk semua file.');
}

updateKecamatanData();