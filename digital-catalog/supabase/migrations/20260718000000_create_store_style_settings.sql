CREATE TABLE IF NOT EXISTS store_style_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  border_width TEXT NOT NULL DEFAULT 'medium' CHECK (border_width IN ('thin', 'medium', 'strong')),
  border_radius TEXT NOT NULL DEFAULT 'square' CHECK (border_radius IN ('square', 'soft', 'rounded')),
  shadow TEXT NOT NULL DEFAULT 'soft' CHECK (shadow IN ('none', 'soft', 'elevated')),
  opportunity_emphasis TEXT NOT NULL DEFAULT 'animated' CHECK (opportunity_emphasis IN ('subtle', 'highlighted', 'animated')),
  button_style TEXT NOT NULL DEFAULT 'standard' CHECK (button_style IN ('standard', 'rounded')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO store_style_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE store_style_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura pública das configurações de estilo"
  ON store_style_settings FOR SELECT USING (true);

CREATE POLICY "Admin gerencia as configurações de estilo"
  ON store_style_settings FOR ALL
  USING (auth.email() = 'matheusmorante002@gmail.com')
  WITH CHECK (auth.email() = 'matheusmorante002@gmail.com');
