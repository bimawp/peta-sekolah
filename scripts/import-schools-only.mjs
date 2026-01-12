import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("ENV kosong. Pastikan .env berisi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PUBLIC_DIR = path.join(process.cwd(), "public");

const toText = (v) => (v == null ? "" : String(v)).trim();
const toInt = (v, def = 0) => {
  if (v == null || v === "") return def;
  const n = Number.parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : def;
};
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);

function sumGenderFromClasses(classesObj) {
  // classes: { "1_L": 19.0, "1_P": 15.0, ... } :contentReference[oaicite:1]{index=1}
  if (!isObj(classesObj)) return { male: null, female: null };

  let male = 0;
  let female = 0;
  let any = false;

  for (const [k, val] of Object.entries(classesObj)) {
    const n = Number(val);
    if (!Number.isFinite(n)) continue;
    if (/_L$/i.test(k)) {
      male += n; any = true;
    } else if (/_P$/i.test(k)) {
      female += n; any = true;
    }
  }
  return any ? { male: Math.round(male), female: Math.round(female) } : { male: null, female: null };
}

function buildFacilities(s) {
  // satukan semua “fasilitas” yang ada di JSON: facilities + library + toilet + furniture + lab dll :contentReference[oaicite:2]{index=2}
  const out = {};
  const keys = [
    "facilities",
    "library",
    "laboratory",
    "laboratory_ipa",
    "laboratory_fisika",
    "laboratory_biologi",
    "laboratory_comp",
    "laboratory_langua",
    "teacher_room",
    "administration_room",
    "kepsek_room",
    "uks_room",
    "toilets",
    "students_toilet",
    "teachers_toilet",
    "official_residences",
    "furniture",
  ];
  for (const k of keys) {
    if (s[k] != null) out[k] = s[k];
  }
  return Object.keys(out).length ? out : null;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function readJson(rel) {
  const full = path.join(PUBLIC_DIR, rel);
  const txt = await fs.readFile(full, "utf8");
  return JSON.parse(txt);
}

function flattenByKecamatan(rootObj) {
  // root: { "Banjarwangi": [ {...}, ... ], "Caringin": [...] } :contentReference[oaicite:3]{index=3}
  const rows = [];
  for (const [kecamatan, arr] of Object.entries(rootObj || {})) {
    if (!Array.isArray(arr)) continue;
    for (const s of arr) {
      if (!isObj(s)) continue;

      const npsn = toText(s.npsn);
      if (!npsn) continue;

      const coords = Array.isArray(s.coordinates) ? s.coordinates : null;
      const lat = coords?.length >= 2 ? Number(coords[0]) : null;
      const lng = coords?.length >= 2 ? Number(coords[1]) : null;

      const { male, female } = sumGenderFromClasses(s.classes);

      rows.push({
        npsn,
        name: toText(s.name),
        address: toText(s.address),
        village_name: toText(s.village),
        kecamatan_name: toText(kecamatan),
        kecamatan: toText(kecamatan),

        // Anda tidak pakai location
        location_id: null,

        // Negeri/Swasta ada di field "type" :contentReference[oaicite:4]{index=4}
        status: toText(s.type) || null,

        student_count: toInt(s.student_count, 0),
        st_male: male,
        st_female: female,

        lat: Number.isFinite(lat) ? lat : null,
        lng: Number.isFinite(lng) ? lng : null,

        facilities: buildFacilities(s),
        class_condition: isObj(s.class_condition) ? s.class_condition : null,

        // simpan raw full record agar tidak hilang
        details: s,

        meta: {
          imported_at: new Date().toISOString(),
        },

        contact: null,
        created_by: null,
      });
    }
  }
  return rows;
}

async function upsertSchools(rows) {
  let total = 0;
  for (const part of chunk(rows, 300)) {
    const { error } = await supabase
      .from("schools")
      .upsert(part, { onConflict: "npsn" });
    if (error) throw error;
    total += part.length;
  }
  return total;
}

(async () => {
  // Ambil dari folder public/data (versi besar, struktur sama seperti URL Vercel)
  const sources = [
    { rel: "data/paud.json", school_type_id: 1 },
    { rel: "data/pkbm.json", school_type_id: 2 },
    { rel: "data/sd_new.json", school_type_id: 3 },
    { rel: "data/smp.json", school_type_id: 4 },
  ];

  let all = [];
  for (const src of sources) {
    const root = await readJson(src.rel);
    if (!isObj(root)) {
      throw new Error(`Root JSON ${src.rel} bukan object. Script ini hanya untuk format object-by-kecamatan.`);
    }

    const rows = flattenByKecamatan(root).map((r) => ({
      ...r,
      school_type_id: src.school_type_id,
      meta: { ...(r.meta || {}), source: src.rel, school_type_id: src.school_type_id },
    }));

    console.log(`[OK] ${src.rel} -> rows=${rows.length}`);
    all = all.concat(rows);
  }

  console.log("TOTAL rows prepared:", all.length);

  const up = await upsertSchools(all);
  console.log("UPSERTED rows:", up);

  const { count, error } = await supabase
    .from("schools")
    .select("*", { count: "exact", head: true });
  if (error) throw error;

  console.log("DONE. schools_count =", count);
})().catch((e) => {
  console.error("FAILED:", e?.message || e);
  process.exit(1);
});
