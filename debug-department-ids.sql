-- Find the correct Bakery department ID and its services
SELECT 
    d.id as department_id,
    d.name as department_name,
    d.branch_id,
    b.name as branch_name,
    COUNT(s.id) as service_count
FROM departments d
LEFT JOIN branches b ON d.branch_id = b.id  
LEFT JOIN services s ON d.id = s.department_id
WHERE d.name ILIKE '%bakery%'
GROUP BY d.id, d.name, d.branch_id, b.name;

-- Also check what department has the ID from the URL
SELECT 
    d.id,
    d.name as department_name,
    b.name as branch_name
FROM departments d
LEFT JOIN branches b ON d.branch_id = b.id
WHERE d.id = '7c006a05-5ae3-46da-9b18-c6dd5db996d3';

-- List all services for any department that might be the Bakery
SELECT 
    d.name as department_name,
    s.name as service_name,
    s.is_active,
    s.department_id
FROM services s
JOIN departments d ON s.department_id = d.id
WHERE d.name ILIKE '%bakery%';
