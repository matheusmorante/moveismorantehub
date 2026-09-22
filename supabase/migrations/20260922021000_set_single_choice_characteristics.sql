update public.attributes
set data_type = 'radio'
where lower(name) in (
  'densidade da espuma',
  'tecido',
  'espelho',
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
