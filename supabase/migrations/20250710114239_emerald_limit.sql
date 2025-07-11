/*
  # Create attachments table

  1. New Tables
    - `attachments`
      - `id` (uuid, primary key)
      - `entity_type` (text, check constraint)
      - `entity_id` (uuid, not null)
      - `file_name` (text, not null)
      - `file_path` (text, not null)
      - `custom_label` (text)
      - `file_size` (bigint)
      - `mime_type` (text)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to auth.users)

  2. Security
    - Enable RLS on attachments table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text CHECK (entity_type IN ('report', 'equipment', 'quote')) NOT NULL,
  entity_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  custom_label text,
  file_size bigint,
  mime_type text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL
);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for entities they have access to
CREATE POLICY "Users can view accessible attachments"
  ON attachments
  FOR SELECT
  TO authenticated
  USING (
    (entity_type = 'report' AND EXISTS (
      SELECT 1 FROM reports 
      WHERE reports.id = attachments.entity_id 
      AND (reports.created_by = auth.uid() OR reports.assigned_to = auth.uid())
    )) OR
    (entity_type = 'equipment' AND true) OR -- All users can view equipment attachments
    (entity_type = 'quote' AND EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = attachments.entity_id
    )) OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can create attachments for entities they can access
CREATE POLICY "Users can create attachments"
  ON attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (entity_type = 'report' AND EXISTS (
      SELECT 1 FROM reports 
      WHERE reports.id = attachments.entity_id 
      AND (reports.created_by = auth.uid() OR reports.assigned_to = auth.uid())
    )) OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can delete their own attachments or admins can delete any
CREATE POLICY "Users can delete their attachments"
  ON attachments
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );