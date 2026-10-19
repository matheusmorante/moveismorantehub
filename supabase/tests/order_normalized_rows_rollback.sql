-- Requires explicit approval on the shared project. No DDL in this proof.
-- Uses only an owned, rollback-only clone; no inventory wrapper or fiscal allocator.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '30s';
DO $proof$
DECLARE
    v_source public.orders%ROWTYPE;
    v_id text := gen_random_uuid()::text;
    v_payload jsonb;
    v_items jsonb;
    v_payments jsonb;
    v_item_before jsonb;
    v_payment_before jsonb;
    v_before jsonb;
    v_after jsonb;
    v_failed boolean := false;
    v_cases text[] := ARRAY[]::text[];
BEGIN
    IF (SELECT md5(prosrc) FROM pg_proc WHERE oid =
        'public.save_order_transaction(text,jsonb,jsonb,jsonb,boolean)'::regprocedure)
        <> '742845e03da3e181b44bf25c05e1a97e' THEN
        RAISE EXCEPTION 'PATCH_NOT_INSTALLED';
    END IF;
    SELECT * INTO STRICT v_source FROM public.orders
    WHERE id = '2c86a8ad-c261-4c51-b5ee-345e1746ae69'
      AND order_data->'testArtifact'->>'ownerId' = 'eccde09e-72d8-4efe-a387-eb34114dea39'
      AND order_data->'testArtifact'->>'runId' = 'c8905ad4-91ae-486b-b7c9-8be49a41a805';
    IF NOT public.test_artifact_is_test(to_jsonb(v_source)) THEN
        RAISE EXCEPTION 'OWNED_TEST_SOURCE_REQUIRED';
    END IF;
    PERFORM set_config('request.jwt.claim.sub', 'eccde09e-72d8-4efe-a387-eb34114dea39', true);
    PERFORM set_config('request.jwt.claims',
        '{"sub":"eccde09e-72d8-4efe-a387-eb34114dea39","role":"authenticated"}', true);

    v_items := v_source.order_data->'items';
    IF jsonb_typeof(v_items) IS DISTINCT FROM 'array' OR jsonb_array_length(v_items) <> 1 THEN
        RAISE EXCEPTION 'EXPECTED_ONE_OWNED_ITEM';
    END IF;
    v_payments := '[{"method":"PIX","amount":100,"fee":0,"feeType":"fixed","status":"Pendente","installments":1}]';
    v_payload := to_jsonb(v_source) || jsonb_build_object(
        'id', v_id, 'order_number', 'T-' || v_id, 'order_index', NULL,
        'status', 'draft', 'order_type', 'sale', 'stock_processed', false,
        'linked_order_id', NULL, 'return_order_id', NULL,
        'order_data', (v_source.order_data - ARRAY[
            'id','orderIndex','orderNumber','nfeDraft','nfe','nfeData','fiscalDocuments',
            'inventoryRequestHash','linkedOrderId','returnOrderId'
        ]) || jsonb_build_object('id',v_id,'status','draft','stockProcessed',false));

    -- Only this subtransaction creates rows. The deliberate final exception undoes all.
    BEGIN
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, false);
        IF (SELECT count(*) FROM public.order_payments WHERE order_id=v_id AND paid_at IS NULL) <> 1
            OR (SELECT order_index FROM public.orders WHERE id=v_id) IS NOT NULL THEN
            RAISE EXCEPTION 'PENDING_DATE_OR_TEST_NUMBER_FAILED';
        END IF;
        v_cases := array_append(v_cases, 'new_pending_has_no_paid_at_or_commercial_number');
        SELECT to_jsonb(i) INTO STRICT v_item_before FROM public.order_items i WHERE order_id=v_id;
        SELECT to_jsonb(p) INTO STRICT v_payment_before FROM public.order_payments p WHERE order_id=v_id;

        v_payload := jsonb_set(v_payload, '{order_data,nfeDraft}', '{"proof":"metadata-only"}', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT to_jsonb(i) FROM public.order_items i WHERE order_id=v_id) IS DISTINCT FROM v_item_before
            OR (SELECT to_jsonb(p) FROM public.order_payments p WHERE order_id=v_id) IS DISTINCT FROM v_payment_before THEN
            RAISE EXCEPTION 'METADATA_SAVE_CHANGED_ROWS';
        END IF;
        v_cases := array_append(v_cases, 'fiscal_metadata_preserves_complete_rows');

        v_items := jsonb_set(v_items, '{0,observation}', '"rollback-only item change"', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT id::text FROM public.order_items WHERE order_id=v_id) IS DISTINCT FROM v_item_before->>'id'
            OR (SELECT to_jsonb(created_at) FROM public.order_items WHERE order_id=v_id) IS DISTINCT FROM v_item_before->'created_at'
            OR (SELECT observation FROM public.order_items WHERE order_id=v_id) <> 'rollback-only item change' THEN
            RAISE EXCEPTION 'ITEM_UPDATE_IDENTITY_FAILED';
        END IF;
        v_cases := array_append(v_cases, 'item_edit_preserves_identity_and_creation_date');

        v_payments := jsonb_set(v_payments, '{0,paymentDate}', '"2026-10-18T10:00:00Z"', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT paid_at FROM public.order_payments WHERE order_id=v_id) IS NOT NULL THEN
            RAISE EXCEPTION 'PENDING_EXPLICIT_DATE_ACCEPTED';
        END IF;
        v_cases := array_append(v_cases, 'pending_date_does_not_prove_settlement');
        v_payments := jsonb_set(v_payments, '{0,status}', '"Pago"', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT paid_at FROM public.order_payments WHERE order_id=v_id) IS DISTINCT FROM '2026-10-18T10:00:00Z'::timestamptz
            OR (SELECT id::text FROM public.order_payments WHERE order_id=v_id) IS DISTINCT FROM v_payment_before->>'id'
            OR (SELECT to_jsonb(created_at) FROM public.order_payments WHERE order_id=v_id) IS DISTINCT FROM v_payment_before->'created_at' THEN
            RAISE EXCEPTION 'EXPLICIT_SETTLEMENT_FAILED';
        END IF;
        v_cases := array_append(v_cases, 'settlement_uses_explicit_date_preserving_identity');

        v_payments := v_payments #- '{0,paymentDate}';
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT paid_at FROM public.order_payments WHERE order_id=v_id) IS DISTINCT FROM '2026-10-18T10:00:00Z'::timestamptz THEN
            RAISE EXCEPTION 'PAID_DATE_LOST_ON_REPLAY';
        END IF;
        v_cases := array_append(v_cases, 'paid_replay_without_date_preserves_known_date');
        v_payments := jsonb_set(v_payments, '{0,date}', '"2026-10-18T11:00:00Z"', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT paid_at FROM public.order_payments WHERE order_id=v_id) IS DISTINCT FROM '2026-10-18T11:00:00Z'::timestamptz THEN
            RAISE EXCEPTION 'LEGACY_DATE_COMPATIBILITY_FAILED';
        END IF;
        v_cases := array_append(v_cases, 'legacy_explicit_date_remains_supported');
        v_payments := jsonb_set(v_payments, '{0,paymentDate}', '"2026-10-18T12:00:00Z"', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT paid_at FROM public.order_payments WHERE order_id=v_id) IS DISTINCT FROM '2026-10-18T12:00:00Z'::timestamptz THEN
            RAISE EXCEPTION 'CANONICAL_DATE_PRIORITY_FAILED';
        END IF;
        v_cases := array_append(v_cases, 'paymentDate_precedes_legacy_date');

        v_payments := jsonb_set(v_payments #- '{0,paymentDate}' #- '{0,date}', '{0,status}', '"Pendente"', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT paid_at FROM public.order_payments WHERE order_id=v_id) IS NOT NULL THEN
            RAISE EXCEPTION 'UNSETTLED_DATE_NOT_CLEARED';
        END IF;
        v_cases := array_append(v_cases, 'actual_transition_to_pending_clears_paid_date');
        v_payments := jsonb_set(v_payments, '{0,status}', '"Pago"', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT paid_at FROM public.order_payments WHERE order_id=v_id) IS NOT NULL THEN
            RAISE EXCEPTION 'SETTLEMENT_DATE_INVENTED';
        END IF;
        v_cases := array_append(v_cases, 'settlement_without_actual_date_does_not_invent_one');

        -- Reproduce a legacy pending row with an incorrect historical date, in the clone only.
        v_payments := jsonb_set(v_payments, '{0,status}', '"Pendente"', true);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        UPDATE public.order_payments SET paid_at='2026-10-17T08:00:00Z'::timestamptz WHERE order_id=v_id;
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT paid_at FROM public.order_payments WHERE order_id=v_id) IS DISTINCT FROM '2026-10-17T08:00:00Z'::timestamptz THEN
            RAISE EXCEPTION 'METADATA_SILENTLY_REWROTE_LEGACY_DATE';
        END IF;
        v_cases := array_append(v_cases, 'unchanged_legacy_pending_row_is_not_silently_repaired');

        v_items := v_items || v_items;
        v_payments := v_payments || v_payments;
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT count(*) FROM public.order_items WHERE order_id=v_id) <> 2
            OR (SELECT count(*) FROM public.order_payments WHERE order_id=v_id) <> 2 THEN
            RAISE EXCEPTION 'APPEND_FAILED';
        END IF;
        v_items := jsonb_build_array(v_items->0);
        v_payments := jsonb_build_array(v_payments->0);
        PERFORM public.save_order_transaction(v_id, v_payload, v_items, v_payments, true);
        IF (SELECT count(*) FROM public.order_items WHERE order_id=v_id) <> 1
            OR (SELECT count(*) FROM public.order_payments WHERE order_id=v_id) <> 1
            OR (SELECT id::text FROM public.order_items WHERE order_id=v_id) IS DISTINCT FROM v_item_before->>'id'
            OR (SELECT id::text FROM public.order_payments WHERE order_id=v_id) IS DISTINCT FROM v_payment_before->>'id' THEN
            RAISE EXCEPTION 'PRUNE_OR_SURVIVOR_IDENTITY_FAILED';
        END IF;
        v_cases := array_append(v_cases, 'append_and_prune_preserve_surviving_positions');

        SELECT jsonb_build_object('order',to_jsonb(o),
            'items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY item_index) FROM public.order_items i WHERE order_id=v_id),
            'payments',(SELECT jsonb_agg(to_jsonb(p) ORDER BY payment_index) FROM public.order_payments p WHERE order_id=v_id))
        INTO v_before FROM public.orders o WHERE id=v_id;
        BEGIN
            PERFORM public.save_order_transaction(v_id,
                v_payload || '{"notes":"must roll back"}'::jsonb,
                jsonb_set(v_items,'{0,observation}','"must roll back"',true),
                jsonb_set(v_payments,'{0,amount}','"invalid-numeric"',true),true);
        EXCEPTION WHEN invalid_text_representation THEN
            v_failed := true;
        END;
        SELECT jsonb_build_object('order',to_jsonb(o),
            'items',(SELECT jsonb_agg(to_jsonb(i) ORDER BY item_index) FROM public.order_items i WHERE order_id=v_id),
            'payments',(SELECT jsonb_agg(to_jsonb(p) ORDER BY payment_index) FROM public.order_payments p WHERE order_id=v_id))
        INTO v_after FROM public.orders o WHERE id=v_id;
        IF NOT v_failed OR v_after IS DISTINCT FROM v_before THEN
            RAISE EXCEPTION 'INTERNAL_PAYMENT_FAILURE_NOT_ATOMIC';
        END IF;
        v_cases := array_append(v_cases, 'internal_payment_cast_failure_rolls_back_header_and_items');

        PERFORM public.save_order_transaction(v_id, v_payload, '[]', '[]', true);
        IF EXISTS (SELECT 1 FROM public.order_items WHERE order_id=v_id)
            OR EXISTS (SELECT 1 FROM public.order_payments WHERE order_id=v_id) THEN
            RAISE EXCEPTION 'EMPTY_ARRAY_DID_NOT_CLEAR';
        END IF;
        v_cases := array_append(v_cases, 'empty_arrays_remove_all_child_rows');
        IF EXISTS (SELECT 1 FROM public.inventory_moves WHERE order_id=v_id)
            OR EXISTS (SELECT 1 FROM public.nfe_documents WHERE order_id=v_id)
            OR EXISTS (SELECT 1 FROM public.nfe_outbound_attempts WHERE order_id=v_id) THEN
            RAISE EXCEPTION 'UNEXPECTED_INVENTORY_OR_FISCAL_EFFECT';
        END IF;
        RAISE EXCEPTION USING ERRCODE='Z9001', MESSAGE='OWNED_PROOF_ROLLBACK';
    EXCEPTION WHEN SQLSTATE 'Z9001' THEN
        NULL;
    END;
    IF EXISTS (SELECT 1 FROM public.orders WHERE id=v_id)
        OR EXISTS (SELECT 1 FROM public.order_items WHERE order_id=v_id)
        OR EXISTS (SELECT 1 FROM public.order_payments WHERE order_id=v_id) THEN
        RAISE EXCEPTION 'OUTER_PROOF_ROLLBACK_FAILED';
    END IF;
    PERFORM set_config('test.nfh_normalized_rows_proof',jsonb_build_object(
        'sourceOrderId',v_source.id,'cloneId',v_id,'cases',to_jsonb(v_cases),
        'caseCount',cardinality(v_cases),'internalFailureRolledBack',v_failed,
        'cloneRolledBack',true,'verified',true)::text,true);
END;
$proof$;
SELECT current_setting('test.nfh_normalized_rows_proof')::jsonb AS proof;
ROLLBACK;
