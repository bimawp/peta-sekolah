// src/pages/Map/mapUtils.js

/**
 * Menganalisis kondisi fasilitas sekolah berdasarkan data kerusakan.
 * @param {object} school - Objek data sekolah.
 * @returns {string} - Nama kondisi ("Rusak Berat", "Kekurangan RKB", "Rusak Sedang", "Baik/Rehabilitasi", "default").
 */
export const analyzeFacilityCondition = (school) => {
    const classCondition = school.class_condition || {};
    if (Number(classCondition.classrooms_heavy_damage) > 0) return "Rusak Berat";
    if (Number(classCondition.lacking_rkb) > 0) return "Kekurangan RKB";
    if (Number(classCondition.classrooms_moderate_damage) > 0) return "Rusak Sedang";
    if (Number(classCondition.classrooms_good) > 0) return "Baik/Rehabilitasi";
    return "default";
};