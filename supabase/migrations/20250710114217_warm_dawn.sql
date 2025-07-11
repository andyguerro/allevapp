/*
  # Create equipment table

  1. New Tables
    - `equipment`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `model` (text)
      - `serial_number` (text)
      - `farm_id` (uuid, foreign key to farms)
      - `barn_id` (uuid, foreign key to barns, optional)
      - `status` (text, check constraint)
      - `description` (text)
      - `last_maintenance` (date)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on equipment table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model text,
  serial_number text,
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE NOT NULL,
  barn_id uuid REFERENCES barns(id) ON DELETE SET NULL,
  status text CHECK (status IN ('working', 'not_working', 'regenerated', 'repaired')) DEFAULT 'working',
  description text,
  last_maintenance date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all equipment"
  ON equipment
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage equipment"
  ON equipment
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );