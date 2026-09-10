-- Migration: Transação Atômica para Mover Variação de Produto Pai e Constraint de Unicidade de SKU
-- Garante:
-- 1. Transação atômica completa em PostgreSQL via RPC move_variation_to_parent
-- 2. Garantia de unicidade de SKU via constraint de banco UNIQUE(sku)
-- 3. Invariante de UUID preservado
-- 4. Tratamento de soft-delete oficial do ERP (active=false, deleted=true)

-- ── 1. Garantir Constraint UNIQUE(sku) em product_variations ───────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_variations_sku_key'
      AND conrelid = 'public.product_variations'::regclass
  ) THEN
    ALTER TABLE public.product_variations
      ADD CONSTRAINT product_variations_sku_key UNIQUE (sku);
  END IF;
END $$;

-- ── 2. Criar Função RPC Transacional move_variation_to_parent ───────────────
CREATE OR REPLACE FUNCTION public.move_variation_to_parent(
  p_variation_id uuid,
  p_target_parent_id uuid,
  p_attributes jsonb DEFAULT '[]'::jsonb,
  p_name text DEFAULT '',
  p_images jsonb DEFAULT '[]'::jsonb,
  p_source_parent_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_source_parent_id uuid;
  v_source_variations_count int;
  v_target_code text;
  v_existing_sku_list text[];
  v_max_suffix int := 0;
  v_next_suffix text;
  v_new_sku text;
  v_sku_item text;
  v_match_array text[];
  v_source_removed boolean := false;
  v_target_merged_images jsonb;
  v_target_parent_images jsonb;
  v_target_relation_images jsonb;
BEGIN
  -- A. Validar existência da variação
  SELECT product_id INTO v_source_parent_id
  FROM public.product_variations
  WHERE id = p_variation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Variação % não foi encontrada no banco.', p_variation_id;
  END IF;

  -- Se source_parent_id não for informado pelo client, derivar da própria variação
  IF p_source_parent_id IS NULL THEN
    p_source_parent_id := v_source_parent_id;
  END IF;

  -- B. Validar produto pai destino
  SELECT code, COALESCE(images, '[]'::jsonb)
  INTO v_target_code, v_target_parent_images
  FROM public.products
  WHERE id = p_target_parent_id AND deleted = false
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto pai de destino % não encontrado ou desativado.', p_target_parent_id;
  END IF;

  -- C. Determinar a quantidade de variações restantes no pai de origem
  IF p_source_parent_id IS NOT NULL AND p_source_parent_id <> p_target_parent_id THEN
    SELECT COUNT(*) INTO v_source_variations_count
    FROM public.product_variations
    WHERE product_id = p_source_parent_id;
  ELSE
    v_source_variations_count := 0;
  END IF;

  -- D. Calcular próximo SKU sequencial usando MAX(sufixo) + 1
  v_target_code := btrim(COALESCE(v_target_code, ''));
  
  IF v_target_code <> '' THEN
    -- Obter todos os SKUs da família destino com o prefixo
    SELECT array_agg(sku) INTO v_existing_sku_list
    FROM public.product_variations
    WHERE product_id = p_target_parent_id
      AND sku IS NOT NULL
      AND sku <> '';

    IF v_existing_sku_list IS NOT NULL THEN
      FOREACH v_sku_item IN ARRAY v_existing_sku_list
      LOOP
        -- Extrair o sufixo numérico no formato {codigo_pai}-{sufixo}
        v_match_array := regexp_matches(v_sku_item, '^' || regexp_replace(v_target_code, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '-(\d+)$', 'i');
        IF v_match_array IS NOT NULL AND array_length(v_match_array, 1) >= 1 THEN
          IF v_match_array[1]::int > v_max_suffix THEN
            v_max_suffix := v_match_array[1]::int;
          END IF;
        END IF;
      END LOOP;
    END IF;

    v_next_suffix := lpad((v_max_suffix + 1)::text, 2, '0');
    v_new_sku := v_target_code || '-' || v_next_suffix;
  ELSE
    v_new_sku := NULL;
  END IF;

  -- E. Mesclar fotos da variação no produto pai destino
  SELECT jsonb_agg(DISTINCT elem) INTO v_target_relation_images
  FROM public.product_images, jsonb_array_elements_text(jsonb_build_array(image_url)) elem
  WHERE product_id = p_target_parent_id;

  SELECT jsonb_agg(DISTINCT elem) INTO v_target_merged_images
  FROM (
    SELECT jsonb_array_elements_text(COALESCE(v_target_parent_images, '[]'::jsonb)) AS elem
    UNION
    SELECT jsonb_array_elements_text(COALESCE(v_target_relation_images, '[]'::jsonb)) AS elem
    UNION
    SELECT jsonb_array_elements_text(COALESCE(p_images, '[]'::jsonb)) AS elem
  ) t
  WHERE elem IS NOT NULL AND btrim(elem) <> '';

  -- Atualizar imagens da tabela products
  UPDATE public.products
  SET images = COALESCE(v_target_merged_images, '[]'::jsonb)
  WHERE id = p_target_parent_id;

  -- F. UPDATE principal — Mover a variação (UUID NUNCA MUDA)
  UPDATE public.product_variations
  SET product_id = p_target_parent_id,
      sku = COALESCE(v_new_sku, sku),
      attributes = CASE 
                     WHEN jsonb_typeof(p_attributes) = 'array' THEN 
                       (SELECT jsonb_object_agg(elem->>'name', elem->>'value')
                        FROM jsonb_array_elements(p_attributes) elem
                        WHERE btrim(COALESCE(elem->>'name','')) <> '' AND btrim(COALESCE(elem->>'value','')) <> '')
                     ELSE p_attributes
                   END,
      name = CASE WHEN btrim(p_name) <> '' THEN p_name ELSE name END,
      image_url = (
        SELECT string_agg(elem, ',')
        FROM jsonb_array_elements_text(COALESCE(p_images, '[]'::jsonb)) elem
      )
  WHERE id = p_variation_id;

  -- G. Tratar remoção do pai de origem se era a única variação
  IF v_source_variations_count = 1 AND p_source_parent_id IS NOT NULL AND p_source_parent_id <> p_target_parent_id THEN
    BEGIN
      -- Tentar exclusão física primeiro (pode ser impedida por trigger block_product_delete)
      DELETE FROM public.products WHERE id = p_source_parent_id;
      v_source_removed := true;
    EXCEPTION WHEN OTHERS THEN
      -- Aplicar a convenção oficial do ERP para exclusão lógica de produtos (active=false, deleted=true)
      UPDATE public.products
      SET active = false,
          deleted = true
      WHERE id = p_source_parent_id;
      v_source_removed := true;
    END;
  END IF;

  -- Retornar resultado estruturado em JSON
  RETURN jsonb_build_object(
    'success', true,
    'variationId', p_variation_id,
    'newSku', v_new_sku,
    'targetParentId', p_target_parent_id,
    'sourceParentId', p_source_parent_id,
    'sourceParentRemoved', v_source_removed
  );
END;
$$;
