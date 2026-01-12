-- FILE: supabase/migrations/..._complete_optimizations.sql

-- LANGKAH 1: OPTIMASI TABEL SCHOOLS DENGAN POSTGIS (TANPA MENGHAPUS DATA)

-- Aktifkan ekstensi jika belum aktif (aman dijalankan berkali-kali)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Tambahkan kolom 'location' baru ke tabel schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

-- Isi kolom 'location' baru dengan data dari 'latitude' dan 'longitude'
-- Ini hanya akan berjalan jika kolom 'location' masih kosong
UPDATE public.schools
SET location = ST_MakePoint(longitude, latitude)::geography
WHERE longitude IS NOT NULL AND latitude IS NOT NULL AND location IS NULL;

-- Buat index spasial jika belum ada
CREATE INDEX IF NOT EXISTS schools_location_idx ON public.schools USING gist (location);

-- Hapus kolom lama SETELAH data berhasil dipindahkan
ALTER TABLE public.schools
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude;

-----------------------------------------------------------------------------------

-- LANGKAH 2: TERAPKAN KEBIJAKAN KEAMANAN (RLS) YANG AMAN

-- Aktifkan RLS di tabel-tabel penting
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_conditions ENABLE ROW LEVEL SECURITY;
-- (Tambahkan ALTER TABLE untuk tabel lain yang ingin Anda amankan)

-- Hapus kebijakan lama yang mungkin terlalu terbuka agar tidak konflik
DROP POLICY IF EXISTS "Allow public read access" ON public.schools;

-- Kebijakan baru yang aman untuk tabel 'schools'
CREATE POLICY "Allow authenticated users to read schools"
ON public.schools FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins to insert schools"
ON public.schools FOR INSERT TO authenticated WITH CHECK ((SELECT role FROM public.profile WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY "Allow admins to update schools"
ON public.schools FOR UPDATE TO authenticated USING ((SELECT role FROM public.profile WHERE user_id = auth.uid()) = 'admin');

CREATE POLICY "Allow admins to delete schools"
ON public.schools FOR DELETE TO authenticated USING ((SELECT role FROM public.profile WHERE user_id = auth.uid()) = 'admin');

-----------------------------------------------------------------------------------

-- LANGKAH 3: BUAT DATABASE VIEW UNTUK DASHBOARD

CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
  s.id AS school_id,
  s.name AS school_name,
  s.npsn,
  s.type AS school_type,
  s.level AS school_level,
  s.village,
  k.name AS principal_name,
  k.status AS principal_status,
  s.student_count,
  cc.classrooms_good,
  cc.classrooms_moderate_damage,
  cc.classrooms_heavy_damage,
  cc.lacking_rkb,
  cc.total_mh AS total_damaged_classrooms,
  t.total AS total_toilets
FROM
  public.schools s
  LEFT JOIN public.kepsek k ON s.id = k.school_id
  LEFT JOIN public.class_conditions cc ON s.id = cc.school_id
  LEFT JOIN public.toilets t ON s.id = t.school_id;

-- Terapkan keamanan pada VIEW ini
ALTER VIEW public.dashboard_stats ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada untuk menghindari error
DROP POLICY IF EXISTS "Allow authenticated users to read dashboard stats" ON public.dashboard_stats;

-- Buat policy baru
CREATE POLICY "Allow authenticated users to read dashboard stats"
ON public.dashboard_stats FOR SELECT TO authenticated USING (true);