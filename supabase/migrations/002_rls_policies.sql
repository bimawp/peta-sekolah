-- Row Level Security (RLS) policies for peta-sekolah application
-- This ensures proper access control for different user roles

-- Enable RLS on all tables
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_staff ENABLE ROW LEVEL SECURITY;

-- Create user roles enum
CREATE TYPE user_role AS ENUM ('admin', 'viewer', 'operator');

-- Create profiles table for user management
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    role user_role DEFAULT 'viewer',
    region_id UUID REFERENCES regions(id), -- assigned region for operators
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can manage all profiles" ON profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin' AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check user's assigned region
CREATE OR REPLACE FUNCTION user_region()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT region_id FROM profiles 
        WHERE id = auth.uid() AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Regions policies
CREATE POLICY "Anyone can view regions" ON regions
    FOR SELECT USING (TRUE);

CREATE POLICY "Only admins can manage regions" ON regions
    FOR ALL USING (is_admin());

-- Schools policies
CREATE POLICY "Anyone can view schools" ON schools
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage all schools" ON schools
    FOR ALL USING (is_admin());

CREATE POLICY "Operators can manage schools in their region" ON schools
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN regions r ON p.region_id = r.id
            WHERE p.id = auth.uid() 
            AND p.role = 'operator'
            AND p.is_active = TRUE
            AND (schools.region_id = p.region_id OR r.parent_id = p.region_id)
        )
    );

-- Student classes policies
CREATE POLICY "Anyone can view student classes" ON student_classes
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage student classes" ON student_classes
    FOR ALL USING (is_admin());

CREATE POLICY "Operators can manage classes in their region" ON student_classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM schools s
            JOIN profiles p ON p.region_id = s.region_id
            WHERE s.id = student_classes.school_id
            AND p.id = auth.uid()
            AND p.role = 'operator'
            AND p.is_active = TRUE
        )
    );

-- Facilities policies
CREATE POLICY "Anyone can view facilities" ON facilities
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage facilities" ON facilities
    FOR ALL USING (is_admin());

CREATE POLICY "Operators can manage facilities in their region" ON facilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM schools s
            JOIN profiles p ON p.region_id = s.region_id
            WHERE s.id = facilities.school_id
            AND p.id = auth.uid()
            AND p.role = 'operator'
            AND p.is_active = TRUE
        )
    );

-- Equipment policies
CREATE POLICY "Anyone can view equipment" ON equipment
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage equipment" ON equipment
    FOR ALL USING (is_admin());

CREATE POLICY "Operators can manage equipment in their region" ON equipment
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM schools s
            JOIN profiles p ON p.region_id = s.region_id
            WHERE s.id = equipment.school_id
            AND p.id = auth.uid()
            AND p.role = 'operator'
            AND p.is_active = TRUE
        )
    );

-- Building status policies
CREATE POLICY "Anyone can view building status" ON building_status
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage building status" ON building_status
    FOR ALL USING (is_admin());

-- Special facilities policies (for PAUD)
CREATE POLICY "Anyone can view special facilities" ON special_facilities
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage special facilities" ON special_facilities
    FOR ALL USING (is_admin());

-- Projects/Budget policies
CREATE POLICY "Anyone can view projects" ON projects
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage projects" ON projects
    FOR ALL USING (is_admin());

CREATE POLICY "Operators can manage projects in their region" ON projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM schools s
            JOIN profiles p ON p.region_id = s.region_id
            WHERE s.id = projects.school_id
            AND p.id = auth.uid()
            AND p.role = 'operator'
            AND p.is_active = TRUE
        )
    );

-- School staff policies
CREATE POLICY "Anyone can view school staff" ON school_staff
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage school staff" ON school_staff
    FOR ALL USING (is_admin());

-- Create trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial admin user (will be created after first auth signup)
-- Note: This will be handled in the application setup