/*
  # Aggiorna stati progetti

  1. Modifica della tabella projects
    - Aggiorna il constraint per i nuovi stati
    - Migra i dati esistenti ai nuovi stati

  2. Nuovi stati
    - 'open' (Aperto)
    - 'defined' (Definito) 
    - 'in_progress' (In corso)
    - 'completed' (Concluso)
    - 'discarded' (Scartato)
*/

-- Prima rimuovi il constraint esistente
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- Aggiorna i valori esistenti per mappare ai nuovi stati
UPDATE projects SET status = 
  CASE 
    WHEN status = 'active' THEN 'open'
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'cancelled' THEN 'discarded'
    WHEN status = 'on_hold' THEN 'defined'
    ELSE 'open'
  END;

-- Aggiungi il nuovo constraint con i nuovi stati
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status = ANY (ARRAY['open'::text, 'defined'::text, 'in_progress'::text, 'completed'::text, 'discarded'::text]));

-- Aggiorna il valore di default
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'open';