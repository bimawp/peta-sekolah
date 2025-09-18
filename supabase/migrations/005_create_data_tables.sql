-- 1. Tambahkan kolom 'location' dengan tipe data geospasial
ALTER TABLE public.schools
ADD COLUMN location geography(Point, 4326);

-- 2. Isi kolom baru dengan data dari kolom 'latitude' and 'longitude'
UPDATE public.schools
SET location = ST_MakePoint(longitude, latitude)::geography
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

-- 3. Buat GIST index untuk pencarian spasial yang sangat cepat
CREATE INDEX schools_location_idx
ON public.schools
USING gist (location);

-- 4. Hapus kolom 'latitude' dan 'longitude' yang lama
ALTER TABLE public.schools
DROP COLUMN latitude,
DROP COLUMN longitude;