-- Manually insert services for the Bakery department
INSERT INTO services (id, name, description, estimated_time, department_id, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Pizza', 'Fresh baked pizza service', 20, '621f6609-db7f-47af-a613-0d8256b67219', true, now(), now()),
  (gen_random_uuid(), 'Desserts', 'Sweet desserts and pastries', 10, '621f6609-db7f-47af-a613-0d8256b67219', true, now(), now()),
  (gen_random_uuid(), 'Bread & Pastries', 'Fresh bread and morning pastries', 15, '621f6609-db7f-47af-a613-0d8256b67219', true, now(), now());

-- Verify the services were created
SELECT s.*, d.name as department_name 
FROM services s 
JOIN departments d ON s.department_id = d.id 
WHERE s.department_id = '621f6609-db7f-47af-a613-0d8256b67219';

-- Check if any services exist in the entire table
SELECT COUNT(*) as total_services FROM services;
