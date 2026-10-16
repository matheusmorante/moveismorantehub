-- Migration: 20261015210000_clean_unverified_handle_specs.sql
-- Description: Remove especificações de puxadores de produtos cuja descrição não especifica o item, garantindo estrita aderência à regra de negócio.

DO $$
BEGIN
  UPDATE public.products p
  SET 
    technical_specs = (p.technical_specs #- '{technicalValues,Material dos puxadores}') #- '{technicalValues,Tipo de puxador}',
    updated_at = NOW()
  WHERE p.id IN (
    '7c0912dc-f6fb-4f06-820d-24970ea4d195'::uuid, -- Estante Multiuso Open 56cm
    '1ccb82a9-d395-4c79-8b1a-4773c0262444'::uuid  -- Guarda Roupa Faimec Portugal 2 Portas Branco
  )
    AND NOT public.test_artifact_is_test(to_jsonb(p))
    AND COALESCE(public.test_artifact_row_data('products', to_jsonb(p))->>'is_test', 'false') != 'true';
END $$;
