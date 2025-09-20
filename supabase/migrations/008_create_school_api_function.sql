-- Membuat fungsi untuk mengambil data sekolah di area pandang peta dengan filter
-- Ini akan dipanggil dari aplikasi React untuk mendapatkan data secara dinamis

CREATE OR REPLACE FUNCTION get_schools_in_view(
    min_lng float,
    min_lat float,
    max_lng float,
    max_lat float,
    p_jenjang text,
    p_kecamatan text,
    p_desa text,
    p_facility text -- Argumen ini ditambahkan tetapi logika filter ada di frontend
)
RETURNS TABLE (
    -- Kolom-kolom yang dibutuhkan oleh frontend untuk popup dan filtering
    npsn text,
    name text,
    village text,
    kecamatan text,
    jenjang text,
    lintang float,
    bujur float,
    student_count integer,
    -- Menambahkan data fasilitas dari tabel lain untuk analisis di frontend
    classrooms_good integer,
    classrooms_moderate_damage integer,
    classrooms_heavy_damage integer,
    lacking_rkb integer
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.npsn,
        s.name,
        s.village,
        r.name as kecamatan,
        s.school_type::text as jenjang,
        ST_Y(s.location::geometry) as lintang,
        ST_X(s.location::geometry) as bujur,
        s.student_count,
        -- Mengambil data kondisi kelas, asumsikan ada tabel `class_conditions`
        -- Jika tidak ada tabel ini, Anda bisa set nilainya ke 0 atau join ke tabel `facilities`
        COALESCE(cc.classrooms_good, 0),
        COALESCE(cc.classrooms_moderate_damage, 0),
        COALESCE(cc.classrooms_heavy_damage, 0),
        COALESCE(cc.lacking_rkb, 0)
    FROM public.schools s
    -- Join dengan tabel regions untuk mendapatkan nama kecamatan
    LEFT JOIN public.regions r ON s.region_id = r.id AND r.type = 'kecamatan'
    -- Join dengan tabel kondisi kelas (pastikan nama tabel dan kolomnya benar)
    LEFT JOIN public.class_conditions cc ON s.id = cc.school_id
    WHERE
        -- 1. Filter geospasial yang sangat cepat menggunakan GIST index
        s.location && ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)

        -- 2. Terapkan filter tambahan jika nilainya bukan 'all'
        AND (p_jenjang = 'all' OR s.school_type::text ILIKE p_jenjang)
        AND (p_kecamatan = 'all' OR r.name ILIKE p_kecamatan)
        AND (p_desa = 'all' OR s.village ILIKE p_desa)

    LIMIT 1000; -- Batasi hasil untuk mencegah data yang terlalu besar
END;
$$ LANGUAGE plpgsql;