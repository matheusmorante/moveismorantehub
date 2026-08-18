-- SQL para atualizar o nome de todas as variações concatenando o nome do produto pai
-- com os valores dos atributos dinâmicos da variação (ex: "Sofá Topázio Azul Linho Casal")
UPDATE public.product_variations pv
SET name = TRIM(
  p.name || ' ' || COALESCE(
    (
      SELECT string_agg(value, ' ')
      FROM jsonb_each_text(pv.attributes)
    ), 
    ''
  )
)
FROM public.products p
WHERE pv.product_id = p.id;
