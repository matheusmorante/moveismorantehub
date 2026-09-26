CREATE OR REPLACE FUNCTION public.save_nfe_operation_draft_review(
  p_draft_id uuid,
  p_review_data jsonb,
  p_lines jsonb,
  p_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_draft public.nfe_operation_drafts%ROWTYPE;
  v_line public.nfe_operation_draft_lines%ROWTYPE;
  v_review_line jsonb;
  v_count integer;
  v_seen integer := 0;
  v_cfop text;
BEGIN
  IF jsonb_typeof(p_review_data) <> 'object'
     OR jsonb_typeof(p_lines) <> 'array'
     OR NULLIF(btrim(p_review_data->>'nature_of_operation'), '') IS NULL
     OR NULLIF(btrim(p_review_data->>'recipient_xml'), '') IS NULL
     OR NULLIF(btrim(p_review_data->>'totals_xml'), '') IS NULL
     OR NULLIF(btrim(p_review_data->>'transport_xml'), '') IS NULL
     OR NULLIF(btrim(p_review_data->>'payment_xml'), '') IS NULL
     OR p_review_data->>'item_taxes_confirmed' <> 'true'
     OR p_review_data->>'totals_confirmed' <> 'true' THEN
    RAISE EXCEPTION 'Revisão fiscal incompleta';
  END IF;

  SELECT * INTO v_draft FROM public.nfe_operation_drafts
   WHERE id = p_draft_id FOR UPDATE;
  IF NOT FOUND OR v_draft.status NOT IN ('draft', 'ready') OR v_draft.access_key IS NOT NULL THEN
    RAISE EXCEPTION 'Rascunho não está disponível para revisão';
  END IF;
  IF v_draft.operation_kind = 'estorno'
     AND length(btrim(COALESCE(p_review_data->>'reason', v_draft.reason, ''))) < 15 THEN
    RAISE EXCEPTION 'Estorno requer justificativa fiscal';
  END IF;
  IF v_draft.operation_kind = 'return' AND NOT EXISTS (
    SELECT 1 FROM public.orders WHERE id = v_draft.return_order_id AND status = 'fulfilled'
  ) THEN
    RAISE EXCEPTION 'A devolução precisa estar atendida antes da revisão fiscal';
  END IF;

  SELECT count(*) INTO v_count FROM public.nfe_operation_draft_lines WHERE draft_id = v_draft.id;
  IF v_count = 0 OR v_count <> jsonb_array_length(p_lines) THEN
    RAISE EXCEPTION 'A revisão deve cobrir exatamente todos os itens do rascunho';
  END IF;
  FOR v_review_line IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
    SELECT * INTO v_line FROM public.nfe_operation_draft_lines
     WHERE id = NULLIF(v_review_line->>'draft_line_id', '')::uuid
       AND draft_id = v_draft.id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item fiscal de revisão não pertence ao rascunho'; END IF;
    v_cfop := regexp_replace(COALESCE(v_review_line->>'cfop', ''), '\D', '', 'g');
    IF v_cfop !~ '^[12][0-9]{3}$'
       OR NULLIF(v_review_line->>'product_xml', '') IS NULL
       OR NULLIF(v_review_line->>'taxes_xml', '') IS NULL
       OR (v_review_line->>'product_xml') !~ ('<CFOP>' || v_cfop || '</CFOP>')
       OR (v_review_line->>'product_xml') !~ ('<qCom>' || v_line.quantity::text || '</qCom>') THEN
      RAISE EXCEPTION 'CFOP, quantidade ou blocos fiscais do item % inválidos', v_line.fiscal_item_number;
    END IF;
    UPDATE public.nfe_operation_draft_lines SET
      reviewed_cfop = v_cfop,
      reviewed_product_xml = v_review_line->>'product_xml',
      reviewed_taxes_xml = v_review_line->>'taxes_xml',
      reviewed_at = now()
     WHERE id = v_line.id;
    v_seen := v_seen + 1;
  END LOOP;
  IF v_seen <> v_count THEN RAISE EXCEPTION 'Revisão de itens incompleta'; END IF;

  UPDATE public.nfe_operation_drafts SET
    status = 'ready', nature_of_operation = p_review_data->>'nature_of_operation',
    reason = COALESCE(NULLIF(p_review_data->>'reason', ''), reason),
    recipient_snapshot = jsonb_build_object('recipient_xml', p_review_data->>'recipient_xml'),
    review_data = p_review_data, reviewed_by = p_user_id, reviewed_at = now(), updated_at = now()
   WHERE id = v_draft.id;
  RETURN v_draft.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.save_nfe_operation_draft_review(uuid,jsonb,jsonb,uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_nfe_operation_draft_review(uuid,jsonb,jsonb,uuid)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.reserve_next_nfe_number(VARCHAR, VARCHAR, INTEGER, INTEGER)
  TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS uq_nfe_operation_drafts_access_key
  ON public.nfe_operation_drafts(access_key) WHERE access_key IS NOT NULL;
