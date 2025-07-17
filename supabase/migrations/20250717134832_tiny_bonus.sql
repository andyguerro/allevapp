/*
  # Add farm-technicians relationship

  1. New Tables
    - `farm_technicians` (junction table)
      - `farm_id` (uuid, references farms.id)
      - `user_id` (uuid, references users.id)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `farm_technicians` table
    - Add policy for authenticated users to read/write their own data
*/

-- Create junction table for many-to-many relationship between farms and technicians
CREATE TABLE IF NOT EXISTS farm_technicians (
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (farm_id, user_id)
);

-- Enable RLS
ALTER TABLE farm_technicians ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all operations for authenticated users"
  ON farm_technicians
  FOR ALL
  TO public
  USING (true);

CREATE POLICY "Enable read access for all users"
  ON farm_technicians
  FOR SELECT
  TO public
  USING (true);