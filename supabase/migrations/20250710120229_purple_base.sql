/*
  # Setup user profiles and triggers

  1. Functions
    - `handle_new_user()` - Automatically creates profile when user signs up
    - `update_updated_at_column()` - Updates timestamp on record changes

  2. Triggers
    - Auto-create profile for new users
    - Auto-update timestamps for profiles and reports

  3. Demo Data
    - Creates sample farms, barns, suppliers, equipment, and reports for testing
*/

-- Function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, active)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'user'),
    true
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    active = EXCLUDED.active,
    updated_at = now();
  RETURN new;
END;
$$;

-- Create trigger to automatically create profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

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

-- Insert sample farms
INSERT INTO farms (name, address) VALUES
('Allevamento Nord', 'Via delle Stalle 123, Milano'),
('Allevamento Sud', 'Strada Rurale 456, Brescia')
ON CONFLICT DO NOTHING;

-- Insert sample barns
DO $$
DECLARE
  farm_nord_id uuid;
  farm_sud_id uuid;
BEGIN
  -- Get farm IDs
  SELECT id INTO farm_nord_id FROM farms WHERE name = 'Allevamento Nord' LIMIT 1;
  SELECT id INTO farm_sud_id FROM farms WHERE name = 'Allevamento Sud' LIMIT 1;
  
  -- Insert barns if farms exist
  IF farm_nord_id IS NOT NULL THEN
    INSERT INTO barns (name, farm_id) VALUES
    ('Stalla A', farm_nord_id),
    ('Stalla B', farm_nord_id)
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF farm_sud_id IS NOT NULL THEN
    INSERT INTO barns (name, farm_id) VALUES
    ('Stalla C', farm_sud_id),
    ('Sala Mungitura', farm_sud_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert sample suppliers
INSERT INTO suppliers (name, email, phone, address) VALUES
('Idraulica Srl', 'info@idraulicasrl.com', '+39 02 123456', 'Via Idraulica 1, Milano'),
('VentilAir Pro', 'preventivi@ventilair.com', '+39 02 654321', 'Via Ventilazione 2, Brescia'),
('Illuminotecnica', 'ordini@illuminotecnica.it', '+39 02 987654', 'Via LED 3, Bergamo'),
('Zootecnica Moderna', 'info@zootecnicamoderna.com', '+39 02 456789', 'Via Zootecnica 4, Varese')
ON CONFLICT DO NOTHING;

-- Insert sample equipment
DO $$
DECLARE
  farm_nord_id uuid;
  farm_sud_id uuid;
  barn_a_id uuid;
  barn_b_id uuid;
  barn_c_id uuid;
  barn_mungitura_id uuid;
BEGIN
  -- Get farm and barn IDs
  SELECT id INTO farm_nord_id FROM farms WHERE name = 'Allevamento Nord' LIMIT 1;
  SELECT id INTO farm_sud_id FROM farms WHERE name = 'Allevamento Sud' LIMIT 1;
  
  SELECT id INTO barn_a_id FROM barns WHERE name = 'Stalla A' LIMIT 1;
  SELECT id INTO barn_b_id FROM barns WHERE name = 'Stalla B' LIMIT 1;
  SELECT id INTO barn_c_id FROM barns WHERE name = 'Stalla C' LIMIT 1;
  SELECT id INTO barn_mungitura_id FROM barns WHERE name = 'Sala Mungitura' LIMIT 1;
  
  -- Insert equipment if farms and barns exist
  IF farm_nord_id IS NOT NULL AND barn_a_id IS NOT NULL THEN
    INSERT INTO equipment (name, model, serial_number, farm_id, barn_id, status, description, last_maintenance) VALUES
    ('Pompa Idraulica P1', 'HP-2000X', 'HP2000X-2024-001', farm_nord_id, barn_a_id, 'working', 'Pompa principale per sistema idraulico', '2024-01-10')
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF farm_nord_id IS NOT NULL AND barn_b_id IS NOT NULL THEN
    INSERT INTO equipment (name, model, serial_number, farm_id, barn_id, status, description, last_maintenance) VALUES
    ('Sistema Ventilazione SV2', 'AirFlow Pro 500', 'AFP500-2023-156', farm_nord_id, barn_b_id, 'not_working', 'Sistema di ventilazione automatico', '2023-12-15')
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF farm_sud_id IS NOT NULL AND barn_c_id IS NOT NULL THEN
    INSERT INTO equipment (name, model, serial_number, farm_id, barn_id, status, description, last_maintenance) VALUES
    ('Illuminazione LED IL3', 'LED-Farm-Ultra', 'LFU-2024-089', farm_sud_id, barn_c_id, 'repaired', 'Sistema illuminazione LED a risparmio energetico', '2024-01-05')
    ON CONFLICT DO NOTHING;
  END IF;
  
  IF farm_sud_id IS NOT NULL AND barn_mungitura_id IS NOT NULL THEN
    INSERT INTO equipment (name, model, serial_number, farm_id, barn_id, status, description, last_maintenance) VALUES
    ('Mulgitrici Automatiche', 'MilkMaster 3000', 'MM3000-2023-067', farm_sud_id, barn_mungitura_id, 'regenerated', 'Sistema di mungitura automatizzato', '2023-11-20')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;