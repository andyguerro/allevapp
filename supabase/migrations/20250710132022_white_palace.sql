/*
  # Aggiungi campo allevamento ai preventivi

  1. Modifiche
    - Aggiungi colonna `farm_id` alla tabella `quotes`
    - Aggiungi foreign key constraint verso la tabella `farms`
    - Mantieni il campo opzionale per retrocompatibilità

  2. Sicurezza
    - Nessuna modifica alle policy RLS esistenti
*/

-- Aggiungi la colonna farm_id alla tabella quotes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quotes' AND column_name = 'farm_id'
  ) THEN
    ALTER TABLE quotes ADD COLUMN farm_id uuid;
  END IF;
END $$;

-- Aggiungi il foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'quotes_farm_id_fkey'
  ) THEN
    ALTER TABLE quotes 
    ADD CONSTRAINT quotes_farm_id_fkey 
    FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE SET NULL;
  END IF;
END $$;