/*
  # Create quotes table

  1. New Tables
    - `quotes`
      - `id` (uuid, primary key)
      - `report_id` (uuid, foreign key to reports, optional)
      - `supplier_id` (uuid, foreign key to suppliers)
      - `title` (text, not null)
      - `description` (text, not null)
      - `amount` (decimal)
      - `status` (text, check constraint)
      - `requested_at` (timestamp)
      - `due_date` (date)
      - `notes` (text)
      - `created_by` (uuid, foreign key to auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on quotes table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES reports(id) ON DELETE SET NULL,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  amount decimal(10,2),
  status text CHECK (status IN ('requested', 'received', 'accepted', 'rejected')) DEFAULT 'requested',
  requested_at timestamptz DEFAULT now(),
  due_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id) DEFAULT auth.uid() NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage quotes
CREATE POLICY "Admins can manage quotes"
  ON quotes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can view quotes related to their reports
CREATE POLICY "Users can view related quotes"
  ON quotes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM reports 
      WHERE reports.id = quotes.report_id 
      AND (reports.created_by = auth.uid() OR reports.assigned_to = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );