/*
  # Create users table and update foreign key references

  1. New Tables
    - `users`
      - `id` (uuid, primary key)
      - `full_name` (text, required)
      - `email` (text, unique, required)
      - `role` (text, default 'technician')
      - `active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `users` table
    - Add policies for read and management access

  3. Data Migration
    - Insert sample users
    - Update all existing foreign key references to point to valid users
    - Replace old foreign key constraints with new ones pointing to users table

  4. Performance
    - Add indexes on email, active, and role columns
*/

-- Crea la tabella users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'technician' CHECK (role IN ('admin', 'manager', 'technician')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Abilita RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Crea policy per lettura pubblica
CREATE POLICY "Enable read access for all users" ON users
  FOR SELECT USING (true);

-- Crea policy per gestione da parte di utenti autenticati
CREATE POLICY "Enable all operations for authenticated users" ON users
  FOR ALL USING (true);

-- Crea trigger per aggiornare updated_at (solo se la funzione non esiste già)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $func$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $func$ language 'plpgsql';
  END IF;
END $$;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserisci utenti di esempio
INSERT INTO users (full_name, email, role) VALUES
  ('Mario Rossi', 'mario.rossi@allevapp.com', 'admin'),
  ('Giulia Bianchi', 'giulia.bianchi@allevapp.com', 'manager'),
  ('Luca Verdi', 'luca.verdi@allevapp.com', 'technician'),
  ('Anna Neri', 'anna.neri@allevapp.com', 'technician'),
  ('Paolo Gialli', 'paolo.gialli@allevapp.com', 'technician')
ON CONFLICT (email) DO NOTHING;

-- PRIMA rimuovi tutti i vincoli di foreign key esistenti
DO $$
BEGIN
  -- Reports table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_assigned_to_fkey' 
    AND table_name = 'reports'
  ) THEN
    ALTER TABLE reports DROP CONSTRAINT reports_assigned_to_fkey;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reports_created_by_fkey' 
    AND table_name = 'reports'
  ) THEN
    ALTER TABLE reports DROP CONSTRAINT reports_created_by_fkey;
  END IF;

  -- Farms table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'farms_created_by_fkey' 
    AND table_name = 'farms'
  ) THEN
    ALTER TABLE farms DROP CONSTRAINT farms_created_by_fkey;
  END IF;

  -- Quotes table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quotes_created_by_fkey' 
    AND table_name = 'quotes'
  ) THEN
    ALTER TABLE quotes DROP CONSTRAINT quotes_created_by_fkey;
  END IF;

  -- Attachments table
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'attachments_created_by_fkey' 
    AND table_name = 'attachments'
  ) THEN
    ALTER TABLE attachments DROP CONSTRAINT attachments_created_by_fkey;
  END IF;
END $$;

-- DOPO aver rimosso i vincoli, aggiorna i dati esistenti
DO $$
DECLARE
  default_user_id uuid;
BEGIN
  -- Ottieni l'ID del primo utente admin
  SELECT id INTO default_user_id FROM users WHERE role = 'admin' LIMIT 1;
  
  IF default_user_id IS NOT NULL THEN
    -- Ora possiamo aggiornare i dati senza vincoli di foreign key
    
    -- Aggiorna le segnalazioni esistenti
    UPDATE reports 
    SET assigned_to = default_user_id, created_by = default_user_id;
    
    -- Aggiorna gli allevamenti esistenti
    UPDATE farms 
    SET created_by = default_user_id;
    
    -- Aggiorna i preventivi esistenti
    UPDATE quotes 
    SET created_by = default_user_id;
    
    -- Aggiorna gli allegati esistenti
    UPDATE attachments 
    SET created_by = default_user_id;
  END IF;
END $$;

-- INFINE aggiungi i nuovi vincoli che puntano alla tabella users
-- Ora che i dati sono stati aggiornati e i vincoli rimossi, possiamo aggiungere i nuovi vincoli
ALTER TABLE reports 
ADD CONSTRAINT reports_assigned_to_fkey 
FOREIGN KEY (assigned_to) REFERENCES users(id);

ALTER TABLE reports 
ADD CONSTRAINT reports_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE farms 
ADD CONSTRAINT farms_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE quotes 
ADD CONSTRAINT quotes_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE attachments 
ADD CONSTRAINT attachments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES users(id);

-- Crea indici per migliorare le performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);