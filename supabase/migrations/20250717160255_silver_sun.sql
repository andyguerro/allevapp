/*
  # Add project_id column to quotes table

  1. Changes
    - Add `project_id` column to `quotes` table as nullable UUID
    - Add foreign key constraint to reference `projects` table
    - Add index for better query performance

  2. Security
    - Column is nullable to maintain backward compatibility
    - Foreign key ensures data integrity
*/

-- Add project_id column to quotes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN project_id uuid;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'quotes_project_id_fkey'
  ) THEN
    ALTER TABLE quotes 
    ADD CONSTRAINT quotes_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_project_id ON quotes(project_id);