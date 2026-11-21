BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE public.inbound_supplier_item_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id text NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
  supplier_product_code text NOT NULL,
  link_mode text NOT NULL CHECK (link_mode IN ('single', 'composition', 'not_applicable', 'unlinked')),
  product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
  variation_id uuid REFERENCES public.product_variations(id) ON DELETE RESTRICT,
  supplier_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inbound_supplier_item_mappings_supplier_code_unique
    UNIQUE (supplier_id, supplier_product_code),
  CONSTRAINT inbound_supplier_item_mappings_code_normalized_check
    CHECK (supplier_product_code <> '' AND supplier_product_code = upper(btrim(supplier_product_code))),
  CONSTRAINT inbound_supplier_item_mappings_mode_values_check CHECK (
    (link_mode = 'single' AND product_id IS NOT NULL)
    OR (link_mode <> 'single' AND product_id IS NULL AND variation_id IS NULL)
  )
);

CREATE TABLE public.inbound_supplier_item_mapping_components (
  mapping_id uuid NOT NULL REFERENCES public.inbound_supplier_item_mappings(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variation_id uuid REFERENCES public.product_variations(id) ON DELETE RESTRICT,
  quantity_multiplier numeric(14, 4) NOT NULL CHECK (quantity_multiplier > 0),
  PRIMARY KEY (mapping_id, position)
);

CREATE INDEX inbound_supplier_item_mapping_components_product_idx
  ON public.inbound_supplier_item_mapping_components (product_id, variation_id);

CREATE INDEX inbound_supplier_item_mappings_product_idx
  ON public.inbound_supplier_item_mappings (product_id, variation_id)
  WHERE link_mode = 'single';

ALTER TABLE public.inbound_supplier_item_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_supplier_item_mapping_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY inbound_supplier_item_mappings_authenticated_read
  ON public.inbound_supplier_item_mappings
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

CREATE POLICY inbound_supplier_item_mapping_components_authenticated_read
  ON public.inbound_supplier_item_mapping_components
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

GRANT SELECT ON public.inbound_supplier_item_mappings TO authenticated, service_role;
GRANT SELECT ON public.inbound_supplier_item_mapping_components TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.save_inbound_supplier_item_mapping(
  p_supplier_id text,
  p_supplier_product_code text,
  p_link_mode text,
  p_product_id uuid DEFAULT NULL,
  p_variation_id uuid DEFAULT NULL,
  p_components jsonb DEFAULT '[]'::jsonb,
  p_supplier_description text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_code text := upper(btrim(COALESCE(p_supplier_product_code, '')));
  v_supplier_id text := btrim(COALESCE(p_supplier_id, ''));
  v_link_mode text := COALESCE(p_link_mode, '');
  v_product_id uuid := p_product_id;
  v_variation_id uuid := p_variation_id;
  v_canonical_variation_id uuid;
  v_mapping_id uuid;
  v_component record;
  v_component_product_text text;
  v_component_variation_text text;
  v_component_quantity_text text;
  v_component_product_id uuid;
  v_component_variation_id uuid;
  v_component_canonical_id uuid;
  v_component_count integer := 0;
  v_position integer := 0;
BEGIN
  IF auth.uid() IS NULL AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Autenticação obrigatória para alterar vínculos de itens.' USING ERRCODE = '42501';
  END IF;

  IF v_supplier_id = '' OR v_code = '' THEN
    RAISE EXCEPTION 'Fornecedor e código completo do item são obrigatórios.' USING ERRCODE = '22023';
  END IF;

  IF v_link_mode NOT IN ('single', 'composition', 'not_applicable', 'unlinked') THEN
    RAISE EXCEPTION 'Modo de vínculo inválido.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.people s
    WHERE s.id = v_supplier_id
      AND s.person_type IN ('supplier', 'suppliers')
      AND s.active IS TRUE AND s.deleted IS NOT TRUE
  ) THEN
    RAISE EXCEPTION 'Fornecedor indisponível para vínculo de produtos.' USING ERRCODE = '22023';
  END IF;

  IF v_link_mode = 'single' THEN
    IF v_product_id IS NULL THEN
      RAISE EXCEPTION 'O modo Único exige um produto.' USING ERRCODE = '22023';
    END IF;

    IF v_variation_id IS NOT NULL THEN
      v_canonical_variation_id := public.resolve_canonical_variation_id(v_variation_id);
      v_variation_id := COALESCE(v_canonical_variation_id, v_variation_id);
      SELECT v.product_id INTO v_product_id
      FROM public.product_variations v
      WHERE v.id = v_variation_id AND v.active IS NOT FALSE;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'A variação selecionada não está mais disponível.' USING ERRCODE = '22023';
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = v_product_id
        AND p.active IS TRUE AND p.deleted IS FALSE
        AND p.is_draft IS NOT TRUE AND p.status IS DISTINCT FROM 'draft'
    ) THEN
      RAISE EXCEPTION 'O produto selecionado está inativo ou indisponível.' USING ERRCODE = '22023';
    END IF;
  ELSIF v_link_mode = 'composition' THEN
    IF jsonb_typeof(COALESCE(p_components, '[]'::jsonb)) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'O modo Composto exige uma lista de componentes.' USING ERRCODE = '22023';
    END IF;
    v_component_count := jsonb_array_length(COALESCE(p_components, '[]'::jsonb));
    IF v_component_count < 1 OR v_component_count > 50 THEN
      RAISE EXCEPTION 'O modo Composto exige de 1 a 50 componentes.' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF p_components IS NOT NULL AND jsonb_typeof(p_components) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'O modo selecionado não aceita componentes.' USING ERRCODE = '22023';
    END IF;
    IF p_components IS NOT NULL AND jsonb_array_length(p_components) > 0 THEN
      RAISE EXCEPTION 'O modo selecionado não aceita componentes.' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.inbound_supplier_item_mappings (
    supplier_id, supplier_product_code, link_mode, product_id, variation_id,
    supplier_description, updated_at
  ) VALUES (
    v_supplier_id, v_code, v_link_mode,
    CASE WHEN v_link_mode = 'single' THEN v_product_id END,
    CASE WHEN v_link_mode = 'single' THEN v_variation_id END,
    NULLIF(btrim(p_supplier_description), ''), now()
  )
  ON CONFLICT (supplier_id, supplier_product_code) DO UPDATE SET
    link_mode = EXCLUDED.link_mode,
    product_id = EXCLUDED.product_id,
    variation_id = EXCLUDED.variation_id,
    supplier_description = EXCLUDED.supplier_description,
    updated_at = now()
  RETURNING id INTO v_mapping_id;

  DELETE FROM public.inbound_supplier_item_mapping_components c
  WHERE c.mapping_id = v_mapping_id;

  IF v_link_mode = 'composition' THEN
    FOR v_component IN
      SELECT value, ordinality
      FROM jsonb_array_elements(p_components) WITH ORDINALITY AS component(value, ordinality)
    LOOP
      v_position := v_component.ordinality::integer;
      v_component_product_text := COALESCE(v_component.value->>'productId', v_component.value->>'product_id', '');
      IF v_component_product_text !~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' THEN
        RAISE EXCEPTION 'Um componente possui produto inválido.' USING ERRCODE = '22023';
      END IF;
      v_component_product_id := v_component_product_text::uuid;

      v_component_variation_text := COALESCE(v_component.value->>'variationId', v_component.value->>'variation_id', '');
      IF v_component_variation_text <> '' THEN
        IF v_component_variation_text !~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' THEN
          RAISE EXCEPTION 'Um componente possui variação inválida.' USING ERRCODE = '22023';
        END IF;
        v_component_variation_id := v_component_variation_text::uuid;
        v_component_canonical_id := public.resolve_canonical_variation_id(v_component_variation_id);
        v_component_variation_id := COALESCE(v_component_canonical_id, v_component_variation_id);
        SELECT v.product_id INTO v_component_product_id
        FROM public.product_variations v
        WHERE v.id = v_component_variation_id AND v.active IS NOT FALSE;
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Uma variação da composição não está mais disponível.' USING ERRCODE = '22023';
        END IF;
      ELSE
        v_component_variation_id := NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = v_component_product_id
          AND p.active IS TRUE AND p.deleted IS FALSE
          AND p.is_draft IS NOT TRUE AND p.status IS DISTINCT FROM 'draft'
      ) THEN
        RAISE EXCEPTION 'Um componente está inativo ou indisponível.' USING ERRCODE = '22023';
      END IF;

      v_component_quantity_text := COALESCE(v_component.value->>'quantityMultiplier', v_component.value->>'quantity_multiplier', '');
      IF v_component_quantity_text !~ '^[0-9]+([.][0-9]+)?$' THEN
        RAISE EXCEPTION 'A quantidade de cada componente precisa ser maior que zero.' USING ERRCODE = '22023';
      END IF;
      IF v_component_quantity_text::numeric <= 0 THEN
        RAISE EXCEPTION 'A quantidade de cada componente precisa ser maior que zero.' USING ERRCODE = '22023';
      END IF;

      INSERT INTO public.inbound_supplier_item_mapping_components (
        mapping_id, position, product_id, variation_id, quantity_multiplier
      ) VALUES (
        v_mapping_id, v_position, v_component_product_id, v_component_variation_id,
        v_component_quantity_text::numeric
      );
    END LOOP;
  END IF;

  IF v_link_mode = 'single' THEN
    INSERT INTO public.product_supplier_codes (
      supplier_id, supplier_product_code, product_id, product_variation_id,
      supplier_description, is_active, updated_at
    ) VALUES (
      v_supplier_id, v_code, v_product_id, v_variation_id,
      NULLIF(btrim(p_supplier_description), ''), TRUE, now()
    )
    ON CONFLICT (supplier_id, supplier_product_code) DO UPDATE SET
      product_id = EXCLUDED.product_id,
      product_variation_id = EXCLUDED.product_variation_id,
      supplier_description = EXCLUDED.supplier_description,
      is_active = TRUE,
      updated_at = now();
  ELSE
    UPDATE public.product_supplier_codes
    SET is_active = FALSE, updated_at = now()
    WHERE supplier_id = v_supplier_id
      AND supplier_product_code = v_code
      AND is_active IS TRUE;
  END IF;

  RETURN jsonb_build_object(
    'id', v_mapping_id,
    'supplier_id', v_supplier_id,
    'supplier_product_code', v_code,
    'link_mode', v_link_mode,
    'product_id', CASE WHEN v_link_mode = 'single' THEN v_product_id END,
    'variation_id', CASE WHEN v_link_mode = 'single' THEN v_variation_id END
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.find_inbound_supplier_item_mappings(p_keys jsonb)
RETURNS TABLE (
  supplier_id text,
  supplier_product_code text,
  link_mode text,
  product_id uuid,
  variation_id uuid,
  product_name text,
  product_sku text,
  selling_price numeric,
  components jsonb,
  supplier_description text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH requested AS MATERIALIZED (
    SELECT DISTINCT btrim(input.supplier_id) AS supplier_id,
           upper(btrim(input.supplier_product_code)) AS supplier_product_code
    FROM jsonb_to_recordset(
      CASE WHEN jsonb_typeof(p_keys) = 'array' THEN p_keys ELSE '[]'::jsonb END
    ) AS input(supplier_id text, supplier_product_code text)
    WHERE NULLIF(btrim(input.supplier_id), '') IS NOT NULL
      AND NULLIF(btrim(input.supplier_product_code), '') IS NOT NULL
  )
  SELECT m.supplier_id,
         m.supplier_product_code,
         m.link_mode,
         CASE WHEN m.link_mode = 'single' THEN m.product_id END,
         CASE WHEN m.link_mode = 'single' THEN m.variation_id END,
         CASE WHEN m.link_mode = 'single' THEN COALESCE(NULLIF(v.name, ''), p.name) END,
         CASE WHEN m.link_mode = 'single' THEN COALESCE(NULLIF(v.sku, ''), p.code, '') END,
         CASE WHEN m.link_mode = 'single'
           THEN COALESCE(CASE WHEN v.use_parent_price IS NOT FALSE THEN p.unit_price ELSE v.price END, p.unit_price, 0)
         END,
         COALESCE((
           SELECT jsonb_agg(jsonb_build_object(
             'productId', c.product_id,
             'variationId', c.variation_id,
             'productErpName', COALESCE(NULLIF(cv.name, ''), cp.name),
             'linkedProductCode', COALESCE(NULLIF(cv.sku, ''), cp.code, ''),
             'sellingPrice', COALESCE(CASE WHEN cv.use_parent_price IS NOT FALSE THEN cp.unit_price ELSE cv.price END, cp.unit_price, 0),
             'quantityMultiplier', c.quantity_multiplier
           ) ORDER BY c.position)
           FROM public.inbound_supplier_item_mapping_components c
           JOIN public.products cp ON cp.id = c.product_id
           LEFT JOIN public.product_variations cv ON cv.id = c.variation_id
           WHERE c.mapping_id = m.id
         ), '[]'::jsonb),
         m.supplier_description
  FROM requested r
  JOIN public.inbound_supplier_item_mappings m
    ON m.supplier_id = r.supplier_id
   AND m.supplier_product_code = r.supplier_product_code
  LEFT JOIN public.products p ON p.id = m.product_id
  LEFT JOIN public.product_variations v ON v.id = m.variation_id;
$function$;

-- Automatic reuse can use only an explicit current global single-item choice.
-- Legacy memories and historical note snapshots are not promoted to global truth.
CREATE OR REPLACE FUNCTION public.find_inbound_invoice_product_links(
  p_supplier_id text, p_environment smallint, p_codes text[], p_exclude_invoice_id uuid
)
RETURNS TABLE (
  code text, product_id uuid, variation_id uuid, product_name text, sku text, selling_price numeric
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
  WITH requested AS MATERIALIZED (
    SELECT DISTINCT upper(btrim(input.code)) AS code
    FROM unnest(p_codes) AS input(code)
    WHERE NULLIF(btrim(input.code), '') IS NOT NULL
  ),
  supplier AS MATERIALIZED (
    SELECT s.id
    FROM public.people s
    WHERE s.id = p_supplier_id
      AND s.person_type IN ('supplier', 'suppliers')
      AND s.active IS TRUE AND s.deleted IS NOT TRUE
      AND NOT (COALESCE('salvados' = ANY(s.stock_origins), false)
        AND NOT COALESCE('normal' = ANY(s.stock_origins), false))
  )
  SELECT m.supplier_product_code, m.product_id, m.variation_id,
         COALESCE(NULLIF(v.name, ''), p.name),
         COALESCE(NULLIF(v.sku, ''), p.code, ''),
         COALESCE(CASE WHEN v.use_parent_price IS NOT FALSE THEN p.unit_price ELSE v.price END, p.unit_price, 0)
  FROM supplier s
  JOIN public.inbound_supplier_item_mappings m ON m.supplier_id = s.id AND m.link_mode = 'single'
  JOIN requested r ON r.code = m.supplier_product_code
  JOIN public.products p ON p.id = m.product_id
  LEFT JOIN public.product_variations v ON v.id = m.variation_id
  WHERE p.active IS TRUE AND p.deleted IS FALSE
    AND p.is_draft IS NOT TRUE AND p.status IS DISTINCT FROM 'draft';
$function$;

REVOKE ALL ON FUNCTION public.save_inbound_supplier_item_mapping(text, text, text, uuid, uuid, jsonb, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.find_inbound_supplier_item_mappings(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_inbound_supplier_item_mapping(text, text, text, uuid, uuid, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_inbound_supplier_item_mappings(jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_inbound_invoice_product_links(text, smallint, text[], uuid) TO authenticated, service_role;

COMMIT;
