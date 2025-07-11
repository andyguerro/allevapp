/*
  # Create farms and barns tables

  1. New Tables
    - `farms`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `address` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)
    - `barns`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `farm_id` (uuid, foreign key to farms)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their data
*/

CREATE TABLE IF NOT EXISTS farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS barns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE barns ENABLE ROW LEVEL SECURITY;

-- Policies for farms
CREATE POLICY "Users can view all farms"
  ON farms
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage farms"
  ON farms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Policies for barns
CREATE POLICY "Users can view all barns"
  ON barns
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage barns"
  ON barns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );