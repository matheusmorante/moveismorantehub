update public.attributes
set data_type = 'measure'
where lower(name) in ('altura', 'largura', 'peso', 'profundidade');

update public.attributes
set data_type = 'radio'
where lower(name) in ('densidade da espuma', 'tecido');
