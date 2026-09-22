-- Dimensões de móveis são informadas em centímetros inteiros.
update public.attributes
set data_type = 'integer'
where lower(name) in ('altura', 'largura', 'profundidade');

-- Peso pode exigir casas decimais.
update public.attributes
set data_type = 'measure'
where lower(name) = 'peso';
