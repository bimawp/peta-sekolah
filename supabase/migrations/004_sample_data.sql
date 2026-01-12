-- Sample data for peta-sekolah application
-- This populates the database with initial regions and sample data

-- Insert regions (Kecamatan level)
INSERT INTO regions (name, type) VALUES
    ('Banjarwangi', 'kecamatan'),
    ('Cikelet', 'kecamatan'),
    ('Talagasari', 'kecamatan'),
    ('Wangunjaya', 'kecamatan');

-- Insert villages (Desa level)
INSERT INTO regions (name, type, parent_id) VALUES
    ('Kadongdong', 'desa', (SELECT id FROM regions WHERE name = 'Banjarwangi')),
    ('Tanjungjaya', 'desa', (SELECT id FROM regions WHERE name = 'Banjarwangi')),
    ('Banjarwangi', 'desa', (SELECT id FROM regions WHERE name = 'Banjarwangi')),
    ('Wangunjaya', 'desa', (SELECT id FROM regions WHERE name = 'Banjarwangi')),
    ('Linggamanik', 'desa', (SELECT id FROM regions WHERE name = 'Cikelet'));

-- Function to import JSON school data
CREATE OR REPLACE FUNCTION import_school_data(
    school_data JSON,
    region_name VARCHAR,
    school_type_param school_type
)
RETURNS UUID AS $$
DECLARE
    school_id UUID;
    region_id UUID;
    facility_data JSON;
    equipment_data JSON;
    class_data JSON;
    project_data JSON;
