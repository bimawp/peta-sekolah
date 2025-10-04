import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const INPUT_DIR = path.join(__dirname, '../public/data');

console.log('Memulai proses penggabungan dan pembersihan data sekolah...');

const readAndExtractArray = (filePath) => {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        if (Array.isArray(jsonData)) return jsonData;
        for (const key in jsonData) {
            if (Array.isArray(jsonData[key])) {
                console.log(`  -> Ditemukan array dalam properti '${key}' di file ${path.basename(filePath)}`);
                return jsonData[key];
            }
        }
        throw new Error(`Tidak dapat menemukan data array di dalam ${path.basename(filePath)}.`);
    } catch (error) {
        console.error(`ERROR saat memproses file ${path.basename(filePath)}: ${error.message}`);
        return [];
    }
};

try {
    const sdSchools = readAndExtractArray(path.join(INPUT_DIR, 'sd_new.json'));
    const smpSchools = readAndExtractArray(path.join(INPUT_DIR, 'smp.json'));
    const paudSchools = readAndExtractArray(path.join(INPUT_DIR, 'paud.json'));
    const pkbmSchools = readAndExtractArray(path.join(INPUT_DIR, 'pkbm.json'));
    let uniqueIdCounter = 0;

    const processSchool = (school, jenjang) => {
        const latitude = parseFloat(school.latitude);
        const longitude = parseFloat(school.longitude);
        let npsnValue = (school.npsn && String(school.npsn).trim()) ? String(school.npsn).trim() : '';
        if (!npsnValue) {
            npsnValue = `TEMP_ID_${uniqueIdCounter++}`;
            console.warn(`  -> Peringatan: Ditemukan sekolah "${school.nama || 'Tanpa Nama'}" tanpa NPSN. Diberikan ID sementara: ${npsnValue}`);
        }
        return {
            npsn: npsnValue,
            nama: school.nama || 'Nama Tidak Tersedia',
            jenjang,
            kecamatan: school.kecamatan || 'Tidak Terdata',
            desa: school.desa || 'Tidak Terdata',
            alamat: school.alamat || 'Tidak Terdata',
            status: school.status || 'N/A',
            latitude, longitude,
            validLocation: !isNaN(latitude) && !isNaN(longitude) && latitude !== 0 && longitude !== 0,
            kondisi_baik: parseInt(school.kondisi_baik, 10) || 0,
            kondisi_rusak_sedang: parseInt(school.kondisi_rusak_sedang, 10) || 0,
            kondisi_rusak_berat: parseInt(school.kondisi_rusak_berat, 10) || 0,
            kebutuhan_rkb: parseInt(school.kebutuhan_rkb, 10) || 0,
        };
    };

    const allSchools = [
        ...sdSchools.map(s => processSchool(s, 'SD')),
        ...smpSchools.map(s => processSchool(s, 'SMP')),
        ...paudSchools.map(s => processSchool(s, 'PAUD')),
        ...pkbmSchools.map(s => processSchool(s, 'PKBM')),
    ];

    const outputPath = path.join(INPUT_DIR, 'all_schools_processed.json');
    fs.writeFileSync(outputPath, JSON.stringify(allSchools, null, 2));

    console.log(`\n✅ Proses Selesai! Total ${allSchools.length} data sekolah diproses.`);
    console.log(`File output tersimpan di: public/data/all_schools_processed.json`);

} catch (error) {
    console.error('\n❌ Terjadi kesalahan fatal:', error.message);
}