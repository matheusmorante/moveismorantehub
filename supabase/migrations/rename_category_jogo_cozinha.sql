-- Altera o nome da categoria "Jogo de Cozinha" para "Cozinhas Moduladas e Compactas"
UPDATE public.categories 
SET name = 'Cozinhas Moduladas e Compactas' 
WHERE id = 'b3a1a235-fd4c-4706-a058-6f8200b3731a' OR name = 'Jogo de Cozinha';
