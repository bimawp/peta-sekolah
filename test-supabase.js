import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // Menggunakan dotenv untuk membaca file .env

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('--- Tes Koneksi Supabase ---');
console.log('URL:', supabaseUrl ? 'Ditemukan' : 'TIDAK DITEMUKAN');
console.log('Key:', supabaseAnonKey ? 'Ditemukan' : 'TIDAK DITEMUKAN');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Kredensial Supabase tidak ditemukan di file .env.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkConnection() {
  console.log('\n Mencoba mengambil sesi dari Supabase...');
  try {
    // Memberi batas waktu 10 detik. Jika lebih, anggap gagal.
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Koneksi timeout setelah 10 detik.')), 10000)
    );
    
    const sessionPromise = supabase.auth.getSession();

    const { data, error } = await Promise.race([sessionPromise, timeoutPromise]);

    if (error) {
      console.error('--- KONEKSI GAGAL ---');
      console.error('Pesan Error:', error.message);
      return;
    }

    console.log('✅ --- KONEKSI BERHASIL! ---');
    console.log('Data Sesi:', data.session ? 'Ada sesi aktif' : 'Tidak ada sesi');

  } catch (e) {
    console.error('--- KEGAGALAN KRITIS ---');
    console.error('Terjadi error tak terduga:', e.message);
  }
}

checkConnection();