-- Modelos textuais base da Campanha Padrão. Não geram assets nem usam referências.
WITH definitions (id, name, element_type, content_kind, prompt) AS (
  VALUES
    ('00000000-0000-4000-8000-000000000010'::uuid, 'Título Promocional Padrão', 'TITLE', 'DYNAMIC_CONTENT', 'Posicionar título em área de alta leitura, com hierarquia forte, contraste adequado e distância segura das fotos do produto.'),
    ('00000000-0000-4000-8000-000000000011'::uuid, 'Nome do Produto Padrão', 'PRODUCT_NAME', 'DYNAMIC_CONTENT', 'Exibir o nome real do produto com boa legibilidade, sem substituir, resumir ou inventar informação.'),
    ('00000000-0000-4000-8000-000000000012'::uuid, 'Preço em Destaque Padrão', 'PRICE', 'HYBRID', 'Dar máximo destaque ao preço real, usando área comercial clara, contraste elevado e espaço suficiente para renderização determinística.'),
    ('00000000-0000-4000-8000-000000000013'::uuid, 'Preço Anterior Padrão', 'OLD_PRICE', 'DYNAMIC_CONTENT', 'Exibir preço anterior apenas quando informado, visualmente subordinado ao preço atual e sem alterar seu valor.'),
    ('00000000-0000-4000-8000-000000000014'::uuid, 'Parcelamento Padrão', 'INSTALLMENT', 'HYBRID', 'Posicionar a condição de parcelamento próxima ao preço, com leitura clara e sem modificar os valores comerciais.'),
    ('00000000-0000-4000-8000-000000000015'::uuid, 'Ambientação Comercial Padrão', 'BACKGROUND', 'STATIC_VISUAL', 'Criar ambientação comercial elegante que valorize o produto, preserve espaço negativo para informações e não inclua textos ou números.'),
    ('00000000-0000-4000-8000-000000000016'::uuid, 'CTA Padrão', 'CTA', 'HYBRID', 'Reservar uma chamada para ação discreta e legível, sem inventar condições comerciais ou informações factuais.')
), saved AS (
  INSERT INTO public.post_creator_element_models (id, name, element_type, content_kind, prompt, reference_files, generation_version, status)
  SELECT id, name, element_type, content_kind, prompt, '[]'::jsonb, 1, 'NO_PREVIEW' FROM definitions
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, prompt = EXCLUDED.prompt, updated_at = now()
  RETURNING id, element_type
)
INSERT INTO public.post_creator_campaign_element_models (campaign_id, element_model_id, element_type, active)
SELECT '00000000-0000-4000-8000-000000000001'::uuid, id, element_type, true FROM saved
ON CONFLICT (campaign_id, element_model_id) DO UPDATE SET active = true;
