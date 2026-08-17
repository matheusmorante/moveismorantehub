CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS width TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS depth TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS height TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_id UUID REFERENCES materials(id) ON DELETE SET NULL;

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de materiais"
  ON materials FOR SELECT USING (true);

CREATE POLICY "Admin gerencia materiais"
  ON materials FOR ALL USING (auth.email() = 'matheusmorante002@gmail.com');
