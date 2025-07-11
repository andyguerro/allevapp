/*
  # Update attachments table to support facilities

  1. Changes
    - Update entity_type enum to include 'facility'
    - This allows attachments to be linked to facilities as well as reports, equipment, and quotes

  2. Security
    - Existing RLS policies will continue to work
    - No changes needed to security model
*/

-- Update the check constraint to include 'facility'
ALTER TABLE attachments 
DROP CONSTRAINT IF EXISTS attachments_entity_type_check;

ALTER TABLE attachments 
ADD CONSTRAINT attachments_entity_type_check 
CHECK (entity_type = ANY (ARRAY['report'::text, 'equipment'::text, 'quote'::text, 'facility'::text]));