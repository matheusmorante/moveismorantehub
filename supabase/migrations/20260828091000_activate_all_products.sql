-- Ativar todos os produtos não deletados no banco de dados
UPDATE public.products 
SET active = true 
WHERE deleted = false OR deleted IS NULL;
