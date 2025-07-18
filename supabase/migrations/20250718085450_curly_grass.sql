/*
  # Create Admin User - Andrea Guerrini

  1. New User
    - Creates admin user with username "andrea.guerrini"
    - Password: "Alleva25!"
    - Role: admin
    - Active: true

  2. User Details
    - Full name: "Andrea Guerrini"
    - Email: "andrea.guerrini@zoogamma.it"
    - Username: "andrea.guerrini"
    - Role: admin (full system access)
*/

-- Insert admin user Andrea Guerrini
INSERT INTO users (
  id,
  full_name,
  email,
  username,
  password,
  role,
  active,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Andrea Guerrini',
  'andrea.guerrini@zoogamma.it',
  'andrea.guerrini',
  'Alleva25!',
  'admin',
  true,
  now(),
  now()
) ON CONFLICT (username) DO UPDATE SET
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  active = EXCLUDED.active,
  updated_at = now();