// src/utils/csv.js
export function exportToCSV(rows, filename = "facilities.csv") {
  if (!Array.isArray(rows) || rows.length === 0) {
    alert("Tidak ada data untuk diexport.");
    return;
  }
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = (v ?? "").toString().replace(/"/g, '""');
    return `"${s}"`;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}
