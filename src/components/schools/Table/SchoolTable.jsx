// src/components/schools/Table/SchoolTable.jsx
import React, { useEffect, useMemo, useState } from "react";
import DetailLink from "../../common/DetailLink.jsx";
import { getSchoolsFiltered } from "../../../services/api/schoolApi.js";

export default function SchoolTable({
  jenjang = "Semua Jenjang",
  kecamatan = "Semua Kecamatan",
  village = "Semua Desa",
  pageSize = 50,
}) {
  const [state, setState] = useState({
    rows: [],
    count: 0,
    page: 1,
    loading: true,
    error: null,
    search: "",
  });

  const { rows, count, page, loading, error, search } = state;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((count || 0) / pageSize)),
    [count, pageSize]
  );

  async function load(p = 1) {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { data, count: c, error: err } = await getSchoolsFiltered({
      jenjang,
      kecamatan,
      village,
      page: p,
      pageSize,
      orderBy: "name",
    });
    if (err) {
      setState((s) => ({ ...s, loading: false, error: err }));
    } else {
      // simple client-side search by name / npsn
      const filtered = (data || []).filter((r) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (r.name || "").toLowerCase().includes(q) ||
          (r.npsn || "").toLowerCase().includes(q)
        );
      });
      setState((s) => ({
        ...s,
        rows: filtered,
        count: c || filtered.length,
        page: p,
        loading: false,
        error: null,
      }));
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jenjang, kecamatan, village, pageSize]);

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setState((s) => ({ ...s, search: e.target.value }))}
          onKeyDown={(e) => e.key === "Enter" && load(1)}
          placeholder="🔍 Cari nama sekolah, NPSN…"
          className="border rounded px-3 py-2 w-full"
        />
        <button
          className="border rounded px-3 py-2"
          onClick={() => setState((s) => ({ ...s, search: "" }), load(1))}
          title="Reset"
        >
          Reset
        </button>
      </div>

      <div className="text-sm mb-2">
        Menampilkan halaman <b>{page}</b> dari <b>{totalPages}</b>{" "}
        {loading ? "(memuat…)" : ""}
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-[960px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">NO</th>
              <th className="text-left p-2">NPSN</th>
              <th className="text-left p-2">NAMA</th>
              <th className="text-left p-2">TIPE/JENJANG</th>
              <th className="text-left p-2">DESA</th>
              <th className="text-left p-2">KECAMATAN</th>
              <th className="text-left p-2">SISWA</th>
              <th className="text-left p-2">DETAIL</th>
            </tr>
          </thead>
          <tbody>
            {error && (
              <tr>
                <td colSpan={8} className="p-3 text-red-600">
                  Error: {error.message}
                </td>
              </tr>
            )}
            {!error && loading && (
              <tr>
                <td colSpan={8} className="p-3">
                  Memuat data…
                </td>
              </tr>
            )}
            {!error && !loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="p-3">
                  Tidak ada data.
                </td>
              </tr>
            )}
            {!error &&
              !loading &&
              rows.map((r, i) => (
                <tr key={r.id ?? `${r.npsn}-${i}`} className="border-t">
                  <td className="p-2">{(page - 1) * pageSize + i + 1}</td>
                  <td className="p-2">{r.npsn || "-"}</td>
                  <td className="p-2">{r.name || "-"}</td>
                  <td className="p-2">{`${r.type || "-"} / ${r.jenjang || r.level || "-"}`}</td>
                  <td className="p-2">{r.village || "-"}</td>
                  <td className="p-2">{r.kecamatan || "-"}</td>
                  <td className="p-2">{r.student_count ?? 0}</td>
                  <td className="p-2">
                    <DetailLink
                      npsn={r.npsn}
                      jenjang={r.jenjang}
                      level={r.level}
                      className="px-2 py-1 border rounded hover:bg-gray-50"
                    />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          className="border rounded px-3 py-2"
          onClick={() => page > 1 && load(page - 1)}
          disabled={page <= 1 || loading}
        >
          ◀ Prev
        </button>
        <div className="px-2">Halaman {page} / {totalPages}</div>
        <button
          className="border rounded px-3 py-2"
          onClick={() => page < totalPages && load(page + 1)}
          disabled={page >= totalPages || loading}
        >
          Next ▶
        </button>
      </div>
    </div>
  );
}
