import { readFile, writeFile } from 'fs/promises';
import path, { dirname } from 'path';

// Tentukan target jumlah sekolah yang ingin diubah
const TARGET_TOILETS_ZERO = 1186;

// Definisikan file-file yang akan diubah
const filesToUpdate = [
  'paud.json',
  'sd_new.json',
  'smp.json',
  'pkbm.json'
];

// Dapatkan direktori saat ini dengan cara yang aman
const __dirname = dirname(new URL(import.meta.url).pathname);

let updatedCount = 0;

async function updateData() {
  console.log(`🚀 Mulai memperbarui data...`);

  for (const file of filesToUpdate) {
    if (updatedCount >= TARGET_TOILETS_ZERO) {
      console.log(`✅ Target ${TARGET_TOILETS_ZERO} sekolah sudah tercapai.`);
      break;
    }

    // Gunakan path.join untuk membuat path yang benar
    const filePath = path.join(process.cwd(), 'public', 'data', file);
    
    try {
      // Menggunakan readFile() dari fs/promises yang sudah diimpor
      const rawData = await readFile(filePath, 'utf8');
      const data = JSON.parse(rawData);
      
      let schoolsToUpdateInThisFile = 0;
      let flattenedData = [];

      if (Array.isArray(data)) {
          flattenedData = data;
      } else {
          Object.keys(data).forEach(kecamatan => {
            if (Array.isArray(data[kecamatan])) {
              flattenedData = flattenedData.concat(data[kecamatan]);
            }
          });
      }

      for (let i = 0; i < flattenedData.length; i++) {
        if (updatedCount >= TARGET_TOILETS_ZERO) break;

        const school = flattenedData[i];
        
        const hasGoodToilets = (school.toilets && school.toilets.good > 0) || 
                               (school.teachers_toilet && school.teachers_toilet.male?.good > 0) ||
                               (school.students_toilet && school.students_toilet.male?.good > 0);

        if (hasGoodToilets) {
          if (school.toilets) {
            school.toilets = {
              "good": 0,
              "moderate_damage": 0,
              "heavy_damage": 0,
              "total": 0
            };
          }
          if (school.teachers_toilet) {
            school.teachers_toilet = {};
          }
          if (school.students_toilet) {
            school.students_toilet = {};
          }
          schoolsToUpdateInThisFile++;
          updatedCount++;
        }
      }

      let updatedData = {};
      if (Array.isArray(data)) {
        updatedData = flattenedData;
      } else {
        Object.keys(data).forEach(kecamatan => {
          updatedData[kecamatan] = flattenedData.filter(s => s.kecamatan === kecamatan);
        });
      }

      // Menggunakan writeFile() dari fs/promises yang sudah diimpor
      await writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
      console.log(`✅ Berhasil memperbarui ${schoolsToUpdateInThisFile} sekolah di ${file}.`);

    } catch (err) {
      console.error(`❌ Gagal membaca atau menulis file ${file}:`, err);
    }
  }

  console.log(`🏁 Skrip selesai. Total ${updatedCount} sekolah berhasil diubah.`);
}

updateData();