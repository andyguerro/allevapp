/*
  # Sistema di gestione documenti per allevamenti

  1. Nuove Tabelle
    - `document_categories` - Categorie dei documenti
    - `farm_documents` - Documenti collegati agli allevamenti

  2. Sicurezza
    - Abilita RLS su entrambe le tabelle
    - Policy per operazioni pubbliche

  3. Funzionalità
    - Categorie personalizzabili con colori e icone
    - Documenti collegati agli allevamenti
    - Metadati completi per ogni documento
*/

-- Tabella categorie documenti
CREATE TABLE IF NOT EXISTS document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  color text DEFAULT '#6b7280',
  icon text DEFAULT 'folder',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabella documenti allevamenti
CREATE TABLE IF NOT EXISTS farm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  category_id uuid REFERENCES document_categories(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  mime_type text,
  document_date date,
  expiry_date date,
  tags text[],
  is_important boolean DEFAULT false,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Abilita RLS
ALTER TABLE document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_documents ENABLE ROW LEVEL SECURITY;

-- Policy per categorie documenti
CREATE POLICY "Enable all operations for public users"
  ON document_categories
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Policy per documenti allevamenti
CREATE POLICY "Enable all operations for public users"
  ON farm_documents
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION update_farm_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_farm_documents_updated_at
  BEFORE UPDATE ON farm_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_documents_updated_at();

CREATE TRIGGER update_document_categories_updated_at
  BEFORE UPDATE ON document_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_farm_documents_updated_at();

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_farm_documents_farm_id ON farm_documents(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_documents_category_id ON farm_documents(category_id);
CREATE INDEX IF NOT EXISTS idx_farm_documents_created_by ON farm_documents(created_by);
CREATE INDEX IF NOT EXISTS idx_farm_documents_document_date ON farm_documents(document_date);
CREATE INDEX IF NOT EXISTS idx_farm_documents_expiry_date ON farm_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_farm_documents_tags_gin ON farm_documents USING gin(tags);

-- Inserisci categorie predefinite
INSERT INTO document_categories (name, description, color, icon) VALUES
  ('Certificati', 'Certificazioni e attestati', '#10b981', 'award'),
  ('Contratti', 'Contratti e accordi', '#3b82f6', 'file-text'),
  ('Fatture', 'Fatture e documenti fiscali', '#f59e0b', 'receipt'),
  ('Licenze', 'Licenze e permessi', '#8b5cf6', 'shield'),
  ('Manuali', 'Manuali e istruzioni', '#06b6d4', 'book'),
  ('Progetti', 'Documenti di progetto', '#ef4444', 'folder'),
  ('Relazioni', 'Report e relazioni', '#84cc16', 'file-bar-chart'),
  ('Sanitari', 'Documenti sanitari e veterinari', '#f97316', 'heart')
ON CONFLICT (name) DO NOTHING;