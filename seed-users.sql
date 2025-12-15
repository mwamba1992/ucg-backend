-- Seed Users for UCG API Testing
-- Password for all users: Test@123
-- Hashed with bcrypt (10 rounds)

-- Clear existing test users (optional - comment out if you want to keep existing data)
-- DELETE FROM users WHERE email LIKE '%@test.ucg%';

-- 1. Super Admin
INSERT INTO users (
  id,
  email,
  password,
  "firstName",
  "lastName",
  role,
  status,
  "phoneNumber",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'superadmin@ucg.co.tz',
  '$2b$10$YQj3VzW8qH4Y0xF1nZ7Svu6BV8kX9Y5N0uA1MZ8qD3v5V7W9X1Y2Z', -- Test@123
  'Super',
  'Admin',
  'SUPER_ADMIN',
  'ACTIVE',
  '+255711000001',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 2. Admin User
INSERT INTO users (
  id,
  email,
  password,
  "firstName",
  "lastName",
  role,
  status,
  "phoneNumber",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'admin@ucg.co.tz',
  '$2b$10$YQj3VzW8qH4Y0xF1nZ7Svu6BV8kX9Y5N0uA1MZ8qD3v5V7W9X1Y2Z', -- Test@123
  'Admin',
  'User',
  'ADMIN',
  'ACTIVE',
  '+255711000002',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 3. Manager User
INSERT INTO users (
  id,
  email,
  password,
  "firstName",
  "lastName",
  role,
  status,
  "phoneNumber",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'manager@ucg.co.tz',
  '$2b$10$YQj3VzW8qH4Y0xF1nZ7Svu6BV8kX9Y5N0uA1MZ8qD3v5V7W9X1Y2Z', -- Test@123
  'Manager',
  'User',
  'MANAGER',
  'ACTIVE',
  '+255711000003',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 4. Operator User
INSERT INTO users (
  id,
  email,
  password,
  "firstName",
  "lastName",
  role,
  status,
  "phoneNumber",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'operator@ucg.co.tz',
  '$2b$10$YQj3VzW8qH4Y0xF1nZ7Svu6BV8kX9Y5N0uA1MZ8qD3v5V7W9X1Y2Z', -- Test@123
  'Operator',
  'User',
  'OPERATOR',
  'ACTIVE',
  '+255711000004',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- 5. Viewer User
INSERT INTO users (
  id,
  email,
  password,
  "firstName",
  "lastName",
  role,
  status,
  "phoneNumber",
  "createdAt",
  "updatedAt"
) VALUES (
  gen_random_uuid(),
  'viewer@ucg.co.tz',
  '$2b$10$YQj3VzW8qH4Y0xF1nZ7Svu6BV8kX9Y5N0uA1MZ8qD3v5V7W9X1Y2Z', -- Test@123
  'Viewer',
  'User',
  'VIEWER',
  'ACTIVE',
  '+255711000005',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify inserted users
SELECT
  email,
  "firstName",
  "lastName",
  role,
  status,
  "createdAt"
FROM users
WHERE email LIKE '%@ucg.co.tz'
ORDER BY role, email;

-- User Summary
SELECT
  role,
  COUNT(*) as count,
  COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count
FROM users
GROUP BY role
ORDER BY role;
