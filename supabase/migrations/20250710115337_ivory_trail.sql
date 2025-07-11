/*
  # Fix profiles and triggers setup

  1. Database Updates
    - Set proper defaults for profiles table
    - Create update timestamp function
    - Add triggers for updated_at columns

  2. Notes
    - Removed auth.users trigger as it requires special permissions
    - Focused on essential database functionality
    - User profiles will need to be created manually or through application code
*/

-- Ensure the profiles table has proper constraints and defaults
DO $$
BEGIN
  -- Set default role if not already set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role' 
    AND column_default = '''user''::text'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'user';
  END IF;

  -- Set default active if not already set
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'active' 
    AND column_default = 'true'
  ) THEN
    ALTER TABLE profiles ALTER COLUMN active SET DEFAULT true;
  END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Ensure the trigger exists for profiles updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Ensure the trigger exists for reports updated_at  
DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();