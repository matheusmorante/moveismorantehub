-- Recupera o asset legado como Modelo de Selo de Oportunidade.
-- Execute o arquivo inteiro; ele pode ser reexecutado sem duplicar registros.

INSERT INTO public.post_creator_campaigns (id, name, description, active)
SELECT '00000000-0000-4000-8000-000000000001'::uuid, 'Campanha Padrão', 'Campanha padrão que reúne modelos visuais reutilizáveis.', true
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now();

INSERT INTO public.post_creator_element_models (
  id, name, element_type, content_kind, opportunity_id, prompt, reference_files,
  generated_asset_url, generation_input_hash, generation_version, status
)
SELECT
  '00000000-0000-4000-8000-000000000002'::uuid, 'Selo Queima dos Salvados', 'BADGE', 'STATIC_VISUAL', opportunity.id,
  'Utilizar exclusivamente o selo visual oficial já fornecido. Não gerar nem alterar texto, preço, condição comercial ou a identidade da oportunidade.',
  '[{"id":"legacy-queima-salvados-reference","name":"Selo oficial Queima dos Salvados","fileUrl":"/assets/queima-salvados-original.png","mimeType":"image/png"}]'::jsonb,
  '/assets/queima-salvados-original.png', 'legacy-queima-salvados-asset-v1', 1, 'UPDATED'
FROM public.opportunities AS opportunity
WHERE opportunity.slug = 'salvado'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, opportunity_id = EXCLUDED.opportunity_id, prompt = EXCLUDED.prompt,
  reference_files = EXCLUDED.reference_files, generated_asset_url = EXCLUDED.generated_asset_url,
  generation_input_hash = EXCLUDED.generation_input_hash, status = EXCLUDED.status, updated_at = now();

UPDATE public.post_creator_campaign_element_models
SET active = false
WHERE campaign_id = '00000000-0000-4000-8000-000000000001'::uuid
  AND element_type = 'BADGE'
  AND opportunity_id = (SELECT id FROM public.opportunities WHERE slug = 'salvado' LIMIT 1);

INSERT INTO public.post_creator_campaign_element_models (
  campaign_id, element_model_id, element_type, opportunity_id, active
)
SELECT '00000000-0000-4000-8000-000000000001'::uuid, model.id, 'BADGE', model.opportunity_id, true
FROM public.post_creator_element_models AS model
WHERE model.id = '00000000-0000-4000-8000-000000000002'::uuid
ON CONFLICT (campaign_id, element_model_id) DO UPDATE
SET opportunity_id = EXCLUDED.opportunity_id, active = true;
