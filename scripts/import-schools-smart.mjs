import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing env: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (cek file .env)");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PUBLIC_DIR = path.join(process.cwd(), "public");

const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const toText = (v) => (v == null ? "" : String(v)).trim();
const toInt = (v, def = 0) => {
  if (v == null || v === "") return def;
  const n = Number.parseInt(String(v).replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : def;
};
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function pickNpsn(o) {
  return toText(o?.npsn ?? o?.NPSN ?? o?.npsn_sekolah ?? o?.npsnSekolah);
}

/**
 * Ekstrak sekolah dari JSON dengan banyak variasi root:
 * - object-of-arrays keyed by kecamatan (contoh Vercel SD/SMP) :contentReference[oaicite:2]{index=2}
 * - root array of objects
 * - nested under: data / schools / items / results
 */
function extractSchoolsAny(json, ctx = {}) {
  const out = [];

  // geojson: skip
  if (isObj(json) && Array.isArray(json.features)) return out;

  // root array of schools
  if (Array.isArray(json)) {
    for (const item of json) {
      if (!isObj(item)) continue;
      const npsn = pickNpsn(item);
      if (!npsn) continue;

      const kec =
        toText(item.kecamatan ?? item.kecamatan_name ?? item.kecamatanName) ||
        toText(ctx.kecamatan) ||
        "";

      out.push({ kecamatan: kec, item, path: ctx.path || "$" });
    }
    return out;
  }

  // object keyed by kecamatan -> array schools
  if (isObj(json)) {
    // heuristic: jika banyak value berupa array dan elem pertama punya npsn
    let hits = 0;
    for (const [k, v] of Object.entries(json)) {
      if (Array.isArray(v) && v.some((x) => isObj(x) && pickNpsn(x))) {
        hits++;
        for (const item of v) {
          if (!isObj(item)) continue;
          const npsn = pickNpsn(item);
          if (!npsn) continue;
          out.push({ kecamatan: toText(k), item, path: `${ctx.path || "$"}.${k}` });
        }
      }
    }
    if (hits > 0) return out;

    // nested common containers
    for (const key of ["data", "schools", "items", "results"]) {
      if (json[key] != null) {
        out.push(...extractSchoolsAny(json[key], { ...ctx, path: `${ctx.path || "$"}.${key}` }));
      }
    }

    // one level deep fallback
    if (out.length === 0) {
      for (const [k, v] of Object.entries(json)) {
        if (v == null) continue;
        if (isObj(v) || Array.isArray(v)) {
          out.push(...extractSchoolsAny(v, { ...ctx, path: `${ctx.path || "$"}.${k}`, kecamatan: ctx.kecamatan }));
        }
      }
    }
  }

  return out;
}

function buildFacilities(s) {
  const facilities = {};
  if (isObj(s.facilities)) Object.assign(facilities, s.facilities);

  // SD punya toilets/library/laboratory dll :contentReference[oaicite:3]{index=3}
  // SMP punya students_toilet/teachers_toilet dan lab spesifik :contentReference[oaicite:4]{index=4}
  const keys = [
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
  for (const k of keys) {
    if (s[k] != null) facilities[k] = s[k];
  }

  return Object.keys(facilities).length ? facilities : null;
}

async function readJson(relPath) {
  const full = path.join(PUBLIC_DIR, relPath);
  const txt = await fs.readFile(full, "utf8");
  return JSON.parse(txt);
}

function inferJenjangFromPath(p) {
  const s = p.toLowerCase();
  if (s.includes("/sd/") || s.includes("sd_") || s.includes("sd")) return "SD";
  if (s.includes("/smp/") || s.includes("smp")) return "SMP";
  if (s.includes("/paud/") || s.includes("paud")) return "PAUD";
  if (s.includes("/pkbm/") || s.includes("pkbm")) return "PKBM";
  return null;
}

async function loadSchoolTypeIdByCode() {
  // school_types Anda punya kolom (id, code, name) — Anda sudah insert data
  const map = new Map();
  const { data, error } = await supabase.from("school_types").select("id,code");
  if (error) throw error;
  for (const r of data || []) {
    map.set(String(r.code).toUpperCase(), r.id);
  }
  return map;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
  const files = [
    "sd/data/sd_new.json",
    "smp/data/smp.json",
    "pkbm/data/pkbm.json",
    "paud/data/paud.json",
  ];

  const typeMap = await loadSchoolTypeIdByCode();

  let rows = [];
  for (const rel of files) {
    let json;
    try {
      json = await readJson(rel);
    } catch (e) {
      console.warn(`[SKIP] cannot read ${rel}: ${e?.message || e}`);
      continue;
    }

    const jenjang = inferJenjangFromPath(rel);
    const typeId = jenjang ? (typeMap.get(jenjang) ?? null) : null;

    const extracted = extractSchoolsAny(json, { path: "$" });
    console.log(`[INFO] ${rel} extracted=${extracted.length}`);

    // mapping ke schema public.schools Anda
    for (const { kecamatan, item, path: jpath } of extracted) {
      const npsn = pickNpsn(item);
      if (!npsn) continue;

      const coords = Array.isArray(item.coordinates) ? item.coordinates : null;
      const lat = coords?.length >= 2 ? toNum(coords[0]) : null; // [lat, lng] :contentReference[oaicite:5]{index=5}
      const lng = coords?.length >= 2 ? toNum(coords[1]) : null;

      rows.push({
        // wajib
        npsn,
        name: toText(item.name),
        address: toText(item.address),

        // lokasi (tanpa locations table)
        kecamatan_name: toText(kecamatan),
        kecamatan: toText(kecamatan),
        village_name: toText(item.village),

        // relasi
        location_id: null,
        school_type_id: typeId,

        // status/angka
        status: toText(item.type), // "Negeri/Swasta" :contentReference[oaicite:6]{index=6}
        student_count: toInt(item.student_count, 0), // SD string, SMP number :contentReference[oaicite:7]{index=7}
        st_male: null,
        st_female: null,

        lat,
        lng,

        facilities: buildFacilities(item),
        class_condition: isObj(item.class_condition) ? item.class_condition : null,

        // simpan raw untuk debugging / detail page
        details: {
          ...item,
          __source: rel,
          __json_path: jpath,
          __jenjang: jenjang,
          __kecamatan: toText(kecamatan),
        },

        meta: {
          source: rel,
          json_path: jpath,
          jenjang,
          imported_at: new Date().toISOString(),
        },

        contact: null,
        created_by: null,
      });
    }
  }

  console.log("TOTAL rows prepared:", rows.length);
  if (!rows.length) {
    console.warn("Tidak ada row terdeteksi. Cek struktur JSON lokal (lihat bagian 'Debug cepat' di bawah).");
    return;
  }

  const up = await upsertSchools(rows);
  console.log("UPSERTED:", up);

  const { count, error: cErr } = await supabase
    .from("schools")
    .select("*", { count: "exact", head: true });
  if (cErr) throw cErr;

  console.log("DONE. schools_count =", count);
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
