-- Ajuste de compatibilidade para a tabela bling_config
-- Remove a obrigatoriedade de campos que serão preenchidos via OAuth
ALTER TABLE public.bling_config ALTER COLUMN client_id DROP NOT NULL;
ALTER TABLE public.bling_config ALTER COLUMN client_secret DROP NOT NULL;
ALTER TABLE public.bling_config ALTER COLUMN access_token DROP NOT NULL;
ALTER TABLE public.bling_config ALTER COLUMN refresh_token DROP NOT NULL;

-- Garante que a linha singleton exista para o ID padrão
INSERT INTO public.bling_config (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
