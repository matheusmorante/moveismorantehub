-- Criar tabela de rastreamento de acessos a produtos (analytics)
CREATE TABLE IF NOT EXISTS product_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,
  ip_address TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  referer TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilita RLS na tabela
ALTER TABLE product_analytics ENABLE ROW LEVEL SECURITY;

-- Permite inserções públicas (para qualquer visitante da loja registrar o log)
CREATE POLICY "Permitir inserções públicas anônimas" 
  ON product_analytics FOR INSERT 
  WITH CHECK (true);

-- Permite leitura apenas para administradores logados
CREATE POLICY "Permitir leitura para administradores autenticados" 
  ON product_analytics FOR SELECT 
  USING (auth.role() = 'authenticated');
