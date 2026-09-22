-- Restaura os tipos canônicos das características globais.
-- A operação é idempotente e evita que uma sincronização antiga as trate como texto.
UPDATE public.attributes
SET name = 'Contém espelho'
WHERE lower(trim(name)) IN ('espelho', 'espelhos', 'contém espelho');

UPDATE public.attributes
SET data_type = 'measure'
WHERE lower(trim(name)) IN ('altura', 'largura', 'peso', 'profundidade');

UPDATE public.attributes
SET data_type = 'radio'
WHERE lower(trim(name)) IN (
  'densidade da espuma',
  'tecido',
  'espelho',
  'contém espelho',
  'tipo de porta',
  'sistema de deslizamento da gaveta',
  'tipo de pés',
  'tipo de puxador',
  'acabamento',
  'cor',
  'estrutura',
  'quantidade de gavetas',
  'quantidade de portas'
);
