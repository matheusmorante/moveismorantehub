-- O produto pai pode ficar sem características; a obrigatoriedade é validada nas variações.
UPDATE public.attributes
SET is_globally_required = false
WHERE lower(trim(name)) IN ('cor', 'material da estrutura');
