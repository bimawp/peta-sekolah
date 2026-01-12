import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const PUBLIC_DIR = path.join(process.cwd(), "public");
const toText = (v) => (v == null ? "" : String(v)).trim();

async function readJson(rel) {
  const txt = await fs.readFile(path.join(PUBLIC_DIR, rel), "utf8");
  return JSON.parse(txt);
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function patchOne(npsn, metaPatch) {
  const { error } = await supabase.rpc("rpc_patch_school_meta_by_npsn", {
    p_npsn: npsn,
    p_meta_patch: metaPatch,
  });
  if (error) throw error;
}

(async () => {
  const files = [
    { rel: "sd/data/data_kegiatan.json", key: "sd" },   // :contentReference[oaicite:9]{index=9}
    { rel: "smp/data/data_kegiatan.json", key: "smp" }, // :contentReference[oaicite:10]{index=10}
    { rel: "paud/data/data_kegiatan.json", key: "paud" }, // :contentReference[oaicite:11]{index=11}
    { rel: "pkbm/data/data_kegiatan.json", key: "pkbm" }, // :contentReference[oaicite:12]{index=12}
  ];

  for (const f of files) {
    let arr;
    try {
      arr = await readJson(f.rel);
    } catch {
      console.warn("[SKIP] missing file:", f.rel);
      continue;
    }
    if (!Array.isArray(arr) || !arr.length) {
      console.warn("[SKIP] empty:", f.rel);
      continue;
    }

    // group by npsn
    const by = new Map();
    for (const r of arr) {
      const npsn = toText(r?.npsn);
      if (!npsn) continue;
      if (!by.has(npsn)) by.set(npsn, []);
      by.get(npsn).push(r);
    }

    const items = Array.from(by.entries()).map(([npsn, list]) => ({
      npsn,
      patch: { kegiatan: { [f.key]: list } },
    }));

    console.log(`[INFO] ${f.rel}: unique npsn = ${items.length}`);

    // patch bertahap (RPC Anda saat ini single)
    for (const part of chunk(items, 200)) {
      for (const it of part) {
        await patchOne(it.npsn, it.patch);
      }
      console.log(`  patched ${Math.min(part.length, items.length)} ...`);
    }
  }

  console.log("DONE patch kegiatan");
})();
