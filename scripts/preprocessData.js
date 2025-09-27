import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Dapatkan path direktori saat ini menggunakan sintaks ES Module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tentukan path ke folder public dan data
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DATA_DIR = path.join(PUBLIC_DIR, 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'all_schools_processed.json');

// --- Fungsi helper (tidak berubah) ---
const cleanAndValidateCoordinate = (rawCoord) => {
    if (rawCoord === null || typeof rawCoord === 'undefined') return null;
    let coordStr = String(rawCoord).trim().replace(',', '.');
    if (!isFinite(coordStr) || coordStr === '') return null;
    const coord = parseFloat(coordStr);
    return isNaN(coord) ? null : coord;
};

const readJsonFile = (filePath) => {
    try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.error(`Error membaca file ${filePath}:`, error);
        return null;
    }
};

// --- Logika Utama Skrip (tidak berubah) ---
async function main() {
    console.log('🚀 Memulai pra-pemrosesan data sekolah...');

    const paudData = readJsonFile(path.join(DATA_DIR, 'paud.json'));
    const sdData = readJsonFile(path.join(DATA_DIR, 'sd_new.json'));
    const smpData = readJsonFile(path.join(DATA_DIR, 'smp.json'));
    const pkbmData = readJsonFile(path.join(DATA_DIR, 'pkbm.json'));
    const kegiatanPaud = readJsonFile(path.join(DATA_DIR, 'data_kegiatan_paud.json'));
    const kegiatanSd = readJsonFile(path.join(DATA_DIR, 'data_kegiatan_sd.json'));
    const kegiatanSmp = readJsonFile(path.join(DATA_DIR, 'data_kegiatan_smp.json'));
    const kegiatanPkbm = readJsonFile(path.join(DATA_DIR, 'data_kegiatan_pkbm.json'));

    const kegiatanMap = [
        ...(kegiatanPaud || []), ...(kegiatanSd || []),
        ...(kegiatanSmp || []), ...(kegiatanPkbm || [])
    ].reduce((acc, kegiatan) => {
        if (kegiatan?.npsn) {
            const npsn = String(kegiatan.npsn);
            if (!acc[npsn]) acc[npsn] = { rehab: 0, pembangunan: 0 };
            const lokal = parseInt(kegiatan.Lokal, 10) || 0;
            if (String(kegiatan.Kegiatan).includes('Rehab')) acc[npsn].rehab += lokal;
            if (String(kegiatan.Kegiatan).includes('Pembangunan')) acc[npsn].pembangunan += lokal;
        }
        return acc;
    }, {});

    let combinedSchools = [];
    const processJenjang = (data, jenjang) => {
        if (!data) return;
        const schoolList = Array.isArray(data) ? data : Object.values(data).flat();

        schoolList.forEach((school, index) => {
            if (!school) return;
            const npsn = String(school.npsn || school.NPSN || `NO-NPSN-${jenjang}-${index}`);
            let latitude = null, longitude = null, hasValidLocation = false;
            
            if (school.coordinates && school.coordinates.length === 2) {
                latitude = cleanAndValidateCoordinate(school.coordinates[0]);
                longitude = cleanAndValidateCoordinate(school.coordinates[1]);
            } else if (school.latitude && school.longitude) {
                latitude = cleanAndValidateCoordinate(school.latitude);
                longitude = cleanAndValidateCoordinate(school.longitude);
            }

            if (latitude !== null && longitude !== null && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && (latitude !== 0 || longitude !== 0)) {
                hasValidLocation = true;
            }

            combinedSchools.push({
                npsn,
                nama_sekolah: school.name || school.nama_sekolah || 'N/A',
                jenjang,
                status_sekolah: school.status || school.type || 'N/A',
                alamat: school.address || 'N/A',
                kecamatan: school.kecamatan || 'N/A',
                desa: school.village || 'N/A',
                latitude,
                longitude,
                hasValidLocation,
                jumlah_siswa: parseInt(school.student_count, 10) || 0,
                kondisi_baik: parseInt(school.class_condition?.classrooms_good, 10) || 0,
                kondisi_rusak_sedang: parseInt(school.class_condition?.classrooms_moderate_damage, 10) || 0,
                kondisi_rusak_berat: parseInt(school.class_condition?.classrooms_heavy_damage, 10) || 0,
                kekurangan_rkb: parseInt(school.class_condition?.lacking_rkb, 10) || 0,
                rehab: kegiatanMap[npsn]?.rehab || 0,
                pembangunan: kegiatanMap[npsn]?.pembangunan || 0,
            });
        });
    };

    processJenjang(paudData, 'PAUD');
    processJenjang(sdData, 'SD');
    processJenjang(smpData, 'SMP');
    processJenjang(pkbmData, 'PKBM');
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(combinedSchools, null, 2));
    
    console.log(`✅ SUKSES: ${combinedSchools.length} data sekolah telah diproses dan disimpan ke:`);
    console.log(OUTPUT_FILE);
}

main();