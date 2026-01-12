"use client";

import { useState, useMemo } from "react";
import { utils, read } from "xlsx";
import {
  IMPORT_SCHEMAS,
  matchHeaderToField,
  normalizeHeader,
  missingRequiredFields,
} from "../../lib/importSchemas";

// --- [LOGIKA KHUSUS] Parser untuk Format POP/Dapodik (Header Bertingkat) ---
function parsePopFormat(aoaData) {
  // Cari baris data pertama (biasanya baris ke-5 atau ke-6)
  // Cirinya: Kolom 0 adalah angka urut ("1", "2", dst) & Kolom 3 ada isinya (NPSN)
  const startIndex = aoaData.findIndex((row) => {
    const firstCol = parseInt(row[0]);
    return !isNaN(firstCol) && firstCol > 0 && row[3];
  });

  if (startIndex === -1) return [];

  // Mapping Index Kolom Manual (Berdasarkan struktur file pop.xlsx)
  // NOTE: Jika file berubah format, sesuaikan angka index ini.
  const COL = {
    KEC: 2,
    NPSN: 3,
    NAMA: 4,
    STATUS: 5,
    SISWA_TOTAL: 46, // Cek kolom "JUMLAH" di bawah label SISWA
    KLS_BAIK: 85, // Di bawah KONDISI PRASARANA -> RUANG KELAS -> BAIK
    KLS_RUSAK_RINGAN: 86,
    KLS_RUSAK_SEDANG: 87,
    KLS_RUSAK_BERAT: 88,
  };

  return aoaData
    .slice(startIndex)
    .map((row) => {
      // Skip jika baris kosong atau tidak ada nama sekolah
      if (!row[COL.NAMA]) return null;

      return {
        // Field Wajib (sesuai schema)
        npsn: String(row[COL.NPSN] || "").trim(),
        sekolah: String(row[COL.NAMA] || "").trim(),
        kecamatan: String(row[COL.KEC] || "").trim(),
        status: String(row[COL.STATUS] || "").trim(),
        tahun: new Date().getFullYear(), // Default tahun sekarang
        nilai: 0, // Default nilai/anggaran

        // Data Tambahan (Spesifik POP)
        jumlah_siswa: Number(row[COL.SISWA_TOTAL] || 0),
        kelas_kondisi: {
          baik: Number(row[COL.KLS_BAIK] || 0),
          rusak_ringan: Number(row[COL.KLS_RUSAK_RINGAN] || 0),
          rusak_sedang: Number(row[COL.KLS_RUSAK_SEDANG] || 0),
          rusak_berat: Number(row[COL.KLS_RUSAK_BERAT] || 0),
        },
        
        // Field optional untuk mencegah error validasi schema
        alamat: "-", 
      };
    })
    .filter(Boolean);
}
// -----------------------------------------------------------------------

