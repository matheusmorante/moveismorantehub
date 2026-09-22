UPDATE public.attributes
SET is_globally_required = true,
    active = true
WHERE lower(trim(name)) IN ('cor', 'material da estrutura');