BEGIN
    -- Get region ID
    SELECT id INTO region_id FROM regions WHERE name = region_name AND type = 'kecamatan';
    
    -- Insert school
    INSERT INTO schools (
        name, npsn, address, village, region_id, school_type, ownership_type,
        latitude, longitude, student_count, st_male, st_female,
        land_area, building_area, yard_area
    ) VALUES (
        school_data->>'name',
        school_data->>'npsn',
        school_data->>'address',
        school_data->>'village',
        region_id,
        school_type_param,
        school_data->>'type',
        CASE 
            WHEN school_data->'coordinates'->0 IS NOT NULL AND 
                 (school_data->'coordinates'->0)::decimal != 0 
            THEN (school_data->'coordinates'->0)::decimal 
        END,
        CASE 
            WHEN school_data->'coordinates'->1 IS NOT NULL AND 
                 (school_data->'coordinates'->1)::decimal != 0 
            THEN (school_data->'coordinates'->1)::decimal 
        END,
        COALESCE((school_data->>'student_count')::integer, 0),
        COALESCE((school_data->>'st_male')::integer, 0),
        COALESCE((school_data->>'st_female')::integer, 0),
        COALESCE((school_data->'facilities'->>'land_area')::decimal, 0),
        COALESCE((school_data->'facilities'->>'building_area')::decimal, 0),
        COALESCE((school_data->'facilities'->>'yard_area')::decimal, 0)
    ) RETURNING id INTO school_id;
    
    -- Insert class conditions (classrooms)
    IF school_data->'class_condition' IS NOT NULL THEN
        INSERT INTO facilities (school_id, facility_type, total_count, good_condition, moderate_damage, heavy_damage, lacking_count)
        VALUES (
            school_id,
            'classroom',
            COALESCE((school_data->'class_condition'->>'total_room')::integer, 0),
            COALESCE((school_data->'class_condition'->>'classrooms_good')::integer, 0),
            COALESCE((school_data->'class_condition'->>'classrooms_moderate_damage')::integer, 0),
            COALESCE((school_data->'class_condition'->>'classrooms_heavy_damage')::integer, 0),
            COALESCE((school_data->'class_condition'->>'lacking_rkb')::integer, 0)
        );
    END IF;
    
    -- Insert student classes (for SD/SMP)
    IF school_data->'classes' IS NOT NULL THEN
        FOR i IN 1..6 LOOP
            IF school_data->'classes'->>(i::text || '_L') IS NOT NULL THEN
                INSERT INTO student_classes (school_id, grade, male_count, female_count, class_count)
                VALUES (
                    school_id,
                    i,
                    COALESCE((school_data->'classes'->>(i::text || '_L'))::integer, 0),
                    COALESCE((school_data->'classes'->>(i::text || '_P'))::integer, 0),
                    COALESCE((school_data->'rombel'->>i::text)::integer, 0)
                );
            END IF;
        END LOOP;
    END IF;
    
    -- Insert facilities (library, laboratories, etc.)
    IF school_data->'library' IS NOT NULL THEN
        INSERT INTO facilities (school_id, facility_type, total_count, good_condition, moderate_damage, heavy_damage)
        VALUES (
            school_id, 'library',
            COALESCE((school_data->'library'->>'total')::integer, (school_data->'library'->>'total_all')::integer, 0),
            COALESCE((school_data->'library'->>'good')::integer, 0),
            COALESCE((school_data->'library'->>'moderate_damage')::integer, 0),
            COALESCE((school_data->'library'->>'heavy_damage')::integer, 0)
        );
    END IF;
    
    -- Insert laboratory facilities
    DECLARE 
        lab_types TEXT[] := ARRAY['laboratory_comp', 'laboratory_langua', 'laboratory_ipa', 'laboratory_fisika', 'laboratory_biologi'];
        lab_type TEXT;
    BEGIN
        FOREACH lab_type IN ARRAY lab_types LOOP
            IF school_data->lab_type IS NOT NULL THEN
                INSERT INTO facilities (school_id, facility_type, total_count, good_condition, moderate_damage, heavy_damage)
                VALUES (
                    school_id, lab_type,
                    COALESCE((school_data->lab_type->>'total')::integer, (school_data->lab_type->>'total_all')::integer, 0),
                    COALESCE((school_data->lab_type->>'good')::integer, 0),
                    COALESCE((school_data->lab_type->>'moderate_damage')::integer, 0),
                    COALESCE((school_data->lab_type->>'heavy_damage')::integer, 0)
                );
            END IF;
        END LOOP;
    END;
    
    -- Insert room facilities
    DECLARE 
        room_types TEXT[] := ARRAY['kepsek_room', 'teacher_room', 'administration_room', 'uks_room'];
        room_type TEXT;
    BEGIN
        FOREACH room_type IN ARRAY room_types LOOP
            IF school_data->room_type IS NOT NULL THEN
                INSERT INTO facilities (school_id, facility_type, total_count, good_condition, moderate_damage, heavy_damage)
                VALUES (
                    school_id, room_type,
                    COALESCE((school_data->room_type->>'total')::integer, (school_data->room_type->>'total_all')::integer, 1),
                    COALESCE((school_data->room_type->>'good')::integer, 0),
                    COALESCE((school_data->room_type->>'moderate_damage')::integer, 0),
                    COALESCE((school_data->room_type->>'heavy_damage')::integer, 0)
                );
            END IF;
        END LOOP;
    END;
    
    -- Insert toilet facilities
    IF school_data->'toilets' IS NOT NULL THEN
        INSERT INTO facilities (school_id, facility_type, total_count, good_condition, moderate_damage, heavy_damage)
        VALUES (
            school_id, 'toilets',
            COALESCE((school_data->'toilets'->>'total')::integer, (school_data->'toilets'->>'available')::integer, 0),
            COALESCE((school_data->'toilets'->>'good')::integer, 0),
            COALESCE((school_data->'toilets'->>'moderate_damage')::integer, 0),
            COALESCE((school_data->'toilets'->>'heavy_damage')::integer, 0)
        );
    END IF;
    
    -- Insert gender-specific toilets
    IF school_data->'teachers_toilet' IS NOT NULL THEN
        INSERT INTO facilities (school_id, facility_type, facility_subtype, total_count, good_condition, moderate_damage, heavy_damage)
        VALUES 
            (school_id, 'teachers_toilet', 'male',
             COALESCE((school_data->'teachers_toilet'->'male'->>'total_all')::integer, 0),
             COALESCE((school_data->'teachers_toilet'->'male'->>'good')::integer, 0),
             COALESCE((school_data->'teachers_toilet'->'male'->>'moderate_damage')::integer, 0),
             COALESCE((school_data->'teachers_toilet'->'male'->>'heavy_damage')::integer, 0)),
            (school_id, 'teachers_toilet', 'female',
             COALESCE((school_data->'teachers_toilet'->'female'->>'total_all')::integer, 0),
             COALESCE((school_data->'teachers_toilet'->'female'->>'good')::integer, 0),
             COALESCE((school_data->'teachers_toilet'->'female'->>'moderate_damage')::integer, 0),
             COALESCE((school_data->'teachers_toilet'->'female'->>'heavy_damage')::integer, 0));
    END IF;
    
    IF school_data->'students_toilet' IS NOT NULL THEN
        INSERT INTO facilities (school_id, facility_type, facility_subtype, total_count, good_condition, moderate_damage, heavy_damage)
        VALUES 
            (school_id, 'students_toilet', 'male',
             COALESCE((school_data->'students_toilet'->'male'->>'total_all')::integer, 0),
             COALESCE((school_data->'students_toilet'->'male'->>'good')::integer, 0),
             COALESCE((school_data->'students_toilet'->'male'->>'moderate_damage')::integer, 0),
             COALESCE((school_data->'students_toilet'->'male'->>'heavy_damage')::integer, 0)),
            (school_id, 'students_toilet', 'female',
             COALESCE((school_data->'students_toilet'->'female'->>'total_all')::integer, 0),
             COALESCE((school_data->'students_toilet'->'female'->>'good')::integer, 0),
             COALESCE((school_data->'students_toilet'->'female'->>'moderate_damage')::integer, 0),
             COALESCE((school_data->'students_toilet'->'female'->>'heavy_damage')::integer, 0));
    END IF;
    
    -- Insert furniture/equipment
    IF school_data->'furniture_computer' IS NOT NULL THEN
        INSERT INTO equipment (school_id, equipment_type, total_count, needed_count)
        VALUES 
            (school_id, 'tables', 
             COALESCE((school_data->'furniture_computer'->>'tables')::integer, 0),
             COALESCE((school_data->'furniture_computer'->>'n_tables')::integer, 0)),
            (school_id, 'chairs',
             COALESCE((school_data->'furniture_computer'->>'chairs')::integer, 0),
             COALESCE((school_data->'furniture_computer'->>'n_chairs')::integer, 0)),
            (school_id, 'boards',
             COALESCE((school_data->'furniture_computer'->>'boards')::integer, 0), 0),
            (school_id, 'computer',
             COALESCE((school_data->'furniture_computer'->>'computer')::integer, 0), 0);
    END IF;
    
    -- Insert detailed furniture for SD/SMP
    IF school_data->'furniture' IS NOT NULL THEN
        INSERT INTO equipment (school_id, equipment_type, total_count, good_condition, moderate_damage, heavy_damage)
        VALUES 
            (school_id, 'tables',
             COALESCE((school_data->'furniture'->'tables'->>'total')::integer, 0),
             COALESCE((school_data->'furniture'->'tables'->>'good')::integer, 0),
             COALESCE((school_data->'furniture'->'tables'->>'moderate_damage')::integer, 0),
             COALESCE((school_data->'furniture'->'tables'->>'heavy_damage')::integer, 0)),
            (school_id, 'chairs',
             COALESCE((school_data->'furniture'->'chairs'->>'total')::integer, 0),
             COALESCE((school_data->'furniture'->'chairs'->>'good')::integer, 0),
             COALESCE((school_data->'furniture'->'chairs'->>'moderate_damage')::integer, 0),
             COALESCE((school_data->'furniture'->'chairs'->>'heavy_damage')::integer, 0));
    END IF;
    
    -- Insert building status
    IF school_data->'building_status' IS NOT NULL THEN
        INSERT INTO building_status (school_id, land_ownership, building_ownership, land_available)
        VALUES (
            school_id,
            CASE 
                WHEN school_data->'building_status'->'tanah'->>'yayasan' = 'Ya' THEN 'yayasan'
                WHEN school_data->'building_status'->'tanah'->>'hibah' = 'Ya' THEN 'hibah'
                WHEN school_data->'building_status'->'tanah'->>'pribadi' = 'Ya' THEN 'pribadi'
                ELSE NULL
            END::building_ownership,
            CASE 
                WHEN school_data->'building_status'->'gedung'->>'yayasan' = 'Ya' THEN 'yayasan'
                WHEN school_data->'building_status'->'gedung'->>'hibah' = 'Ya' THEN 'hibah'
                WHEN school_data->'building_status'->'gedung'->>'sewa' = 'Ya' THEN 'sewa'
                WHEN school_data->'building_status'->'gedung'->>'menumpang' = 'Ya' THEN 'menumpang'
                ELSE NULL
            END::building_ownership,
            COALESCE((school_data->'building_status'->'tanah'->>'land_available')::decimal, 0)
        );
    END IF;
    
    -- Insert special facilities for PAUD
    IF school_data->'ape' IS NOT NULL THEN
        INSERT INTO special_facilities (school_id, facility_name, available, condition)
        VALUES 
            (school_id, 'ape_luar',
             CASE WHEN school_data->'ape'->'luar'->>'available' = 'Ada' THEN TRUE ELSE FALSE END,
             CASE 
                WHEN school_data->'ape'->'luar'->>'condition' = 'Baik' THEN 'good'
                WHEN school_data->'ape'->'luar'->>'condition' = 'Rusak' THEN 'heavy_damage'
                ELSE NULL
             END::condition_type),
            (school_id, 'ape_dalam',
             CASE WHEN school_data->'ape'->'dalam'->>'available' = 'Ada' THEN TRUE ELSE FALSE END,
             CASE 
                WHEN school_data->'ape'->'dalam'->>'condition' = 'Baik' THEN 'good'
                WHEN school_data->'ape'->'dalam'->>'condition' = 'Rusak' THEN 'heavy_damage'
                ELSE NULL
             END::condition_type);
    END IF;
    
    IF school_data->'uks' IS NOT NULL THEN
        INSERT INTO special_facilities (school_id, facility_name, available)
        VALUES (
            school_id, 'uks',
            CASE WHEN school_data->'uks'->>'n_available' = 'Tidak Ada' THEN FALSE ELSE TRUE END
        );
    END IF;
    
    -- Insert staff information
    IF school_data->'teacher' IS NOT NULL OR school_data->'kepsek' IS NOT NULL THEN
        INSERT INTO school_staff (school_id, teachers_count, needed_teachers, tendik_count, principal_name, principal_status)
        VALUES (
            school_id,
            COALESCE((school_data->'teacher'->>'teachers')::integer, 0),
            COALESCE((school_data->'teacher'->>'n_teachers')::integer, 0),
            COALESCE((school_data->'teacher'->>'tendik')::integer, 0),
            CASE WHEN (school_data->'kepsek'->>'name')::integer = 0 THEN NULL ELSE 'Ada' END,
            CASE WHEN (school_data->'kepsek'->>'status')::integer = 0 THEN 'Tidak Ada' ELSE 'Ada' END
        );
    END IF;
    
    RETURN school_id;
