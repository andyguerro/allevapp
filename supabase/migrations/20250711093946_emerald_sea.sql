/*
  # Add company field to farms table

  1. Changes
    - Add `company` column to `farms` table
    - Set default value to first company option
    - Add check constraint for valid company values

  2. Companies
    - Zoogamma Spa
    - So. Agr. Zooagri Srl  
    - Soc. Agr. Zooallevamenti Srl
*/

-- Add company column to farms table
ALTER TABLE farms 
ADD COLUMN company text DEFAULT 'Zoogamma Spa';

-- Add check constraint for valid company values
ALTER TABLE farms 
ADD CONSTRAINT farms_company_check 
CHECK (company IN (
  'Zoogamma Spa',
  'So. Agr. Zooagri Srl',
  'Soc. Agr. Zooallevamenti Srl'
));

-- Update existing farms to have the default company
UPDATE farms 
SET company = 'Zoogamma Spa' 
WHERE company IS NULL;