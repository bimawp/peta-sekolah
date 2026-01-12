-- Database functions for peta-sekolah application
-- These functions provide computed fields and analytics

-- Function to get school summary statistics
CREATE OR REPLACE FUNCTION get_school_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_schools', (SELECT COUNT(*) FROM schools),
        'by_type', (
            SELECT json_object_agg(school_type, count)
            FROM (
                SELECT school_type, COUNT(*) as count
                FROM schools
                GROUP BY school_type
            ) t
        ),
        'by_region', (
            SELECT json_object_agg(r.name, count)
            FROM (
                SELECT r.name, COUNT(s.*) as count
                FROM regions r
                LEFT JOIN schools s ON s.region_id = r.id
                WHERE r.type = 'kecamatan'
                GROUP BY r.name
            ) r
        ),
        'total_students', (
            SELECT COALESCE(SUM(student_count), 0) FROM schools
        ),
        'students_by_gender', (
            SELECT json_build_object(
                'male', COALESCE(SUM(st_male), 0),
                'female', COALESCE(SUM(st_female), 0)
            )
            FROM schools
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get facility condition summary
CREATE OR REPLACE FUNCTION get_facility_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'classroom_condition', (
            SELECT json_build_object(
                'good', COALESCE(SUM(good_condition), 0),
                'moderate_damage', COALESCE(SUM(moderate_damage), 0),
                'heavy_damage', COALESCE(SUM(heavy_damage), 0),
                'total', COALESCE(SUM(total_count), 0)
            )
            FROM facilities
            WHERE facility_type = 'classroom'
        ),
        'toilet_condition', (
            SELECT json_build_object(
                'good', COALESCE(SUM(good_condition), 0),
                'moderate_damage', COALESCE(SUM(moderate_damage), 0),
                'heavy_damage', COALESCE(SUM(heavy_damage), 0),
                'total', COALESCE(SUM(total_count), 0)
            )
            FROM facilities
            WHERE facility_type LIKE '%toilet%'
        ),
        'laboratory_condition', (
            SELECT json_build_object(
                'good', COALESCE(SUM(good_condition), 0),
                'moderate_damage', COALESCE(SUM(moderate_damage), 0),
                'heavy_damage', COALESCE(SUM(heavy_damage), 0),
                'total', COALESCE(SUM(total_count), 0)
            )
            FROM facilities
            WHERE facility_type LIKE 'laboratory_%'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get budget summary
CREATE OR REPLACE FUNCTION get_budget_stats(target_year INTEGER DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
    filter_year INTEGER;
BEGIN
    filter_year := COALESCE(target_year, EXTRACT(year FROM NOW()));
    
    SELECT json_build_object(
        'year', filter_year,
        'total_projects', (
            SELECT COUNT(*) FROM projects WHERE year = filter_year
        ),
        'total_budget', (
            SELECT COALESCE(SUM(budget_allocation), 0) FROM projects WHERE year = filter_year
        ),
        'total_physical', (
            SELECT COALESCE(SUM(physical_budget), 0) FROM projects WHERE year = filter_year
        ),
        'by_status', (
            SELECT json_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM projects
                WHERE year = filter_year
                GROUP BY status
            ) t
        ),
        'by_activity', (
            SELECT json_object_agg(project_name, stats)
            FROM (
                SELECT 
                    project_name,
                    json_build_object(
                        'count', COUNT(*),
                        'budget', SUM(budget_allocation),
                        'rooms', SUM(room_count)
                    ) as stats
                FROM projects
                WHERE year = filter_year
                GROUP BY project_name
            ) t
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get school detail with all related data
CREATE OR REPLACE FUNCTION get_school_detail(school_npsn VARCHAR)
RETURNS JSON AS $$
DECLARE
    result JSON;
    school_data RECORD;
BEGIN
    -- Get basic school info
    SELECT * INTO school_data FROM schools WHERE npsn = school_npsn;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'School not found');
    END IF;
    
    SELECT json_build_object(
        'basic_info', row_to_json(school_data),
        'region', (
            SELECT json_build_object('name', r.name, 'type', r.type)
            FROM regions r WHERE r.id = school_data.region_id
        ),
        'student_classes', (
            SELECT COALESCE(json_agg(row_to_json(sc)), '[]'::json)
            FROM student_classes sc WHERE sc.school_id = school_data.id
        ),
        'facilities', (
            SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json)
            FROM facilities f WHERE f.school_id = school_data.id
        ),
        'equipment', (
            SELECT COALESCE(json_agg(row_to_json(e)), '[]'::json)
            FROM equipment e WHERE e.school_id = school_data.id
        ),
        'building_status', (
            SELECT row_to_json(bs) FROM building_status bs WHERE bs.school_id = school_data.id
        ),
        'special_facilities', (
            SELECT COALESCE(json_agg(row_to_json(sf)), '[]'::json)
            FROM special_facilities sf WHERE sf.school_id = school_data.id
        ),
        'staff', (
            SELECT row_to_json(ss) FROM school_staff ss WHERE ss.school_id = school_data.id
        ),
        'projects', (
            SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json)
            FROM projects p WHERE p.school_id = school_data.id
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search schools with filters
CREATE OR REPLACE FUNCTION search_schools(
    search_text VARCHAR DEFAULT NULL,
    school_types VARCHAR[] DEFAULT NULL,
    region_ids UUID[] DEFAULT NULL,
    has_facilities VARCHAR[] DEFAULT NULL,
    limit_count INTEGER DEFAULT 50,
    offset_count INTEGER DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    where_conditions TEXT[] := '{}';
    sql_query TEXT;
BEGIN
    -- Build dynamic WHERE conditions
    IF search_text IS NOT NULL AND search_text != '' THEN
        where_conditions := array_append(where_conditions, 
            format('(s.name ILIKE %L OR s.npsn ILIKE %L OR s.address ILIKE %L)', 
                '%' || search_text || '%', '%' || search_text || '%', '%' || search_text || '%'));
    END IF;
    
    IF school_types IS NOT NULL AND array_length(school_types, 1) > 0 THEN
        where_conditions := array_append(where_conditions,
            format('s.school_type = ANY(%L)', school_types));
    END IF;
    
    IF region_ids IS NOT NULL AND array_length(region_ids, 1) > 0 THEN
        where_conditions := array_append(where_conditions,
            format('s.region_id = ANY(%L)', region_ids));
    END IF;
    
    -- Build final query
    sql_query := format('
        SELECT json_build_object(
            ''schools'', json_agg(
                json_build_object(
                    ''id'', s.id,
                    ''name'', s.name,
                    ''npsn'', s.npsn,
                    ''address'', s.address,
                    ''village'', s.village,
                    ''school_type'', s.school_type,
                    ''ownership_type'', s.ownership_type,
                    ''student_count'', s.student_count,
                    ''coordinates'', json_build_array(s.latitude, s.longitude),
                    ''region'', r.name
                )
            ),
            ''total'', COUNT(*)
        )
        FROM schools s
        LEFT JOIN regions r ON s.region_id = r.id
        %s
        ORDER BY s.name
        LIMIT %s OFFSET %s',
        CASE 
            WHEN array_length(where_conditions, 1) > 0 
            THEN 'WHERE ' || array_to_string(where_conditions, ' AND ')
            ELSE ''
        END,
        limit_count,
        offset_count
    );
    
    EXECUTE sql_query INTO result;
    
    RETURN COALESCE(result, json_build_object('schools', '[]'::json, 'total', 0));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analytics by region
CREATE OR REPLACE FUNCTION get_region_analytics(region_name VARCHAR DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'schools_by_type', (
            SELECT json_object_agg(school_type, count)
            FROM (
                SELECT s.school_type, COUNT(*) as count
                FROM schools s
                JOIN regions r ON s.region_id = r.id
                WHERE (region_name IS NULL OR r.name = region_name)
                GROUP BY s.school_type
            ) t
        ),
        'students_by_type', (
            SELECT json_object_agg(school_type, total_students)
            FROM (
                SELECT s.school_type, SUM(s.student_count) as total_students
                FROM schools s
                JOIN regions r ON s.region_id = r.id
                WHERE (region_name IS NULL OR r.name = region_name)
                GROUP BY s.school_type
            ) t
        ),
        'facility_needs', (
            SELECT json_object_agg(facility_type, lacking_total)
            FROM (
                SELECT f.facility_type, SUM(f.lacking_count) as lacking_total
                FROM facilities f
                JOIN schools s ON f.school_id = s.id
                JOIN regions r ON s.region_id = r.id
                WHERE (region_name IS NULL OR r.name = region_name)
                AND f.lacking_count > 0
                GROUP BY f.facility_type
            ) t
        ),
        'budget_summary', (
            SELECT json_build_object(
                'total_budget', COALESCE(SUM(budget_allocation), 0),
                'total_projects', COUNT(*),
                'completed_projects', COUNT(*) FILTER (WHERE status = 'completed')
            )
            FROM projects p
            JOIN schools s ON p.school_id = s.id
            JOIN regions r ON s.region_id = r.id
            WHERE (region_name IS NULL OR r.name = region_name)
            AND p.year = EXTRACT(year FROM NOW())
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user profile creation after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'viewer'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();