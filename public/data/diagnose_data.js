import fs from 'fs';
import path from 'path';

console.log('Memulai skrip diagnosis untuk file data...');

try {
    const filePath = path.join(path.resolve(), 'public', 'data', 'paud.json');
    console.log(`Mencoba membaca file di: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const districtsData = JSON.parse(fileContent);

    console.log('\n--- Menganalisis paud.json ---');

    // Ambil 1 kecamatan pertama dari data
    const firstDistrictName = Object.keys(districtsData)[0];
    if (!firstDistrictName) {
        throw new Error("Tidak ada nama kecamatan yang ditemukan di file JSON.");
    }
    const schools = districtsData[firstDistrictName];

    console.log(`Menganalisis kecamatan: "${firstDistrictName}"`);
    console.log(`Ditemukan ${schools.length} sekolah di dalamnya.`);
    console.log('--- Memeriksa 5 data sekolah pertama ---');

    // Cek 5 sekolah pertama
    for (let i = 0; i < 5 && i < schools.length; i++) {
        const school = schools[i];
        console.log(`\n--- [ Data Sekolah #${i + 1} ] ---`);

        // Cetak seluruh objek sekolah untuk kita lihat
        console.log(school);

        // Lakukan validasi dan cetak hasilnya secara detail
        const npsnExists = school.npsn != null && school.npsn !== '';
        const lintangExists = school.lintang != null;
        const bujurExists = school.bujur != null;
        const isValid = npsnExists && lintangExists && bujurExists;

        console.log(`\n--- [ Hasil Pengecekan Sekolah #${i + 1} ] ---`);
        console.log(`  - Properti 'npsn' ada?     : ${npsnExists} (Nilai: ${school.npsn})`);
        console.log(`  - Properti 'lintang' ada?  : ${lintangExists} (Nilai: ${school.lintang})`);
        console.log(`  - Properti 'bujur' ada?    : ${bujurExists} (Nilai: ${school.bujur})`);
        console.log(`  - Lolos validasi?          : ${isValid}`);
    }

} catch (err) {
    console.error('\n[ERROR FATAL SAAT DIAGNOSIS]:', err.message);
}