END;
$ LANGUAGE plpgsql;

-- Function to import project/budget data
CREATE OR REPLACE FUNCTION import_project_data(
    project_json JSON,
    target_year INTEGER DEFAULT NULL
)
RETURNS UUID AS $
DECLARE
    project_id UUID;
    target_school_id UUID;
BEGIN
    -- Find school by NPSN
    SELECT id INTO target_school_id FROM schools 
    WHERE npsn = (project_json->>'npsn')::varchar;
    
    IF target_school_id IS NULL THEN
        RAISE NOTICE 'School with NPSN % not found', project_json->>'npsn';
        RETURN NULL;
    END IF;
    
    -- Insert project
    INSERT INTO projects (
        school_id, project_name, npsn, school_name, room_count,
        budget_allocation, physical_budget, method, year, status
    ) VALUES (
        target_school_id,
        project_json->>'Kegiatan',
        project_json->>'npsn',
        project_json->>'Nama Sekolah',
        COALESCE((project_json->>'Lokal')::integer, 0),
        CASE 
            WHEN project_json->>'Pagu Anggaran' IS NOT NULL 
            THEN REPLACE(project_json->>'Pagu Anggaran', ',', '')::decimal
            WHEN project_json->>'Pagu' IS NOT NULL
            THEN REPLACE(project_json->>'Pagu', ',', '')::decimal
            ELSE 0
        END,
        CASE 
            WHEN project_json->>'Pagu Fisik' IS NOT NULL 
            THEN REPLACE(project_json->>'Pagu Fisik', ',', '')::decimal
            WHEN project_json->>'Fisik' IS NOT NULL
            THEN REPLACE(project_json->>'Fisik', ',', '')::decimal
            ELSE 0
        END,
        project_json->>'Metoda',
        COALESCE(target_year, EXTRACT(year FROM NOW())),
        'ongoing'
    ) RETURNING id INTO project_id;
    
    RETURN project_id;
