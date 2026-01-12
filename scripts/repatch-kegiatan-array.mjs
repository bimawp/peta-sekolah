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
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

async function readJson(rel) {
  const full = path.join(PUBLIC_DIR, rel);
  const txt = await fs.readFile(full, "utf8");
  return JSON.parse(txt);
}

function normKegiatanLabel(k) {
  const s = toText(k).toLowerCase();
  if (s.includes("rehab")) return { label: "Rehabilitasi Ruang Kelas", type: "rehab" };
  if (s.includes("pembangunan")) return { label: "Pembangunan RKB", type: "pembangunan" };
  return { label: toText(k), type: "lainnya" };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

(async () => {
  const sources = [
    { rel: "sd/data/data_kegiatan.json" },
    { rel: "smp/data/data_kegiatan.json" },
    { rel: "paud/data/data_kegiatan.json" },
    { rel: "pkbm/data/data_kegiatan.json" },
  ];

  const byNpsn = new Map(); // npsn -> kegiatan[]
  let totalRows = 0;

  for (const s of sources) {
    const arr = await readJson(s.rel);
    if (!Array.isArray(arr)) continue;

    totalRows += arr.length;

    for (const r of arr) {
      const npsn = toText(r?.npsn);
      if (!npsn) continue;

      const { label, type } = normKegiatanLabel(r?.kegiatan);
      const item = {
        kegiatan: label,
        kegiatan_type: type,
        lokal: toInt(r?.lokal),
        name: toText(r?.name),
      };

      if (!byNpsn.has(npsn)) byNpsn.set(npsn, []);
      byNpsn.get(npsn).push(item);
    }
  }

  const items = Array.from(byNpsn.entries()).map(([npsn, kegiatanArr]) => ({
    npsn,
    meta_patch: {
      kegiatan: kegiatanArr, // <-- ARRAY (ini yang biasanya diharapkan RPC)
      kegiatan_imported_at: new Date().toISOString(),
      kegiatan_source: "non_anggaran_simple",
    },
  }));

  console.log("Loaded rows:", totalRows);
  console.log("Unique NPSN:", items.length);

  // pakai bulk RPC yang sudah terbukti ada di DB Anda
  for (const part of chunk(items, 200)) {
    const { error } = await supabase.rpc("rpc_bulk_patch_school_meta", { p_items: part });
    if (error) throw error;
  }

  console.log("DONE repatch kegiatan (array)");
})().catch((e) => {
  console.error("FAILED:", e?.message || e);
  process.exit(1);
});
