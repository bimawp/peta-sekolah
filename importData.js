import { supabase } from '../services/supabaseClient';
// atau (kalau ada import lama)
import supabase from '@/services/supabaseClient'; // pakai alias @ dari vite.config
// atau relatif kalau belum pakai alias
// import supabase from '../services/supabaseClient';

import fs from "fs";
import path from "path";
import 'dotenv/config'; 

// Ambil dari .env
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL atau ANON KEY belum diatur di .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Fungsi baca JSON
const readJson = (fileName) => {
  const filePath = path.resolve("./public/data", fileName);
  if (!fs.existsSync(filePath)) {
    console.warn(`File ${fileName} tidak ditemukan, dilewati.`);
    return [];
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error(`JSON ${fileName} tidak valid, dilewati.`);
    return [];
  }

  // Flatten semua array di dalam object kecamatan
  if (typeof json === "object" && !Array.isArray(json)) {
    return Object.values(json).flat();
  }
  if (Array.isArray(json)) return json;
  return [json];
};

// Fungsi insert data ke tabel building_status
const insertBuildingStatus = async (dataArray) => {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.log("Tidak ada data untuk tabel building_status, dilewati.");
    return;
  }

  for (const school of dataArray) {
    // Ambil ID sekolah berdasarkan NPSN
    const { data: schoolData, error: schoolError } = await supabase
      .from("schools")
      .select("id")
      .eq("npsn", school.npsn)
      .single();

    if (schoolError || !schoolData) {
      console.warn(`Sekolah dengan NPSN ${school.npsn} tidak ditemukan, dilewati.`);
      continue;
    }

    const schoolId = schoolData.id;

    // Siapkan data building_status
    const buildingRow = {
      school_id: schoolId,
      tanah_yayasan: school.building_status?.tanah?.yayasan || "",
      tanah_hibah: school.building_status?.tanah?.hibah || "",
      tanah_pribadi: school.building_status?.tanah?.pribadi || "",
      land_available: school.building_status?.tanah?.land_available || 0,
      gedung_yayasan: school.building_status?.gedung?.yayasan || "",
      gedung_hibah: school.building_status?.gedung?.hibah || "",
      gedung_sewa: school.building_status?.gedung?.sewa || "",
      gedung_menumpang: school.building_status?.gedung?.menumpang || "",
    };

    const { data, error } = await supabase.from("building_status").insert(buildingRow);
    if (error) console.error(`Error insert building_status untuk NPSN ${school.npsn}:`, error);
    else console.log(`Inserted building_status untuk NPSN ${school.npsn}`);
  }
};

// Jalankan insert building_status
const importBuilding = async () => {
  try {
    await insertBuildingStatus(readJson("paud.json"));
    await insertBuildingStatus(readJson("pkbm.json"));
    await insertBuildingStatus(readJson("sd_new.json"));
    await insertBuildingStatus(readJson("smp.json"));
    console.log("Import building_status selesai!");
  } catch (err) {
    console.error("Error import building_status:", err);
  }
};

importBuilding();
