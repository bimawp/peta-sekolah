import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env: SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

const toInt = (v, def = 0) => {
  if (v == null) return def;
  const s = String(v).replace(/[^\d-]/g, "").trim();
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : def;
};

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const toText = (v) => (v == null ? "" : String(v)).trim();

function sumGenderFromClasses(classesObj) {
  // format SD: { "1_L": 19, "1_P": 15, ... } :contentReference[oaicite:2]{index=2}
  if (!isObj(classesObj)) return { male: null, female: null };
  let male = 0;
  let female = 0;
  let any = false;

  for (const [k, val] of Object.entries(classesObj)) {
    const n = toInt(val, 0);
    if (/_L$/i.test(k)) {
      male += n; any = true;
    } else if (/_P$/i.test(k)) {
      female += n; any = true;
    }
  }
  return any ? { male, female } : { male: null, female: null };
}

async function readJson(relPath) {
  const full = path.join(PUBLIC_DIR, relPath);
  const txt = await fs.readFile(full, "utf8");
  return JSON.parse(txt);
}

function flattenByKecamatan(json, jenjang, sourcePath) {
  // Bentuk file sekolah Anda: { "Banjarwangi": [ {..}, ... ], ... } :contentReference[oaicite:3]{index=3}
  const rows = [];
  if (!isObj(json)) return rows;

  for (const [kecamatanKey, arr] of Object.entries(json)) {
    if (!Array.isArray(arr)) continue;

    for (const s of arr) {
      if (!isObj(s)) continue;

      const npsn = toText(s.npsn);
      if (!npsn) continue;

      const name = toText(s.name);
      const address = toText(s.address);
      const village_name = toText(s.village);

      // coordinates: [lat, lng] :contentReference[oaicite:4]{index=4}
      const coords = Array.isArray(s.coordinates) ? s.coordinates : null;
      const lat = coords?.length >= 2 ? toNum(coords[0]) : null;
      const lng = coords?.length >= 2 ? toNum(coords[1]) : null;

      // status di DB Anda cocok untuk "Negeri/Swasta" dari JSON field "type" :contentReference[oaicite:5]{index=5}
      const status = toText(s.type);

      const student_count = toInt(s.student_count, 0);

      const { male: st_male, female: st_female } = sumGenderFromClasses(s.classes);

      // facilities jsonb: gabungkan “facilities” + komponen lain (toilets, library, lab, dll)
      const facilities = {};
      if (isObj(s.facilities)) Object.assign(facilities, s.facilities);

      // SD punya toilets/library/laboratory dll :contentReference[oaicite:6]{index=6}
      // SMP punya students_toilet / teachers_toilet, laboratorium spesifik, dll :contentReference[oaicite:7]{index=7}
      const facilityKeys = [
        "toilets",
        "students_toilet",
        "teachers_toilet",
        "library",
        "laboratory",
        "laboratory_comp",
        "laboratory_langua",
        "laboratory_ipa",
        "laboratory_fisika",
        "laboratory_biologi",
        "teacher_room",
        "administration_room",
        "kepsek_room",
        "uks_room",
        "official_residences",
        "furniture",
        "furniture_computer",
      ];
      for (const k of facilityKeys) {
        if (s[k] != null) facilities[k] = s[k];
      }

      const class_condition = isObj(s.class_condition) ? s.class_condition : null;

      // details jsonb: simpan raw record + metadata jenjang/kecamatan
      const details = {
        ...s,
        jenjang,
        kecamatan: toText(kecamatanKey),
        __source: sourcePath,
      };

      // meta jsonb: simpan info minimal (jangan terlalu bloat)
      const meta = {
        source: sourcePath,
        jenjang,
        imported_at: new Date().toISOString(),
      };

      rows.push({
        // kolom-kolom tabel schools Anda
        npsn,
        name,
        address,
        village_name,
        kecamatan_name: toText(kecamatanKey),
        kecamatan: toText(kecamatanKey),

        // relasi ID biarkan null dulu (aman jika kolom nullable)
        location_id: null,
        school_type_id: null, // akan diisi setelah kita ambil mapping school_types

        status,
        student_count,
        st_male,
        st_female,
        lat,
        lng,
        facilities: Object.keys(facilities).length ? facilities : null,
        class_condition,
        details,
        meta,
        contact: null,
        created_by: null,
      });
    }
  }
  return rows;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function loadSchoolTypeMap() {
  // Asumsi umum: school_types punya kolom (id, name)
  // Jika ternyata berbeda, script tetap jalan, hanya school_type_id akan null.
  const jenjangNames = ["SD", "SMP", "PAUD", "PKBM"];
  const map = new Map();

  try {
    const { data, error } = await supabase
      .from("school_types")
      .select("id,name")
      .in("name", jenjangNames);

    if (error) throw error;

    for (const r of data || []) map.set(String(r.name).toUpperCase(), r.id);

    // coba insert yang belum ada
    const missing = jenjangNames.filter((n) => !map.has(n));
    if (missing.length) {
      const { error: upErr } = await supabase
        .from("school_types")
        .upsert(missing.map((name) => ({ name })), { onConflict: "name" });
      if (!upErr) {
        const { data: data2 } = await supabase
          .from("school_types")
          .select("id,name")
          .in("name", jenjangNames);
        for (const r of data2 || []) map.set(String(r.name).toUpperCase(), r.id);
      }
    }
  } catch (e) {
    console.warn("[WARN] Cannot map school_types (id,name). school_type_id will be null.");
    console.warn("       Reason:", e?.message || e);
  }

  return map;
}

async function upsertSchools(rows) {
  let total = 0;
  for (const part of chunk(rows, 500)) {
    const { error } = await supabase
      .from("schools")
      .upsert(part, { onConflict: "npsn" });
    if (error) throw error;
    total += part.length;
  }
  return total;
}

(async () => {
  // Path sesuai struktur public Anda (yang Anda kirimkan)
  const sources = [
    { rel: "sd/data/sd_new.json", jenjang: "SD" },
    { rel: "smp/data/smp.json", jenjang: "SMP" },
    { rel: "pkbm/data/pkbm.json", jenjang: "PKBM" },
    // PAUD: Anda punya file lokal, meski URL kadang error di fetch tool
    { rel: "paud/data/paud.json", jenjang: "PAUD" },
  ];

  const typeMap = await loadSchoolTypeMap();

  let allRows = [];
  for (const src of sources) {
    try {
      const json = await readJson(src.rel);
      const rows = flattenByKecamatan(json, src.jenjang, src.rel);

      // isi school_type_id jika mapping tersedia
      const typeId = typeMap.get(src.jenjang.toUpperCase()) ?? null;
      for (const r of rows) r.school_type_id = typeId;

      console.log(`[OK] ${src.rel} -> rows=${rows.length}`);
      allRows = allRows.concat(rows);
    } catch (e) {
      console.warn(`[SKIP] ${src.rel} not found or invalid JSON.`);
      console.warn("       Reason:", e?.message || e);
    }
  }

  console.log("TOTAL rows to upsert:", allRows.length);
  const up = await upsertSchools(allRows);
  console.log("UPSERTED rows:", up);

  // quick check
  const { data: c } = await supabase.from("schools").select("npsn", { count: "exact", head: true });
  console.log("DONE. schools count =", c);

})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