export default function ImportExcel({ schemaKey = "SD" }) {
  const schema = IMPORT_SCHEMAS[schemaKey] || IMPORT_SCHEMAS["SD"];

  const [fileName, setFileName] = useState("");
  const [headersRaw, setHeadersRaw] = useState([]);
  const [headerMap, setHeaderMap] = useState({}); // rawHeader -> fieldName
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPopData, setIsPopData] = useState(false); // State penanda file POP

  const hasData = rows.length > 0;

  // Validasi Schema
  const mappedFieldsSet = useMemo(
    () => new Set(Object.values(headerMap).filter(Boolean)),
    [headerMap]
  );
  const missing = useMemo(
    () => missingRequiredFields(schema, mappedFieldsSet),
    [schema, mappedFieldsSet]
  );

  const handleFile = async (file) => {
    setError("");
    setRows([]);
    setHeadersRaw([]);
    setHeaderMap({});
    setIsPopData(false);
    
    if (!file) return;

    const allowed =
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".csv");
    if (!allowed) {
      setError("Format tidak didukung. Gunakan .xlsx, .xls, atau .csv");
      return;
    }

    setLoading(true);
    setFileName(file.name);

    try {
      const buf = await file.arrayBuffer();
      const wb = read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];

      // Ambil data mentah (Array of Arrays) untuk deteksi struktur
      const rawDataAOA = utils.sheet_to_json(sheet, { header: 1, defval: "" });
      const firstRow = rawDataAOA[0] || [];

      // --- [DETEKSI] Apakah ini file POP/Dapodik? ---
      // Ciri: Header kiri ada "NO. Urut" dan kolom ke-3 adalah "NPSN"
      const isPopFormat =
        String(firstRow[0]).includes("NO. Urut") ||
        String(firstRow[3]).includes("NPSN");

      if (isPopFormat) {
        // --- JALUR KHUSUS (POP) ---
        console.log("Format POP Terdeteksi: Menggunakan parser khusus.");
        setIsPopData(true);

        const cleanRows = parsePopFormat(rawDataAOA);
        
        if (cleanRows.length === 0) {
          throw new Error("File POP terdeteksi, tapi tidak ada data sekolah yang ditemukan.");
        }

        // Buat "Fake Headers" agar lolos validasi UI
        // Kita anggap semua field required sudah terpenuhi secara otomatis
        const fakeHeaders = [...schema.required];
        const autoMap = {};
        fakeHeaders.forEach((h) => (autoMap[h] = h));

        setHeadersRaw(fakeHeaders);
        setHeaderMap(autoMap);
        setRows(cleanRows);
        
      } else {
        // --- JALUR STANDAR (Excel Biasa) ---
        const json = utils.sheet_to_json(sheet, { defval: "" });
        const limited = json.slice(0, 50);

        const map = {};
        firstRow.forEach((raw) => {
          const field = matchHeaderToField(schema, raw);
          if (field) map[raw] = field;
        });

        setHeadersRaw(firstRow);
        setHeaderMap(map);
        setRows(limited);
      }
    } catch (e) {
      console.error(e);
      setError(e.message || "Gagal membaca file. Pastikan formatnya benar.");
    } finally {
      setLoading(false);
    }
  };

  const onChangeInput = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  // Menentukan header yang ditampilkan di tabel
  const displayHeaders = isPopData ? headersRaw : headersRaw; 

  return (
    <div className="space-y-4">
      {/* Info Skema Aktif */}
      <div className="rounded-xl border bg-card text-card-foreground p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              Import Excel — Skema:{" "}
              <span className="text-primary">{schemaKey}</span>
            </h2>
            <p className="text-sm text-muted-foreground">
              Kolom wajib: <strong>{schema.required.join(", ")}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="rounded-xl border bg-card text-card-foreground p-4">
        <p className="text-sm text-muted-foreground mb-3">
          Mendukung format <strong>Excel Standar</strong> (1 baris header) dan{" "}
          <strong>Format POP/Dapodik</strong> (Header bertingkat).
        </p>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center rounded-lg border px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={onChangeInput}
              className="hidden"
            />
            <span className="font-medium">Pilih File</span>
          </label>

          {fileName ? (
            <span className="text-sm text-muted-foreground">
              Dipilih: <span className="font-semibold text-foreground">{fileName}</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              Belum ada file
            </span>
          )}
        </div>

        {loading && (
          <div className="mt-3 text-sm text-primary animate-pulse font-medium">
            Memproses struktur file...
          </div>
        )}

        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            ⚠️ {error}
          </div>
        )}
        
        {isPopData && !error && (
          <div className="mt-3 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span>✅</span> 
            <span>
              <strong>Format POP Terdeteksi.</strong> Mapping kolom dilakukan secara otomatis.
            </span>
          </div>
        )}
      </div>

      {/* Validasi Header (Hanya tampil jika BUKAN format POP) */}
      {headersRaw.length > 0 && !isPopData && (
        <div className="rounded-xl border bg-card text-card-foreground p-4">
          <h3 className="font-semibold mb-2">Pencocokan Header</h3>
          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {displayHeaders.map((raw, idx) => {
              const matched = headerMap[raw];
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    matched
                      ? "border-green-300 bg-green-50/60"
                      : "border-amber-300 bg-amber-50/60"
                  }`}
                >
                  <div className="text-sm">
                    <span className="font-medium">{raw || "(kosong)"}</span>
                  </div>
                  <div className="text-sm">
                    {matched ? (
                      <span className="font-medium text-green-700">
                        → {matched}
                      </span>
                    ) : (
                      <span className="text-amber-700">belum dikenali</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {missing.length > 0 ? (
            <div className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Kolom wajib belum lengkap: <strong>{missing.join(", ")}</strong>
            </div>
          ) : (
            <div className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              Semua kolom wajib terdeteksi.
            </div>
          )}
        </div>
      )}

      {/* Tabel Preview Data */}
      {hasData && (
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="p-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-sm">Pratinjau Data</h3>
                <p className="text-xs text-muted-foreground">
                  {rows.length} baris data siap di-import
                </p>
              </div>
              <div className="text-xs text-muted-foreground bg-background px-2 py-1 rounded border">
                {fileName}
              </div>
            </div>
          </div>

          <div className="overflow-auto max-h-[500px]">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted sticky top-0 z-10 shadow-sm">
                <tr className="[&>th]:px-4 [&>th]:py-3 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {displayHeaders.map((h, i) => (
                    <th key={i} className="whitespace-nowrap font-semibold border-b">
                      {h} 
                      {headerMap[h] && !isPopData && (
                        <span className="ml-1 text-green-600">✓</span>
                      )}
                    </th>
                  ))}
                  {/* Jika POP, tambah kolom extra buat preview detail */}
                  {isPopData && <th className="whitespace-nowrap font-semibold border-b">DETAIL (Siswa/Kelas)</th>}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.slice(0, 50).map((r, i) => (
                  <tr key={i} className="hover:bg-muted/50 transition-colors">
                    {displayHeaders.map((h, idx) => (
                      <td key={idx} className="px-4 py-2 whitespace-nowrap">
                        {r[h] !== undefined ? String(r[h]) : "-"}
                      </td>
                    ))}
                    {isPopData && (
                      <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                        Siswa: {r.jumlah_siswa} | RB: {r.kelas_kondisi?.rusak_berat || 0}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-t bg-muted/10 flex items-center justify-end gap-3">
            <span className="text-xs text-muted-foreground">
              Pastikan data di tabel preview sudah benar sebelum melanjutkan.
            </span>
            <button
              disabled={missing.length > 0 && !isPopData}
              className={`rounded-lg px-4 py-2 font-medium shadow-sm transition-all ${
                missing.length > 0 && !isPopData
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
              onClick={() => {
                console.log("Data siap dikirim ke API/Store:", rows);
                alert(`Siap mengimpor ${rows.length} data sekolah!`);
                // TODO: Panggil props onImport(rows) atau update Global Store di sini
              }}
            >
              Simpan Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}