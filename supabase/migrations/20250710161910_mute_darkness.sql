/*
  # Add maintenance scheduling system

  1. Database Changes
    - Add next_maintenance_due field to equipment table
    - Create facilities table for farm facilities management
    - Add maintenance_interval field for automatic scheduling

  2. New Tables
    - `facilities`
      - `id` (uuid, primary key)
      - `name` (text, required)
      - `type` (text, check constraint)
      - `farm_id` (uuid, foreign key to farms)
      - `description` (text)
      - `status` (text, check constraint)
      - `last_maintenance` (date)
      - `next_maintenance_due` (date)
      - `maintenance_interval_days` (integer)
      - `created_at` (timestamp)

  3. Security
    - Enable RLS on facilities table
    - Add policies for read and management access
*/

-- Add maintenance scheduling fields to equipment table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'next_maintenance_due'
  ) THEN
    ALTER TABLE equipment ADD COLUMN next_maintenance_due date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'maintenance_interval_days'
  ) THEN
    ALTER TABLE equipment ADD COLUMN maintenance_interval_days integer DEFAULT 365;
  END IF;
END $$;

-- Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text CHECK (type IN ('electrical', 'plumbing', 'ventilation', 'heating', 'cooling', 'lighting', 'security', 'other')) DEFAULT 'other',
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE NOT NULL,
  description text,
  status text CHECK (status IN ('working', 'not_working', 'maintenance_required', 'under_maintenance')) DEFAULT 'working',
  last_maintenance date,
  next_maintenance_due date,
  maintenance_interval_days integer DEFAULT 365,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on facilities table
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;

-- Create policies for facilities
CREATE POLICY "Enable read access for all users" ON facilities
  FOR SELECT USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON facilities
  FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance ON equipment(next_maintenance_due);
CREATE INDEX IF NOT EXISTS idx_facilities_next_maintenance ON facilities(next_maintenance_due);
CREATE INDEX IF NOT EXISTS idx_facilities_farm_id ON facilities(farm_id);

-- Update existing equipment with calculated next maintenance dates
UPDATE equipment 
SET next_maintenance_due = CASE 
  WHEN last_maintenance IS NOT NULL THEN 
    last_maintenance + INTERVAL '1 year'
  ELSE 
    CURRENT_DATE + INTERVAL '1 year'
END
WHERE next_maintenance_due IS NULL;

-- Insert sample facilities
DO $$
DECLARE
  farm_nord_id uuid;
  farm_sud_id uuid;
BEGIN
  -- Get farm IDs
  SELECT id INTO farm_nord_id FROM farms WHERE name = 'Allevamento Nord' LIMIT 1;
  SELECT id INTO farm_sud_id FROM farms WHERE name = 'Allevamento Sud' LIMIT 1;
  
  -- Insert facilities if farms exist
  IF farm_nord_id IS NOT NULL THEN
    INSERT INTO facilities (name, type, farm_id, description, status, last_maintenance, next_maintenance_due, maintenance_interval_days) VALUES
    ('Impianto Elettrico Principale', 'electrical', farm_nord_id, 'Quadro elettrico generale dell''allevamento', 'working', '2024-01-15', '2025-01-15', 365),
    ('Sistema Idraulico Stalla A', 'plumbing', farm_nord_id, 'Impianto idraulico della stalla A', 'working', '2023-12-10', '2024-12-10', 365),
    ('Ventilazione Automatica', 'ventilation', farm_nord_id, 'Sistema di ventilazione automatico delle stalle', 'maintenance_required', '2023-11-20', '2024-11-20', 180)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF farm_sud_id IS NOT NULL THEN
    INSERT INTO facilities (name, type, farm_id, description, status, last_maintenance, next_maintenance_due, maintenance_interval_days) VALUES
    ('Illuminazione LED Generale', 'lighting', farm_sud_id, 'Sistema di illuminazione LED di tutto l''allevamento', 'working', '2024-01-05', '2026-01-05', 730),
    ('Impianto di Riscaldamento', 'heating', farm_sud_id, 'Sistema di riscaldamento per l''inverno', 'working', '2023-10-15', '2024-10-15', 365),
    ('Sistema di Sicurezza', 'security', farm_sud_id, 'Telecamere e allarmi di sicurezza', 'under_maintenance', '2024-01-01', '2025-01-01', 365)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;