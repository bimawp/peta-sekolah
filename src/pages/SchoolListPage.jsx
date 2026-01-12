// src/pages/SchoolListPage.jsx
import React, { useEffect, useState } from "react";
import SchoolTable from "../components/schools/Table/SchoolTable.jsx";
import { getAllSchoolsPaginated } from "../services/api/schoolApi.js";

export default function SchoolListPage() {
  const [info, setInfo] = useState({ total: 0, loading: true, error: null });

  useEffect(() => {
    (async () => {
      const { data, error } = await getAllSchoolsPaginated();
      if (error) setInfo({ total: 0, loading: false, error });
      else setInfo({ total: data?.length || 0, loading: false, error: null });
    })();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">📊 Data Detail Sekolah</h1>
      <div className="text-sm">
        {info.loading
          ? "Memuat ringkasan…"
          : info.error
          ? `Error ringkasan: ${info.error.message}`
          : `Tabel lengkap ${info.total} data sekolah (target 4842)`}
      </div>

      {/* Filter simple—kamu bisa sambungkan ke UI filter punya kamu */}
      <SchoolTable
        jenjang="Semua Jenjang"
        kecamatan="Semua Kecamatan"
        village="Semua Desa"
        pageSize={50}
      />
    </div>
  );
}
