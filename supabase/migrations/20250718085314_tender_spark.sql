/*
  # Add username and password columns to users table

  1. Changes to users table
    - Add `username` column (text, unique)
    - Add `password` column (text)
    - Generate usernames from existing full_name data
    - Generate secure random passwords for existing users

  2. Data Migration
    - Convert existing full names to username format (nome.cognome)
    - Handle duplicate usernames by adding numbers
    - Generate 8-character random passwords for all existing users

  3. Security
    - Username column has unique constraint
    - Both columns are required (NOT NULL)
    - Existing RLS policies remain unchanged
*/

-- Add username column (nullable initially for data migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;

-- Add password column (nullable initially for data migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password text;

-- Function to generate username from full name
CREATE OR REPLACE FUNCTION generate_username(full_name_input text)
RETURNS text AS $$
DECLARE
  base_username text;
  final_username text;
  counter integer := 1;
BEGIN
  -- Convert full name to lowercase username format
  base_username := lower(trim(regexp_replace(full_name_input, '\s+', '.', 'g')));
  
  -- Remove special characters except dots
  base_username := regexp_replace(base_username, '[^a-z0-9.]', '', 'g');
  
  -- Start with base username
  final_username := base_username;
  
  -- Check for duplicates and add number if needed
  WHILE EXISTS (SELECT 1 FROM users WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  
  RETURN final_username;
END;
$$ LANGUAGE plpgsql;

-- Function to generate random password
CREATE OR REPLACE FUNCTION generate_random_password()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update existing users with generated usernames and passwords
UPDATE users 
SET 
  username = generate_username(full_name),
  password = generate_random_password()
WHERE username IS NULL OR password IS NULL;

-- Make columns NOT NULL after data migration
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE users ALTER COLUMN password SET NOT NULL;

-- Add unique constraint to username
ALTER TABLE users ADD CONSTRAINT users_username_unique UNIQUE (username);

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Drop the helper functions as they're no longer needed
DROP FUNCTION IF EXISTS generate_username(text);
DROP FUNCTION IF EXISTS generate_random_password();