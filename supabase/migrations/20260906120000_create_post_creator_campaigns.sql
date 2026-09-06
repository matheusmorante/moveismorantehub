-- Criador de Posts: estruturas novas, independentes dos templates legados.
CREATE TABLE IF NOT EXISTS public.post_creator_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text,
  general_guidelines text, active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.post_creator_element_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  element_type text NOT NULL CHECK (element_type IN ('TITLE','PRODUCT_NAME','PRICE','OLD_PRICE','INSTALLMENT','BADGE','BACKGROUND','LOGO','CTA')),
  content_kind text NOT NULL CHECK (content_kind IN ('STATIC_VISUAL','DYNAMIC_CONTENT','HYBRID')),
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE RESTRICT,
  prompt text NOT NULL DEFAULT '', reference_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_asset_url text, generation_input_hash text, generation_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'NO_PREVIEW' CHECK (status IN ('NO_PREVIEW','UPDATED','STALE','GENERATING','ERROR')),
  CONSTRAINT post_creator_badge_requires_opportunity CHECK (element_type <> 'BADGE' OR opportunity_id IS NOT NULL),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_creator_element_models
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE RESTRICT;

CREATE TABLE IF NOT EXISTS public.post_creator_campaign_element_models (
  campaign_id uuid NOT NULL REFERENCES public.post_creator_campaigns(id) ON DELETE CASCADE,
  element_model_id uuid NOT NULL REFERENCES public.post_creator_element_models(id) ON DELETE RESTRICT,
  element_type text NOT NULL, opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, element_model_id)
);
-- Compatibilidade com uma tentativa anterior da migration que criou a tabela
-- antes do campo de oportunidade existir.
ALTER TABLE public.post_creator_campaign_element_models
  ADD COLUMN IF NOT EXISTS opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS post_creator_one_active_generic_model ON public.post_creator_campaign_element_models (campaign_id, element_type) WHERE active AND opportunity_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS post_creator_one_active_opportunity_model ON public.post_creator_campaign_element_models (campaign_id, element_type, opportunity_id) WHERE active AND opportunity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.post_creator_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), campaign_id uuid NOT NULL REFERENCES public.post_creator_campaigns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL, format text NOT NULL CHECK (format IN ('4:5','9:16')), input_hash text NOT NULL,
  image_url text NOT NULL, status text NOT NULL DEFAULT 'UPDATED' CHECK (status IN ('UPDATED','STALE')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE (input_hash)
);

ALTER TABLE public.post_creator_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_creator_element_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_creator_campaign_element_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_creator_previews ENABLE ROW LEVEL SECURITY;

-- Mesmo escopo administrativo das estruturas de marketing já existentes.
-- DROP ... IF EXISTS torna seguro reexecutar uma migration parcialmente aplicada.
DROP POLICY IF EXISTS "authenticated_manage_post_creator_campaigns" ON public.post_creator_campaigns;
DROP POLICY IF EXISTS "authenticated_manage_post_creator_models" ON public.post_creator_element_models;
DROP POLICY IF EXISTS "authenticated_manage_post_creator_links" ON public.post_creator_campaign_element_models;
DROP POLICY IF EXISTS "authenticated_manage_post_creator_previews" ON public.post_creator_previews;
CREATE POLICY "authenticated_manage_post_creator_campaigns" ON public.post_creator_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_manage_post_creator_models" ON public.post_creator_element_models FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_manage_post_creator_links" ON public.post_creator_campaign_element_models FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "authenticated_manage_post_creator_previews" ON public.post_creator_previews FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migração não destrutiva do selo visual legado. O vínculo usa o UUID encontrado
-- em opportunities, nunca um enum ou nome como fonte de verdade no aplicativo.
INSERT INTO public.post_creator_campaigns (id, name, description, active)
VALUES ('00000000-0000-4000-8000-000000000001', 'Campanha Padrão', 'Campanha padrão que reúne modelos visuais reutilizáveis.', true)
ON CONFLICT (id) DO NOTHING;

WITH opportunity AS (
  SELECT id FROM public.opportunities
  WHERE slug = 'salvado' OR lower(trim(name)) = 'queima dos salvados'
  ORDER BY CASE WHEN slug = 'salvado' THEN 0 ELSE 1 END
  LIMIT 1
), model AS (
  INSERT INTO public.post_creator_element_models (
    id, name, element_type, content_kind, opportunity_id, prompt, reference_files,
    generated_asset_url, generation_input_hash, generation_version, status
  )
  SELECT
    '00000000-0000-4000-8000-000000000002',
    'Selo Queima dos Salvados',
    'BADGE',
    'STATIC_VISUAL',
    opportunity.id,
    'Utilizar exclusivamente o selo visual oficial já fornecido. Não gerar nem alterar texto, preço, condição comercial ou a identidade da oportunidade.',
    '[{"id":"legacy-queima-salvados-reference","name":"Selo oficial Queima dos Salvados","fileUrl":"/assets/queima-salvados-original.png","mimeType":"image/png"}]'::jsonb,
    '/assets/queima-salvados-original.png',
    'legacy-queima-salvados-asset-v1',
    1,
    'UPDATED'
  FROM opportunity
  ON CONFLICT (id) DO NOTHING
  RETURNING id, opportunity_id
)
INSERT INTO public.post_creator_campaign_element_models (
  campaign_id, element_model_id, element_type, opportunity_id, active
)
SELECT '00000000-0000-4000-8000-000000000001', id, 'BADGE', opportunity_id, true
FROM public.post_creator_element_models
WHERE id = '00000000-0000-4000-8000-000000000002'
ON CONFLICT (campaign_id, element_model_id) DO NOTHING;
