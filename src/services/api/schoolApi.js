// src/services/api/schoolApi.js

// Ambil data sekolah berdasarkan provinsi dari backend (Supabase)
export async function getSchoolsByProvince(provinceId) {
  // Sesuaikan endpoint API kamu
  const response = await fetch(`/api/schools?province=${provinceId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch schools');
  }
  const data = await response.json();
  return data;
}

// Default export untuk slice
const schoolApi = {
  getSchoolsByProvince,
};

export default schoolApi;
