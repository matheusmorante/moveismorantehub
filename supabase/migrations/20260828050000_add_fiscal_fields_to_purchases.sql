-- Adicionar colunas fiscal_key e attachments se não existirem na tabela purchases
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS fiscal_key TEXT;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';

-- Criar o bucket de storage para os anexos se ele não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('purchase-attachments', 'purchase-attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- Configurar RLS do Supabase Storage para permitir inserções e leituras
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'purchase-attachments');

DROP POLICY IF EXISTS "Authenticated Insert" ON storage.objects;
CREATE POLICY "Authenticated Insert" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'purchase-attachments');
