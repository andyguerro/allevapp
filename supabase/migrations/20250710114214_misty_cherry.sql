/*
  # Create suppliers table

  1. New Tables
    - `suppliers`
      - `id` (uuid, primary key)
      - `name` (text, not null)
      - `email` (text, not null)
      - `phone` (text)
      - `address` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on suppliers table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all suppliers"
  ON suppliers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage suppliers"
  ON suppliers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );