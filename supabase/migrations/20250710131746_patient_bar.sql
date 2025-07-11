/*
  # Create storage bucket for attachments

  1. Storage Setup
    - Create 'attachments' bucket for file storage
    - Set bucket as private (not public)

  2. Security Policies
    - Users can upload files to attachments bucket
    - Users can view files they uploaded or files for reports they have access to
    - Users can delete files they uploaded
    - Admins have full access to all files

  3. Access Control
    - Based on report ownership (created_by or assigned_to)
    - Admin role checking using profiles table
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
CREATE POLICY "Users can upload attachments"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Users can view accessible attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'attachments' AND (
    -- Users can access files they uploaded
    owner = auth.uid() OR
    -- Users can access files for reports they created or are assigned to
    EXISTS (
      SELECT 1 FROM attachments a
      JOIN reports r ON a.entity_id = r.id
      WHERE a.file_path = name
      AND a.entity_type = 'report'
      AND (r.created_by = auth.uid() OR r.assigned_to = auth.uid())
    ) OR
    -- Admins can access all files
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);

CREATE POLICY "Users can delete their attachments"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'attachments' AND (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
);