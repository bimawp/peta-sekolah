-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.


CREATE TABLE public.profiles (
  id_profile uuid NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['divisi_sd'::text, 'divisi_smp'::text, 'divisi_paud'::text, 'divisi_pkbm'::text, 'divisi_gtk'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id_profile),
  CONSTRAINT profiles_id_profile_fkey FOREIGN KEY (id_profile) REFERENCES auth.users(id)
);

CREATE TABLE public.school_classes (
  id integer NOT NULL DEFAULT nextval('school_classes_id_seq'::regclass),
  school_id uuid,
  grade text NOT NULL,
  count integer DEFAULT 0,
  extra jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT school_classes_pkey PRIMARY KEY (id),
  CONSTRAINT school_classes_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);
CREATE TABLE public.school_types (
  id integer NOT NULL DEFAULT nextval('school_types_id_seq'::regclass),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  CONSTRAINT school_types_pkey PRIMARY KEY (id)
);
CREATE TABLE public.schools (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  npsn text UNIQUE,
  address text,
  location_id integer,
  village_name text,
  school_type_id integer,
  status text,
  student_count integer,
  st_male integer,
  st_female integer,
  lat double precision,
  lng double precision,
  facilities jsonb,
  class_condition jsonb,
  meta jsonb,
  contact jsonb,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  kecamatan_name text,
  details jsonb,
  kecamatan text,
  CONSTRAINT schools_pkey PRIMARY KEY (id),
  CONSTRAINT schools_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id),
  CONSTRAINT schools_school_type_id_fkey FOREIGN KEY (school_type_id) REFERENCES public.school_types(id)
);
CREATE TABLE public.staff_summary (
  id integer NOT NULL DEFAULT nextval('staff_summary_id_seq'::regclass),
  school_id uuid,
  role text NOT NULL,
  count integer DEFAULT 0,
  details jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT staff_summary_pkey PRIMARY KEY (id),
  CONSTRAINT staff_summary_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id)
);