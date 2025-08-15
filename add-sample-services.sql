-- Add sample services for department 7c006a05-5ae3-46da-9b18-c6dd5db996d3
INSERT INTO services (id, name, description, estimated_time, department_id, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), 'General Consultation', 'Standard consultation service', 15, '7c006a05-5ae3-46da-9b18-c6dd5db996d3', true, now(), now()),
  (gen_random_uuid(), 'Document Processing', 'Document review and processing', 10, '7c006a05-5ae3-46da-9b18-c6dd5db996d3', true, now(), now()),
  (gen_random_uuid(), 'Information Request', 'General information and inquiries', 5, '7c006a05-5ae3-46da-9b18-c6dd5db996d3', true, now(), now());

-- Verify the services were created
SELECT s.*, d.name as department_name 
FROM services s 
JOIN departments d ON s.department_id = d.id 
WHERE s.department_id = '7c006a05-5ae3-46da-9b18-c6dd5db996d3';
