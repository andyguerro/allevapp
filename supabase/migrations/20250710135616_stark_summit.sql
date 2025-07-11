/*
  # Add missing foreign key relationships

  1. Foreign Key Constraints
    - Add foreign key from reports.assigned_to to profiles.id
    - Add foreign key from reports.created_by to profiles.id  
    - Add foreign key from quotes.created_by to profiles.id

  2. Security
    - These constraints ensure data integrity between tables
    - Enable proper joins in Supabase queries

  Note: The reports table currently has foreign keys to users table, but the queries
  expect relationships to profiles table. Since profiles.id references users.id,
  we need to update the foreign keys to point to profiles instead.
*/

-- First, drop existing foreign key constraints that reference users table
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_assigned_to_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_created_by_fkey;
ALTER TABLE quotes DROP CONSTRAINT IF EXISTS quotes_created_by_fkey;

-- Add new foreign key constraints that reference profiles table
ALTER TABLE reports 
ADD CONSTRAINT reports_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES profiles(id);

ALTER TABLE reports 
ADD CONSTRAINT reports_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id);

ALTER TABLE quotes 
ADD CONSTRAINT quotes_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES profiles(id);