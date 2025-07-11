/*
  # Create projects table

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `description` (text, optional)
      - `project_number` (text, unique, auto-generated)
      - `company` (text, required, check constraint)
      - `sequential_number` (integer, required)
      - `farm_id` (uuid, foreign key to farms)
      - `status` (text, default 'active')
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `projects` table
    - Add policies for authenticated users

  3. Functions
    - Function to get next sequential number for company
    - Function to generate project number
    - Trigger to auto-generate project number on insert
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  project_number text UNIQUE NOT NULL,
  company text NOT NULL,
  sequential_number integer NOT NULL,
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add constraints
ALTER TABLE projects ADD CONSTRAINT projects_company_check 
CHECK (company = ANY (ARRAY['Zoogamma Spa'::text, 'So. Agr. Zooagri Srl'::text, 'Soc. Agr. Zooallevamenti Srl'::text]));

ALTER TABLE projects ADD CONSTRAINT projects_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'completed'::text, 'cancelled'::text, 'on_hold'::text]));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company);
CREATE INDEX IF NOT EXISTS idx_projects_farm_id ON projects(farm_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all operations for authenticated users"
  ON projects
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users"
  ON projects
  FOR SELECT
  TO public
  USING (true);

-- Function to get next sequential number for a company
CREATE OR REPLACE FUNCTION get_next_project_number(company_name text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COALESCE(MAX(sequential_number), 0) + 1
  INTO next_number
  FROM projects
  WHERE company = company_name;
  
  RETURN next_number;
END;
$$;

-- Function to generate project number based on company
CREATE OR REPLACE FUNCTION generate_project_number(company_name text, seq_number integer)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  prefix text;
BEGIN
  CASE company_name
    WHEN 'Zoogamma Spa' THEN prefix := 'ZG';
    WHEN 'So. Agr. Zooagri Srl' THEN prefix := 'ZR';
    WHEN 'Soc. Agr. Zooallevamenti Srl' THEN prefix := 'ZL';
    ELSE prefix := 'PR';
  END CASE;
  
  RETURN prefix || seq_number::text;
END;
$$;

-- Trigger function to auto-generate project number
CREATE OR REPLACE FUNCTION auto_generate_project_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  next_seq integer;
  project_num text;
BEGIN
  -- Get farm company
  SELECT company INTO NEW.company
  FROM farms
  WHERE id = NEW.farm_id;
  
  -- Get next sequential number
  SELECT get_next_project_number(NEW.company) INTO next_seq;
  
  -- Generate project number
  SELECT generate_project_number(NEW.company, next_seq) INTO project_num;
  
  -- Set values
  NEW.sequential_number := next_seq;
  NEW.project_number := project_num;
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_auto_generate_project_number
  BEFORE INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_project_number();

-- Add updated_at trigger
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();