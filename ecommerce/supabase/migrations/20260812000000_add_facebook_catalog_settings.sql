CREATE TABLE IF NOT EXISTS facebook_catalog_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  global_description_prefix TEXT NOT NULL DEFAULT '',
  meta_access_token TEXT,
  meta_catalog_id TEXT,
  column_mappings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO facebook_catalog_settings (id, global_description_prefix, column_mappings) 
VALUES (
  true, 
  '', 
  '{"brand": "Móveis Morante", "condition": "new", "gender": "unisex", "age_group": "adult"}'::jsonb
) 
ON CONFLICT (id) DO NOTHING;

ALTER TABLE facebook_catalog_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública das configurações do catálogo"
  ON facebook_catalog_settings FOR SELECT USING (true);

CREATE POLICY "Admin gerencia configurações do catálogo"
  ON facebook_catalog_settings FOR ALL
  USING (auth.email() = 'matheusmorante002@gmail.com')
  WITH CHECK (auth.email() = 'matheusmorante002@gmail.com');
