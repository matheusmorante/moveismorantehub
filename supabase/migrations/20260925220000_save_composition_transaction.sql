-- Persiste composição, variações e itens em uma única transação.
-- O cliente envia apenas a configuração; o banco controla a ordem das mutações
-- e desfaz tudo quando qualquer validação ou escrita falha.

CREATE OR REPLACE FUNCTION public.save_composition_transaction(
    p_composition jsonb,
    p_variations jsonb,
    p_composition_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_composition_id uuid := p_composition_id;
    v_variation jsonb;
    v_item jsonb;
    v_variation_id uuid;
    v_quantity numeric;
BEGIN
    IF jsonb_typeof(COALESCE(p_variations, '[]'::jsonb)) <> 'array' THEN
        RAISE EXCEPTION 'p_variations deve ser um array JSON';
    END IF;

    IF v_composition_id IS NULL THEN
        INSERT INTO public.compositions (
            name,
            sku,
            description,
            active,
            catalog_published,
            pricing_mode,
            manual_price
        )
        VALUES (
            p_composition->>'name',
            p_composition->>'sku',
            p_composition->>'description',
            COALESCE((p_composition->>'active')::boolean, true),
            COALESCE((p_composition->>'catalog_published')::boolean, false),
            COALESCE(p_composition->>'pricing_mode', 'sum'),
            NULLIF(p_composition->>'manual_price', '')::numeric
        )
        RETURNING id INTO v_composition_id;
    ELSE
        UPDATE public.compositions
           SET name = p_composition->>'name',
               sku = p_composition->>'sku',
               description = p_composition->>'description',
               active = COALESCE((p_composition->>'active')::boolean, active),
               catalog_published = COALESCE((p_composition->>'catalog_published')::boolean, catalog_published),
               pricing_mode = COALESCE(p_composition->>'pricing_mode', pricing_mode),
               manual_price = NULLIF(p_composition->>'manual_price', '')::numeric,
               updated_at = timezone('utc'::text, now())
         WHERE id = v_composition_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Composição % não encontrada', v_composition_id;
        END IF;
    END IF;

    FOR v_variation IN
        SELECT value FROM jsonb_array_elements(COALESCE(p_variations, '[]'::jsonb))
    LOOP
        v_variation_id := NULLIF(v_variation->>'id', '')::uuid;

        IF v_variation_id IS NULL THEN
            INSERT INTO public.composition_variations (
                composition_id,
                name,
                sku,
                attributes,
                active
            )
            VALUES (
                v_composition_id,
                COALESCE(NULLIF(v_variation->>'name', ''), 'Padrão'),
                NULLIF(v_variation->>'sku', ''),
                v_variation->'attributes',
                COALESCE((v_variation->>'active')::boolean, true)
            )
            RETURNING id INTO v_variation_id;
        ELSE
            UPDATE public.composition_variations
               SET name = COALESCE(NULLIF(v_variation->>'name', ''), 'Padrão'),
                   sku = NULLIF(v_variation->>'sku', ''),
                   attributes = v_variation->'attributes',
                   active = COALESCE((v_variation->>'active')::boolean, active),
                   updated_at = timezone('utc'::text, now())
             WHERE id = v_variation_id
               AND composition_id = v_composition_id;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'Variação de composição % não pertence à composição %', v_variation_id, v_composition_id;
            END IF;
        END IF;

        DELETE FROM public.composition_variation_items
         WHERE composition_variation_id = v_variation_id;

        FOR v_item IN
            SELECT value FROM jsonb_array_elements(COALESCE(v_variation->'items', '[]'::jsonb))
        LOOP
            v_quantity := NULLIF(v_item->>'quantity', '')::numeric;
            IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity <> trunc(v_quantity) THEN
                RAISE EXCEPTION 'Quantidade de componente inválida: %', v_item->>'quantity';
            END IF;

            INSERT INTO public.composition_variation_items (
                composition_variation_id,
                product_id,
                variation_id,
                quantity
            )
            VALUES (
                v_variation_id,
                v_item->>'product_id',
                NULLIF(v_item->>'variation_id', ''),
                v_quantity::integer
            );
        END LOOP;
    END LOOP;

    RETURN v_composition_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_composition_transaction(jsonb, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_composition_transaction(jsonb, jsonb, uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
