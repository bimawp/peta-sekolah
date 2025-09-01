-- Initial database schema for peta-sekolah application
-- This creates the core tables for schools, regions, budgets, and facilities

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE school_type AS ENUM ('KB', 'PKBM', 'SD', 'SMP', 'SMA', 'SMK');
CREATE TYPE condition_type AS ENUM ('good', 'moderate_damage', 'heavy_damage');
CREATE TYPE building_ownership AS ENUM ('yayasan', 'hibah', 'pribadi', 'sewa', 'menumpang');
CREATE TYPE project_status AS ENUM ('planned', 'ongoing', 'completed', 'cancelled');

-- Regions table
CREATE TABLE regions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- kecamatan, desa
    parent_id UUID REFERENCES regions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schools table
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    npsn VARCHAR(20) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    village VARCHAR(100),
    region_id UUID REFERENCES regions(id),
    school_type school_type NOT NULL,
    ownership_type VARCHAR(50), -- Negeri, Swasta
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    student_count INTEGER DEFAULT 0,
    st_male INTEGER DEFAULT 0,
    st_female INTEGER DEFAULT 0,
    land_area DECIMAL(10, 2),
    building_area DECIMAL(10, 2),
    yard_area DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student classes (for detailed breakdown)
CREATE TABLE student_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    grade INTEGER, -- 1-6 for SD, 7-9 for SMP
    male_count INTEGER DEFAULT 0,
    female_count INTEGER DEFAULT 0,
    class_count INTEGER DEFAULT 0, -- rombel
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Facilities table
CREATE TABLE facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    facility_type VARCHAR(100) NOT NULL, -- classroom, library, laboratory_comp, etc
    facility_subtype VARCHAR(100), -- male, female for toilets; ipa, fisika for labs
    total_count INTEGER DEFAULT 0,
    good_condition INTEGER DEFAULT 0,
    moderate_damage INTEGER DEFAULT 0,
    heavy_damage INTEGER DEFAULT 0,
    total_mh INTEGER DEFAULT 0, -- total moderate + heavy damage
    lacking_count INTEGER DEFAULT 0, -- lacking_rkb
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Furniture and equipment
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    equipment_type VARCHAR(100) NOT NULL, -- tables, chairs, boards, computer
    total_count INTEGER DEFAULT 0,
    good_condition INTEGER DEFAULT 0,
    moderate_damage INTEGER DEFAULT 0,
    heavy_damage INTEGER DEFAULT 0,
    needed_count INTEGER DEFAULT 0, -- n_tables, n_chairs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Building status
CREATE TABLE building_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    land_ownership building_ownership,
    building_ownership building_ownership,
    land_available DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Special facilities for PAUD
CREATE TABLE special_facilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    facility_name VARCHAR(100) NOT NULL, -- ape_luar, ape_dalam, uks, playground, rgks
    available BOOLEAN DEFAULT FALSE,
    condition condition_type,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budget/Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL, -- Pembangunan RKB, Rehab Ruang Kelas
    npsn VARCHAR(20) NOT NULL,
    school_name VARCHAR(255) NOT NULL,
    room_count INTEGER DEFAULT 0, -- Lokal
    budget_allocation DECIMAL(15, 2), -- Pagu Anggaran
    physical_budget DECIMAL(15, 2), -- Pagu Fisik
    method VARCHAR(100), -- Hibah Uang, etc
    status project_status DEFAULT 'planned',
    notes TEXT,
    year INTEGER DEFAULT EXTRACT(year FROM NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Teachers and staff
CREATE TABLE school_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    teachers_count INTEGER DEFAULT 0,
    needed_teachers INTEGER DEFAULT 0,
    tendik_count INTEGER DEFAULT 0, -- tenaga kependidikan
    principal_name VARCHAR(255),
    principal_status VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_schools_npsn ON schools(npsn);
CREATE INDEX idx_schools_type ON schools(school_type);
CREATE INDEX idx_schools_region ON schools(region_id);
CREATE INDEX idx_schools_coordinates ON schools(latitude, longitude);
CREATE INDEX idx_facilities_school ON facilities(school_id);
CREATE INDEX idx_facilities_type ON facilities(facility_type);
CREATE INDEX idx_projects_school ON projects(school_id);
CREATE INDEX idx_projects_year ON projects(year);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_status_updated_at BEFORE UPDATE ON building_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_special_facilities_updated_at BEFORE UPDATE ON special_facilities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_school_staff_updated_at BEFORE UPDATE ON school_staff
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();