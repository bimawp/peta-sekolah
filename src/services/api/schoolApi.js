// src/services/api/schoolApi.js

// Contoh fungsi API untuk ambil data sekolah berdasarkan provinsi
export async function getSchoolsByProvince(provinceId) {
  // Contoh fetch, sesuaikan endpoint API kamu
  const response = await fetch(`/api/schools?province=${provinceId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch schools');
  }
  const data = await response.json();
  return data;
}

// Buat objek default export supaya bisa import default di slice
const schoolApi = {
  getSchoolsByProvince,
};

export default schoolApi;
