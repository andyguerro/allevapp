/*
  # Insert sample data for development

  1. Sample Data
    - Sample farms and barns
    - Sample suppliers
    - Sample equipment
    - Sample admin user profile

  Note: This is for development purposes only
*/

-- Insert sample farms
INSERT INTO farms (id, name, address) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'Allevamento Nord', 'Via delle Stalle 123, Milano'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Allevamento Sud', 'Strada Rurale 456, Brescia')
ON CONFLICT (id) DO NOTHING;

-- Insert sample barns
INSERT INTO barns (id, name, farm_id) VALUES
  ('550e8400-e29b-41d4-a716-446655440011', 'Stalla A', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440012', 'Stalla B', '550e8400-e29b-41d4-a716-446655440001'),
  ('550e8400-e29b-41d4-a716-446655440013', 'Stalla C', '550e8400-e29b-41d4-a716-446655440002'),
  ('550e8400-e29b-41d4-a716-446655440014', 'Sala Mungitura', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (id) DO NOTHING;

-- Insert sample suppliers
INSERT INTO suppliers (id, name, email, phone) VALUES
  ('550e8400-e29b-41d4-a716-446655440021', 'Idraulica Srl', 'info@idraulicasrl.com', '+39 02 123456'),
  ('550e8400-e29b-41d4-a716-446655440022', 'VentilAir Pro', 'preventivi@ventilair.com', '+39 02 654321'),
  ('550e8400-e29b-41d4-a716-446655440023', 'Illuminotecnica', 'ordini@illuminotecnica.it', '+39 02 987654'),
  ('550e8400-e29b-41d4-a716-446655440024', 'Zootecnica Moderna', 'info@zootecnicamoderna.com', '+39 02 456789')
ON CONFLICT (id) DO NOTHING;

-- Insert sample equipment
INSERT INTO equipment (id, name, model, serial_number, farm_id, barn_id, status, description, last_maintenance) VALUES
  ('550e8400-e29b-41d4-a716-446655440031', 'Pompa Idraulica P1', 'HP-2000X', 'HP2000X-2024-001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440011', 'working', 'Pompa principale per sistema idraulico', '2024-01-10'),
  ('550e8400-e29b-41d4-a716-446655440032', 'Sistema Ventilazione SV2', 'AirFlow Pro 500', 'AFP500-2023-156', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440012', 'not_working', 'Sistema di ventilazione automatico', '2023-12-15'),
  ('550e8400-e29b-41d4-a716-446655440033', 'Illuminazione LED IL3', 'LED-Farm-Ultra', 'LFU-2024-089', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440013', 'repaired', 'Sistema illuminazione LED a risparmio energetico', '2024-01-05'),
  ('550e8400-e29b-41d4-a716-446655440034', 'Mulgitrici Automatiche', 'MilkMaster 3000', 'MM3000-2023-067', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440014', 'regenerated', 'Sistema di mungitura automatizzato', '2023-11-20')
ON CONFLICT (id) DO NOTHING;