ALTER TABLE technical_specifications ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE technical_specifications SET input_type = 'text' WHERE input_type = 'number';

ALTER TABLE technical_specifications DROP CONSTRAINT IF EXISTS technical_specifications_input_type_check;
ALTER TABLE technical_specifications ADD CONSTRAINT technical_specifications_input_type_check
  CHECK (input_type IN ('materials', 'text'));
