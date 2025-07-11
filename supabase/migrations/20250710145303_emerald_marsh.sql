/*
  # Aggiorna segnalazioni per utilizzare allevamenti

  1. Modifiche alla tabella reports
    - Rimuove il campo barn_id
    - Aggiunge il campo farm_id
    - Aggiorna i vincoli di chiave esterna

  2. Sicurezza
    - Mantiene le policy RLS esistenti
    - Aggiorna i riferimenti alle tabelle
*/

-- Prima salviamo i dati esistenti mappando barn_id a farm_id
CREATE TEMP TABLE temp_reports_mapping AS
SELECT 
  r.id as report_id,
  b.farm_id
FROM reports r
JOIN barns b ON r.barn_id = b.id;

-- Aggiungi la nuova colonna farm_id
ALTER TABLE reports ADD COLUMN farm_id uuid;

-- Aggiorna i dati esistenti
UPDATE reports 
SET farm_id = temp_reports_mapping.farm_id
FROM temp_reports_mapping
WHERE reports.id = temp_reports_mapping.report_id;

-- Rimuovi il vincolo di chiave esterna esistente per barn_id
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_barn_id_fkey;

-- Rimuovi la colonna barn_id
ALTER TABLE reports DROP COLUMN barn_id;

-- Rendi farm_id NOT NULL
ALTER TABLE reports ALTER COLUMN farm_id SET NOT NULL;

-- Aggiungi il nuovo vincolo di chiave esterna
ALTER TABLE reports ADD CONSTRAINT reports_farm_id_fkey 
  FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE CASCADE;

-- Pulisci la tabella temporanea
DROP TABLE temp_reports_mapping;