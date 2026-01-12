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

async function readJson(rel) {
  const full = path.join(PUBLIC_DIR, rel);
  const txt = await fs.readFile(full, "utf8");
  return JSON.parse(txt);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function patchSingle(npsn, metaPatch) {
  const { error } = await supabase.rpc("rpc_patch_school_meta_by_npsn", {
    p_npsn: npsn,
    p_meta_patch: metaPatch,
  });
  if (error) throw error;
}

async function bulkAvailable() {
  // coba panggil dengan array kosong (aman). kalau function tidak ada, akan error.
  const { error } = await supabase.rpc("rpc_bulk_patch_school_meta", { p_items: [] });
  return !error;
}

async function patchBulk(items) {
  const { error } = await supabase.rpc("rpc_bulk_patch_school_meta", { p_items: items });
  if (error) throw error;
}

(async () => {
  // sumber non-anggaran
  const sources = [
    { rel: "sd/data/data_kegiatan.json", key: "sd" },
    { rel: "smp/data/data_kegiatan.json", key: "smp" },
    { rel: "paud/data/data_kegiatan.json", key: "paud" },
    { rel: "pkbm/data/data_kegiatan.json", key: "pkbm" },
  ];

  // kumpulkan kegiatan per npsn per jenjang
  const byNpsn = new Map(); // npsn -> { sd:[], smp:[], ... }

  for (const s of sources) {
    let arr;
    try {
      arr = await readJson(s.rel);
    } catch {
      console.warn("[SKIP] file tidak ada:", s.rel);
      continue;
    }

    if (!Array.isArray(arr) || !arr.length) {
      console.warn("[SKIP] kosong / bukan array:", s.rel);
      continue;
    }

    for (const r of arr) {
      const npsn = toText(r?.npsn);
      if (!npsn) continue;

      const item = {
        kegiatan: toText(r?.kegiatan),
        lokal: toText(r?.lokal),
        name: toText(r?.name),
      };

      if (!byNpsn.has(npsn)) byNpsn.set(npsn, {});
      const slot = byNpsn.get(npsn);
      if (!Array.isArray(slot[s.key])) slot[s.key] = [];
      slot[s.key].push(item);
    }

    console.log(`[OK] ${s.rel} loaded rows=${arr.length}`);
  }

  const items = [];
  for (const [npsn, perJenjang] of byNpsn.entries()) {
    items.push({
      npsn,
      meta_patch: {
        kegiatan: perJenjang, // meta.kegiatan.sd / smp / paud / pkbm
        kegiatan_imported_at: new Date().toISOString(),
      },
    });
  }

  console.log("UNIQUE NPSN kegiatan:", items.length);
  if (!items.length) {
    console.warn("Tidak ada kegiatan yang bisa dipatch (cek file sumber).");
    return;
  }

  const canBulk = await bulkAvailable();

  if (canBulk) {
    console.log("[INFO] pakai rpc_bulk_patch_school_meta");
    for (const part of chunk(items, 200)) {
      await patchBulk(part);
    }
  } else {
    console.log("[INFO] rpc_bulk_patch_school_meta tidak ada, fallback patch satu-satu");
    for (const it of items) {
      await patchSingle(it.npsn, it.meta_patch);
    }
  }

  console.log("DONE patch kegiatan");
})().catch((e) => {
  console.error("FAILED:", e?.message || e);
  process.exit(1);
});
