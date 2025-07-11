/*
  # Fix Reports-Farms Relationship

  1. Database Changes
    - Ensure foreign key constraint exists between reports.farm_id and farms.id
    - Add index for better query performance

  2. Security
    - No changes to existing RLS policies
*/

-- Ensure the foreign key constraint exists
-- First, check if it already exists and drop it if needed to recreate it properly
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_farm_id_fkey' 
    AND table_name = 'reports'
  ) THEN
    ALTER TABLE public.reports DROP CONSTRAINT reports_farm_id_fkey;
  END IF;
END $$;

-- Add the foreign key constraint
ALTER TABLE public.reports 
ADD CONSTRAINT reports_farm_id_fkey 
FOREIGN KEY (farm_id) REFERENCES public.farms(id) ON DELETE CASCADE;

-- Add index for better performance on farm_id lookups
CREATE INDEX IF NOT EXISTS idx_reports_farm_id ON public.reports(farm_id);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';