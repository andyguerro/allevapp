/*
  # Add attachment categories system

  1. New Tables
    - `attachment_categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `color` (text, hex color)
      - `icon` (text, icon name)
      - `created_at` (timestamp)

  2. Changes
    - Add `category_id` to `attachments` table
    - Add foreign key constraint

  3. Security
    - Enable RLS on `attachment_categories` table
    - Add policies for public access
*/

-- Create attachment categories table
CREATE TABLE IF NOT EXISTS attachment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text DEFAULT '#6b7280',
  icon text DEFAULT 'folder',
  created_at timestamptz DEFAULT now()
);

-- Add category_id to attachments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attachments' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE attachments ADD COLUMN category_id uuid REFERENCES attachment_categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE attachment_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for attachment_categories
CREATE POLICY "Enable all operations for public users"
  ON attachment_categories
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Insert default categories
INSERT INTO attachment_categories (name, color, icon) VALUES
  ('Documenti', '#3b82f6', 'file-text'),
  ('Foto', '#10b981', 'image'),
  ('Manuali', '#f59e0b', 'book'),
  ('Certificati', '#8b5cf6', 'award'),
  ('Fatture', '#ef4444', 'receipt')
ON CONFLICT (name) DO NOTHING;