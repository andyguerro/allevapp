/*
  # Remove barn field from equipment table

  1. Changes
    - Remove barn_id column from equipment table
    - Remove foreign key constraint to barns table
    - Update any existing data to remove barn references

  2. Security
    - No changes to RLS policies needed
*/

-- Remove the foreign key constraint first
ALTER TABLE equipment DROP CONSTRAINT IF EXISTS equipment_barn_id_fkey;

-- Remove the barn_id column
ALTER TABLE equipment DROP COLUMN IF EXISTS barn_id;