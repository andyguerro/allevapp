/*
  # Add order confirmations system

  1. New Tables
    - `order_confirmations`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to quotes)
      - `order_number` (text, unique per company)
      - `company` (text, company name)
      - `sequential_number` (integer, auto-increment per company)
      - `farm_id` (uuid, foreign key to farms)
      - `supplier_id` (uuid, foreign key to suppliers)
      - `total_amount` (numeric)
      - `order_date` (date)
      - `delivery_date` (date, optional)
      - `notes` (text, optional)
      - `status` (text, default 'pending')
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to users)

  2. Functions
    - Function to get next sequential number per company
    - Function to auto-reject competing quotes
    - Function to generate order number

  3. Security
    - Enable RLS on `order_confirmations` table
    - Add policies for authenticated users
</sql>

-- Create order confirmations table
CREATE TABLE IF NOT EXISTS order_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  company text NOT NULL CHECK (company = ANY (ARRAY['Zoogamma Spa'::text, 'So. Agr. Zooagri Srl'::text, 'Soc. Agr. Zooallevamenti Srl'::text])),
  sequential_number integer NOT NULL,
  farm_id uuid NOT NULL REFERENCES farms(id),
  supplier_id uuid NOT NULL REFERENCES suppliers(id),
  total_amount numeric(10,2),
  order_date date NOT NULL DEFAULT CURRENT_DATE,
  delivery_date date,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'delivered'::text, 'cancelled'::text])),
  created_at timestamptz DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id),
  UNIQUE(company, sequential_number)
);

-- Enable RLS
ALTER TABLE order_confirmations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable all operations for authenticated users"
  ON order_confirmations
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Enable read access for all users"
  ON order_confirmations
  FOR SELECT
  TO public
  USING (true);

-- Function to get next sequential number for a company
CREATE OR REPLACE FUNCTION get_next_order_number(company_name text)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
BEGIN
  SELECT COALESCE(MAX(sequential_number), 0) + 1
  INTO next_number
  FROM order_confirmations
  WHERE company = company_name;
  
  RETURN next_number;
END;
$$;

-- Function to generate order number based on company
CREATE OR REPLACE FUNCTION generate_order_number(company_name text, seq_number integer)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  CASE company_name
    WHEN 'Zoogamma Spa' THEN
      RETURN 'ZG-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(seq_number::text, 4, '0');
    WHEN 'So. Agr. Zooagri Srl' THEN
      RETURN 'ZA-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(seq_number::text, 4, '0');
    WHEN 'Soc. Agr. Zooallevamenti Srl' THEN
      RETURN 'ZL-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(seq_number::text, 4, '0');
    ELSE
      RETURN 'ORD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(seq_number::text, 4, '0');
  END CASE;
END;
$$;

-- Function to auto-reject competing quotes when one is accepted
CREATE OR REPLACE FUNCTION auto_reject_competing_quotes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only proceed if the quote status changed to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Reject all other quotes with the same title/object from the same farm
    UPDATE quotes 
    SET status = 'rejected'
    WHERE id != NEW.id 
      AND farm_id = NEW.farm_id
      AND title = NEW.title
      AND status IN ('requested', 'received');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-rejecting competing quotes
DROP TRIGGER IF EXISTS trigger_auto_reject_competing_quotes ON quotes;
CREATE TRIGGER trigger_auto_reject_competing_quotes
  AFTER UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION auto_reject_competing_quotes();

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_confirmations_company ON order_confirmations(company);
CREATE INDEX IF NOT EXISTS idx_order_confirmations_order_date ON order_confirmations(order_date);
CREATE INDEX IF NOT EXISTS idx_order_confirmations_status ON order_confirmations(status);