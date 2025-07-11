/*
  # Add Order Confirmations System

  1. New Tables
    - `order_confirmations`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to quotes)
      - `order_number` (text, unique order number)
      - `company` (text, company name)
      - `sequential_number` (integer, sequential number per company)
      - `farm_id` (uuid, foreign key to farms)
      - `supplier_id` (uuid, foreign key to suppliers)
      - `total_amount` (numeric, order total)
      - `order_date` (date, order date)
      - `delivery_date` (date, optional delivery date)
      - `notes` (text, optional notes)
      - `status` (text, order status)
      - `created_by` (uuid, foreign key to users)
      - `created_at` (timestamp)

  2. Functions
    - `get_next_order_number(company_name)` - Get next sequential number for company
    - `generate_order_number(company_name, seq_number)` - Generate formatted order number
    - `auto_reject_competing_quotes()` - Trigger function to reject competing quotes

  3. Triggers
    - Auto-reject competing quotes when one is accepted

  4. Security
    - Enable RLS on `order_confirmations` table
    - Add policies for authenticated users
*/

-- Create order_confirmations table
CREATE TABLE IF NOT EXISTS order_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE SET NULL,
  order_number text UNIQUE NOT NULL,
  company text NOT NULL CHECK (company = ANY (ARRAY['Zoogamma Spa'::text, 'So. Agr. Zooagri Srl'::text, 'Soc. Agr. Zooallevamenti Srl'::text])),
  sequential_number integer NOT NULL,
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_date date,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'delivered'::text, 'cancelled'::text])),
  created_by uuid REFERENCES users(id) NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE order_confirmations ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Enable all operations for authenticated users"
  ON order_confirmations
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable read access for all users"
  ON order_confirmations
  FOR SELECT
  TO public
  USING (true);

-- Function to get next sequential number for a company
CREATE OR REPLACE FUNCTION get_next_order_number(company_name text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_number integer;
BEGIN
  -- Get the highest sequential number for this company and increment by 1
  SELECT COALESCE(MAX(sequential_number), 0) + 1
  INTO next_number
  FROM order_confirmations
  WHERE company = company_name;
  
  RETURN next_number;
END;
$$;

-- Function to generate formatted order number
CREATE OR REPLACE FUNCTION generate_order_number(company_name text, seq_number integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  company_code text;
  year_part text;
  formatted_number text;
BEGIN
  -- Get company code
  company_code := CASE company_name
    WHEN 'Zoogamma Spa' THEN 'ZG'
    WHEN 'So. Agr. Zooagri Srl' THEN 'ZA'
    WHEN 'Soc. Agr. Zooallevamenti Srl' THEN 'ZL'
    ELSE 'XX'
  END;
  
  -- Get current year
  year_part := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Format number with leading zeros (4 digits)
  formatted_number := company_code || '-' || year_part || '-' || LPAD(seq_number::text, 4, '0');
  
  RETURN formatted_number;
END;
$$;

-- Function to auto-reject competing quotes
CREATE OR REPLACE FUNCTION auto_reject_competing_quotes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If quote status is being changed to 'accepted'
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Reject all other quotes with same title and farm_id
    UPDATE quotes
    SET status = 'rejected'
    WHERE id != NEW.id
      AND title = NEW.title
      AND farm_id = NEW.farm_id
      AND status IN ('requested', 'received');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-rejecting competing quotes
DROP TRIGGER IF EXISTS trigger_auto_reject_competing_quotes ON quotes;
CREATE TRIGGER trigger_auto_reject_competing_quotes
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_reject_competing_quotes();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_confirmations_company ON order_confirmations(company);
CREATE INDEX IF NOT EXISTS idx_order_confirmations_order_date ON order_confirmations(order_date);
CREATE INDEX IF NOT EXISTS idx_order_confirmations_status ON order_confirmations(status);