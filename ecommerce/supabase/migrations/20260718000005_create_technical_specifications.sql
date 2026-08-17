CREATE TABLE IF NOT EXISTS technical_specifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  input_type TEXT NOT NULL DEFAULT 'text' CHECK (input_type IN ('materials', 'text')),
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO technical_specifications (name, slug, input_type) VALUES
  ('Material da estrutura', 'structure_material', 'materials'),
  ('Material dos pés', 'feet_material', 'materials'),
  ('Material dos puxadores', 'handles_material', 'materials'),
  ('Material/tipo de corrediças', 'slides_material', 'materials'),
  ('Quantidade de portas', 'doors', 'text'),
  ('Quantidade de gavetas', 'drawers', 'text')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE technical_specifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública de especificações técnicas"
  ON technical_specifications FOR SELECT USING (true);

CREATE POLICY "Admin gerencia especificações técnicas"
  ON technical_specifications FOR ALL USING (auth.email() = 'matheusmorante002@gmail.com');
