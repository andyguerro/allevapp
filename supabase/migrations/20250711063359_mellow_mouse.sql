/*
  # Add maintenance fields to equipment table

  1. Changes
    - Add `next_maintenance_due` field to equipment table
    - Add `maintenance_interval_days` field to equipment table
    - Add index for maintenance due dates
    - Update existing equipment records with default values

  2. Security
    - No changes to RLS policies needed
*/

-- Add maintenance fields to equipment table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'next_maintenance_due'
  ) THEN
    ALTER TABLE equipment ADD COLUMN next_maintenance_due date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment' AND column_name = 'maintenance_interval_days'
  ) THEN
    ALTER TABLE equipment ADD COLUMN maintenance_interval_days integer DEFAULT 365;
  END IF;
END $$;

-- Add index for maintenance due dates
CREATE INDEX IF NOT EXISTS idx_equipment_next_maintenance 
ON equipment(next_maintenance_due);

-- Update existing equipment records with default maintenance interval
UPDATE equipment 
SET maintenance_interval_days = 365 
WHERE maintenance_interval_days IS NULL;