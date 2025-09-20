/**
 * Menganalisis kondisi fasilitas sekolah untuk menentukan status dominan.
 * @param {object} school - Objek data sekolah dari API.
 * @returns {string} - Status kondisi (mis. "Rusak Berat", "Kekurangan RKB").
 */
export const analyzeFacilityCondition = (school) => {
    if (!school) return "Data Tidak Lengkap";

    const rusakBerat = school.classrooms_heavy_damage || 0;
    const kekuranganRKB = school.lacking_rkb || 0;
    const rusakSedang = school.classrooms_moderate_damage || 0;

    if (rusakBerat > 0) return "Rusak Berat";
    if (kekuranganRKB > 0) return "Kekurangan RKB";
    if (rusakSedang > 0) return "Rusak Sedang";

    return "Baik/Rehabilitasi";
};