-- Recupera o logo oficial legado como modelo reutilizável do elemento LOGO.
INSERT INTO public.post_creator_element_models (
  id, name, element_type, content_kind, prompt, reference_files,
  generated_asset_url, generation_input_hash, generation_version, status
)
SELECT
  '00000000-0000-4000-8000-000000000003'::uuid,
  'Logo Oficial Móveis Morante',
  'LOGO',
  'STATIC_VISUAL',
  'Utilizar exclusivamente o logo oficial fornecido, sem redesenhar, distorcer, alterar cores ou inventar outra marca.',
  '[{"id":"legacy-morante-logo-reference","name":"Logo oficial Móveis Morante","fileUrl":"/images/logo-morante.png","mimeType":"image/png"}]'::jsonb,
  '/images/logo-morante.png',
  'legacy-morante-logo-asset-v1',
  1,
  'UPDATED'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  prompt = EXCLUDED.prompt,
  reference_files = EXCLUDED.reference_files,
  generated_asset_url = EXCLUDED.generated_asset_url,
  generation_input_hash = EXCLUDED.generation_input_hash,
  status = EXCLUDED.status,
  updated_at = now();

UPDATE public.post_creator_campaign_element_models
SET active = false
WHERE campaign_id = '00000000-0000-4000-8000-000000000001'::uuid
  AND element_type = 'LOGO';

INSERT INTO public.post_creator_campaign_element_models (
  campaign_id, element_model_id, element_type, active
)
SELECT
  '00000000-0000-4000-8000-000000000001'::uuid,
  '00000000-0000-4000-8000-000000000003'::uuid,
  'LOGO',
  true
ON CONFLICT (campaign_id, element_model_id) DO UPDATE SET active = true;