END;
$ LANGUAGE plpgsql;

-- Sample data insertion examples (based on provided JSON)
-- Note: In production, these would be imported via the application

-- Sample admin user setup (run after first user signup)
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- Sample data - this would typically be imported from your JSON files
-- Example for one PAUD school:
/*
SELECT import_school_data(
    '{"name": "AL-ALIFA", "npsn": "69826911", "address": "KP. CI SIIH", "village": "Kadongdong", "st_male": "11", "st_female": "12", "student_count": 23, "coordinates": [-7.392103, 107.91923], "type": "KB", "class_condition": {"classrooms_good": 0, "classrooms_moderate_damage": 0, "classrooms_heavy_damage": 1, "total_room": 1, "lacking_rkb": 1}, "building_status": {"tanah": {"hibah": "Ya", "land_available": 994}, "gedung": {"menumpang": "Ya"}}, "ape": {"luar": {"available": "Ada", "condition": "Rusak"}, "dalam": {"available": "Ada", "condition": "Baik"}}, "uks": {"n_available": "Tidak Ada"}}'::json,
    'Banjarwangi',
    'KB'
);
*/

-- Create view for school summary with all related data
CREATE OR REPLACE VIEW school_summary AS
SELECT 
    s.id,
    s.name,
    s.npsn,
    s.address,
    s.village,
    s.school_type,
    s.ownership_type,
    s.student_count,
    s.st_male,
    s.st_female,
    s.latitude,
    s.longitude,
    r.name as region_name,
    -- Facility summary
    (SELECT COUNT(*) FROM facilities f WHERE f.school_id = s.id AND f.facility_type = 'classroom' AND f.good_condition > 0) as good_classrooms,
    (SELECT COUNT(*) FROM facilities f WHERE f.school_id = s.id AND f.facility_type = 'classroom' AND f.moderate_damage > 0) as damaged_classrooms,
    (SELECT COUNT(*) FROM facilities f WHERE f.school_id = s.id AND f.facility_type = 'classroom' AND f.heavy_damage > 0) as heavily_damaged_classrooms,
    -- Project summary
    (SELECT COUNT(*) FROM projects p WHERE p.school_id = s.id AND p.year = EXTRACT(year FROM NOW())) as current_year_projects,
    (SELECT COALESCE(SUM(budget_allocation), 0) FROM projects p WHERE p.school_id = s.id AND p.year = EXTRACT(year FROM NOW())) as current_year_budget,
    s.created_at,
    s.updated_at
FROM schools s
LEFT JOIN regions r ON s.region_id = r.id;