-- Nova regra: cada campanha utiliza exatamente um modelo por tipo de elemento.
-- Mantém o vínculo ativo/mais recente; modelos globais não são excluídos.
WITH ranked_links AS (
  SELECT campaign_id, element_model_id,
    row_number() OVER (
      PARTITION BY campaign_id, element_type,
        CASE WHEN element_type = 'BADGE' THEN opportunity_id ELSE NULL END
      ORDER BY active DESC, created_at DESC, element_model_id
    ) AS position
  FROM public.post_creator_campaign_element_models
)
DELETE FROM public.post_creator_campaign_element_models AS link
USING ranked_links
WHERE link.campaign_id = ranked_links.campaign_id
  AND link.element_model_id = ranked_links.element_model_id
  AND ranked_links.position > 1;

DROP INDEX IF EXISTS public.post_creator_one_active_generic_model;
DROP INDEX IF EXISTS public.post_creator_one_active_opportunity_model;
CREATE UNIQUE INDEX IF NOT EXISTS post_creator_one_model_per_campaign_element
  ON public.post_creator_campaign_element_models (campaign_id, element_type)
  WHERE element_type <> 'BADGE';
CREATE UNIQUE INDEX IF NOT EXISTS post_creator_one_badge_per_campaign_opportunity
  ON public.post_creator_campaign_element_models (campaign_id, element_type, opportunity_id)
  WHERE element_type = 'BADGE';
