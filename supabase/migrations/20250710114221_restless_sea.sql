/*
  # Create reports table

  1. New Tables
    - `reports`
      - `id` (uuid, primary key)
      - `title` (text, not null)
      - `description` (text, not null)
      - `barn_id` (uuid, foreign key to barns)
      - `equipment_id` (uuid, foreign key to equipment, optional)
      - `supplier_id` (uuid, foreign key to suppliers, optional)
      - `assigned_to` (uuid, foreign key to auth.users)
      - `created_by` (uuid, foreign key to auth.users)
      - `urgency` (text, check constraint)
      - `status` (text, check constraint)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on reports table
    - Add policies for users to manage their own reports and admins to manage all
*/

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  barn_id uuid REFERENCES barns(id) ON DELETE CASCADE NOT NULL,
  equipment_id uuid REFERENCES equipment(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) NOT NULL,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  urgency text CHECK (urgency IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status text CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_reports_updated_at 
    BEFORE UPDATE ON reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view reports they created or are assigned to
CREATE POLICY "Users can view their reports"
  ON reports
  FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update their own reports or assigned reports
CREATE POLICY "Users can update their reports"
  ON reports
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Only admins can delete reports
CREATE POLICY "Admins can delete reports"
  ON reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );