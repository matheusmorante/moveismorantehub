-- Delivery progress is independent of the commercial order snapshot.  Keeping it
-- in a separate relation also prevents a stale ERP edit from replacing another
-- device's delivery state.
CREATE TABLE IF NOT EXISTS public.order_delivery_operations (
  order_id text NOT NULL REFERENCES public.orders(id),
  appointment_id text NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(state) = 'object'),
  applied_events jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(applied_events) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (order_id, appointment_id)
);
ALTER TABLE public.order_delivery_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_delivery_operations_read ON public.order_delivery_operations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_delivery_operations.order_id));
CREATE POLICY order_delivery_operations_insert ON public.order_delivery_operations FOR INSERT TO authenticated
  WITH CHECK (current_setting('morantehub.delivery_operation_write',true) = '1' AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_delivery_operations.order_id));
CREATE POLICY order_delivery_operations_update ON public.order_delivery_operations FOR UPDATE TO authenticated
  USING (current_setting('morantehub.delivery_operation_write',true) = '1' AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_delivery_operations.order_id))
  WITH CHECK (current_setting('morantehub.delivery_operation_write',true) = '1' AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_delivery_operations.order_id));
GRANT SELECT, INSERT, UPDATE ON public.order_delivery_operations TO authenticated, service_role;

-- Do not let a later order edit silently change items already being delivered.
CREATE OR REPLACE FUNCTION public.guard_started_delivery_operation_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $fn$
DECLARE
  v_operation record;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF OLD.order_data #> '{shipping,scheduling,appointments}' IS NOT DISTINCT FROM NEW.order_data #> '{shipping,scheduling,appointments}'
     AND OLD.order_data->'items' IS NOT DISTINCT FROM NEW.order_data->'items' THEN RETURN NEW; END IF;
  FOR v_operation IN SELECT appointment_id FROM public.order_delivery_operations
    WHERE order_id=OLD.id AND state <> '{}'::jsonb LOOP
    SELECT value INTO v_old FROM jsonb_array_elements(CASE WHEN jsonb_typeof(OLD.order_data #> '{shipping,scheduling,appointments}')='array'
      THEN OLD.order_data #> '{shipping,scheduling,appointments}' ELSE '[]'::jsonb END) WHERE value->>'id'=v_operation.appointment_id;
    SELECT value INTO v_new FROM jsonb_array_elements(CASE WHEN jsonb_typeof(NEW.order_data #> '{shipping,scheduling,appointments}')='array'
      THEN NEW.order_data #> '{shipping,scheduling,appointments}' ELSE '[]'::jsonb END) WHERE value->>'id'=v_operation.appointment_id;
    IF v_old IS NULL OR v_new IS NULL OR
       coalesce(v_old->'itemIds','[]'::jsonb) IS DISTINCT FROM coalesce(v_new->'itemIds','[]'::jsonb) OR
       coalesce(v_old->'itemQuantities','{}'::jsonb) IS DISTINCT FROM coalesce(v_new->'itemQuantities','{}'::jsonb) OR
       coalesce(v_old->'itemHandlings','{}'::jsonb) IS DISTINCT FROM coalesce(v_new->'itemHandlings','{}'::jsonb) OR
       coalesce(v_old->>'deliveryMethod',OLD.order_data #>> '{shipping,deliveryMethod}') IS DISTINCT FROM
         coalesce(v_new->>'deliveryMethod',NEW.order_data #>> '{shipping,deliveryMethod}') THEN
      RAISE EXCEPTION 'Os itens ou a modalidade de uma operação iniciada não podem ser alterados.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(OLD.order_data->'items')='array' THEN OLD.order_data->'items' ELSE '[]'::jsonb END) i(value)
      LEFT JOIN LATERAL (SELECT value FROM jsonb_array_elements(CASE WHEN jsonb_typeof(NEW.order_data->'items')='array' THEN NEW.order_data->'items' ELSE '[]'::jsonb END)
        WHERE coalesce(nullif(value->>'orderItemId',''),value->>'id')=coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id') LIMIT 1) n ON true
      WHERE (coalesce(v_old->'itemIds','[]'::jsonb) ? coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id','') OR
             coalesce(v_old->'itemQuantities','{}'::jsonb) ? coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id',''))
        AND i.value->>'quantity' IS DISTINCT FROM n.value->>'quantity'
    ) THEN RAISE EXCEPTION 'A quantidade de um item em uma operação iniciada não pode ser alterada.'; END IF;
  END LOOP;
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.guard_started_delivery_operation_items() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER guard_started_delivery_operation_items BEFORE UPDATE OF order_data ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_started_delivery_operation_items();

-- Return a projection only; neither the operation map nor this comparison
-- snapshot is written into the commercial/fiscal order snapshot.
CREATE OR REPLACE FUNCTION public.read_delivery_operation_order_state(p_order_id text)
RETURNS jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path='' AS $fn$
  SELECT jsonb_build_object('status',o.status,'version',o.version,'order_data',
    coalesce(o.order_data,'{}'::jsonb) || jsonb_build_object(
      'deliveryOperations',coalesce(ops.value,'{}'::jsonb),
      '__independentOperationRead',true,
      '__sharedPaymentSnapshot',jsonb_build_object('orderData',coalesce(o.order_data->'payments','null'::jsonb),
        'normalized',coalesce(pay.normalized,'[]'::jsonb))) ||
    CASE WHEN pay.canonical IS NOT NULL THEN jsonb_build_object('payments',pay.canonical) ELSE '{}'::jsonb END)
  FROM public.orders o
  LEFT JOIN LATERAL (SELECT jsonb_object_agg(d.appointment_id,d.state || jsonb_build_object('revision',d.revision)) AS value
    FROM public.order_delivery_operations d WHERE d.order_id=o.id) ops ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(jsonb_build_object('payment_index',p.payment_index,'payment_method',p.payment_method,
      'amount',p.amount,'fee',p.fee,'fee_type',p.fee_type,'status',p.status,
      'installments',p.installments,'paid_at',p.paid_at) ORDER BY p.payment_index) AS normalized,
      jsonb_agg(coalesce((CASE WHEN jsonb_typeof(o.order_data->'payments')='array' THEN o.order_data->'payments' ELSE '[]'::jsonb END)
        -> (CASE WHEN p.payment_index > 0 THEN p.payment_index - 1 ELSE p.row_num - 1 END)::integer,'{}'::jsonb) ||
        jsonb_build_object('method',coalesce(p.payment_method,''),'amount',coalesce(p.amount,0),
          'fee',coalesce(p.fee,0),'feeType',coalesce(p.fee_type,'fixed'),
          'status',coalesce(nullif(p.status,''),'PAGO'),'installments',coalesce(p.installments,1)) ORDER BY p.payment_index) AS canonical
    FROM (SELECT op.*,row_number() OVER (ORDER BY op.payment_index) AS row_num
      FROM public.order_payments op WHERE op.order_id=o.id) p
  ) pay ON true
  WHERE o.id=p_order_id;
$fn$;
REVOKE ALL ON FUNCTION public.read_delivery_operation_order_state(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_delivery_operation_order_state(text) TO authenticated, service_role;

-- Reject stale or malformed assignments before a team starts moving goods.
CREATE OR REPLACE FUNCTION public.delivery_operation_allocations_valid(p_data jsonb)
RETURNS boolean LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path='' AS $fn$
  WITH appointments AS (
    SELECT value, ordinality FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_data#>'{shipping,scheduling,appointments}')='array'
      THEN p_data#>'{shipping,scheduling,appointments}' ELSE '[]'::jsonb END) WITH ORDINALITY
  ), items AS (
    SELECT coalesce(nullif(value->>'orderItemId',''),value->>'id') AS id,
      CASE WHEN coalesce(value->>'quantity','') ~ '^[0-9]+([.][0-9]+)?$' THEN (value->>'quantity')::numeric END AS quantity
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_data->'items')='array' THEN p_data->'items' ELSE '[]'::jsonb END)
  ), selected AS (
    SELECT a.ordinality, a.value, s.id
    FROM appointments a CROSS JOIN LATERAL jsonb_array_elements_text(CASE WHEN jsonb_typeof(a.value->'itemIds')='array'
      THEN a.value->'itemIds' ELSE '[]'::jsonb END) s(id)
    UNION
    SELECT a.ordinality, a.value, s.id
    FROM appointments a CROSS JOIN LATERAL jsonb_object_keys(CASE WHEN jsonb_typeof(a.value->'itemQuantities')='object'
      THEN a.value->'itemQuantities' ELSE '{}'::jsonb END) s(id)
  ), quantities AS (
    SELECT s.id,i.quantity,
      CASE WHEN coalesce(s.value->'itemQuantities'->>s.id,i.quantity::text,'') ~ '^[0-9]+([.][0-9]+)?$'
        THEN coalesce(s.value->'itemQuantities'->>s.id,i.quantity::text)::numeric END AS assigned
    FROM selected s LEFT JOIN items i ON i.id=s.id
  )
  SELECT NOT EXISTS (SELECT 1 FROM quantities WHERE quantity IS NULL OR quantity <= 0 OR assigned IS NULL OR assigned <= 0)
    AND NOT EXISTS (SELECT 1 FROM quantities GROUP BY id HAVING sum(assigned) > min(quantity))
    AND NOT EXISTS (SELECT 1 FROM items WHERE id IN (SELECT id FROM selected) GROUP BY id HAVING count(*) > 1);
$fn$;
REVOKE ALL ON FUNCTION public.delivery_operation_allocations_valid(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delivery_operation_allocations_valid(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.apply_order_delivery_operation(
  p_order_id text, p_operation_id text, p_event_id text, p_event_type text,
  p_expected_revision integer, p_patch jsonb, p_expected_payments jsonb DEFAULT NULL,
  p_payments jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $fn$
DECLARE
  v_order public.orders%ROWTYPE;
  v_operation public.order_delivery_operations%ROWTYPE;
  v_appointment jsonb;
  v_state jsonb := '{}'::jsonb;
  v_next jsonb;
  v_status text;
  v_events jsonb := '[]'::jsonb;
  v_snapshot jsonb;
  v_current_payments jsonb;
  v_current_normalized jsonb;
  v_comparable_current jsonb;
  v_comparable_desired jsonb;
  v_skip_payment_update boolean := false;
  v_payment jsonb;
  v_payment_index integer;
  v_paid numeric := 0;
  v_total numeric := 0;
  v_order_data jsonb;
  v_event_time timestamptz := now();
  v_any_started boolean;
  v_any_arrived boolean;
  v_any_finished boolean;
  v_all_finished boolean := false;
BEGIN
  IF p_order_id IS NULL OR p_operation_id IS NULL OR p_operation_id = '' OR p_event_id IS NULL OR p_event_id = ''
     OR p_expected_revision IS NULL OR p_expected_revision < 0 OR jsonb_typeof(p_patch) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
  END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'reason', 'ENTITY_NOT_FOUND'); END IF;
  v_order_data := coalesce(v_order.order_data, '{}'::jsonb);
  -- A response can time out after commit, including after the final operation
  -- fulfilled the order. A retry of the same event must remain idempotent.
  SELECT * INTO v_operation FROM public.order_delivery_operations
    WHERE order_id = p_order_id AND appointment_id = p_operation_id;
  IF FOUND AND v_operation.applied_events ? p_event_id THEN
    RETURN jsonb_build_object('success',true,'server_version',v_order.version,
      'server_state',public.read_delivery_operation_order_state(p_order_id));
  END IF;
  IF coalesce(v_order.status,'') NOT IN ('scheduled', 'agendado') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
  END IF;
  IF jsonb_typeof(v_order_data #> '{shipping,scheduling,appointments}') IS DISTINCT FROM 'array' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
  END IF;
  IF NOT public.delivery_operation_allocations_valid(v_order_data) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
  END IF;
  SELECT a.value INTO v_appointment
  FROM jsonb_array_elements(v_order_data #> '{shipping,scheduling,appointments}') a(value)
  WHERE a.value->>'id' = p_operation_id;
  IF v_appointment IS NULL OR
     (SELECT count(*) FROM jsonb_array_elements(v_order_data #> '{shipping,scheduling,appointments}') a(value)
       WHERE a.value->>'id' = p_operation_id) <> 1 OR
     lower(coalesce(v_appointment->>'deliveryMethod', v_order_data #>> '{shipping,deliveryMethod}', 'delivery')) NOT IN ('delivery', 'entrega') OR
     (jsonb_typeof(v_appointment->'itemIds') IS DISTINCT FROM 'array' AND jsonb_typeof(v_appointment->'itemQuantities') IS DISTINCT FROM 'object') OR
     NOT EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_order_data->'items') = 'array'
       THEN v_order_data->'items' ELSE '[]'::jsonb END) i(value)
       WHERE (coalesce(v_appointment->'itemIds','[]'::jsonb) ? coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id','') OR
              coalesce(v_appointment->'itemQuantities','{}'::jsonb) ? coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id',''))
         AND CASE WHEN coalesce(v_appointment->'itemQuantities'->>coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id',''),i.value->>'quantity','0') ~ '^[0-9]+([.][0-9]+)?$'
           THEN (coalesce(v_appointment->'itemQuantities'->>coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id',''),i.value->>'quantity','0'))::numeric > 0 ELSE false END) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
  END IF;
  SELECT * INTO v_operation FROM public.order_delivery_operations
    WHERE order_id = p_order_id AND appointment_id = p_operation_id;
  IF FOUND THEN
    v_state := v_operation.state;
    v_events := v_operation.applied_events;
    IF v_events ? p_event_id THEN
      RETURN jsonb_build_object('success', true, 'server_version', v_order.version,
        'server_state', public.read_delivery_operation_order_state(p_order_id));
    END IF;
  ELSE
    v_operation.revision := 0;
    -- Old order-level progress cannot be attributed safely to one operation.
    IF NOT EXISTS (SELECT 1 FROM public.order_delivery_operations WHERE order_id = p_order_id) AND
       (v_order.delivery_started_at IS NOT NULL OR v_order.delivery_finished_at IS NOT NULL OR
       coalesce(v_order.delivery_status, v_order_data->>'deliveryStatus', '') IN ('in_progress','arrived','in_service','completed','unattended')) THEN
      RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
    END IF;
  END IF;
  IF v_operation.revision <> p_expected_revision THEN
    RETURN jsonb_build_object('success', false, 'reason', 'VERSION_CONFLICT');
  END IF;
  v_status := coalesce(v_state->>'deliveryStatus', '');
  v_next := v_state;
  CASE p_event_type
    WHEN 'DELIVERY_START_PREPARATION' THEN
      IF v_status <> '' OR coalesce(p_patch->>'deliveryPreparationStartedAt','') = '' THEN RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED'); END IF;
      v_next := v_next || jsonb_build_object('deliveryPreparationStartedAt', p_patch->'deliveryPreparationStartedAt');
    WHEN 'DELIVERY_START_ROUTE' THEN
      IF v_status <> '' OR coalesce(p_patch->>'deliveryStartedAt','') = '' OR jsonb_typeof(p_patch->'deliveryChecklist') IS DISTINCT FROM 'array' OR
         EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_patch->'deliveryChecklist')='array' THEN p_patch->'deliveryChecklist' ELSE '[]'::jsonb END) i WHERE i->>'checked' IS DISTINCT FROM 'true') OR
         jsonb_typeof(p_patch->'deliveryResponsibles') IS DISTINCT FROM 'array' OR jsonb_array_length(CASE WHEN jsonb_typeof(p_patch->'deliveryResponsibles')='array' THEN p_patch->'deliveryResponsibles' ELSE '[]'::jsonb END) = 0 THEN
        RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
      END IF;
      v_next := v_next || jsonb_build_object('deliveryStatus','in_progress','deliveryStartedAt',p_patch->'deliveryStartedAt',
        'deliveryPreparationStartedAt',NULL,'deliveryChecklist',p_patch->'deliveryChecklist',
        'deliveryResponsibles',p_patch->'deliveryResponsibles','deliveryResponsibleName',p_patch->'deliveryResponsibleName',
        'deliveryResponsibleId',p_patch->'deliveryResponsibleId');
    WHEN 'DELIVERY_ARRIVE_DESTINATION' THEN
      IF v_status <> 'in_progress' OR coalesce(p_patch->>'deliveryArrivedAt','') = '' THEN RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED'); END IF;
      v_next := v_next || jsonb_build_object('deliveryStatus','arrived','deliveryArrivedAt',p_patch->'deliveryArrivedAt');
    WHEN 'DELIVERY_START_SERVICE' THEN
      IF v_status <> 'arrived' OR coalesce(p_patch->>'deliveryServiceStartedAt','') = '' THEN RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED'); END IF;
      v_next := v_next || jsonb_build_object('deliveryStatus','in_service','deliveryServiceStartedAt',p_patch->'deliveryServiceStartedAt');
    WHEN 'DELIVERY_FINISH' THEN
      IF v_status <> 'in_service' OR coalesce(p_patch->>'deliveryFinishedAt','') = '' OR jsonb_typeof(p_payments) IS DISTINCT FROM 'array' OR jsonb_array_length(CASE WHEN jsonb_typeof(p_payments)='array' THEN p_payments ELSE '[]'::jsonb END) = 0 OR
         EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_payments)='array' THEN p_payments ELSE '[]'::jsonb END) p(value)
           WHERE lower(coalesce(p.value->>'status','')) NOT IN ('pago','paid') OR
             (p.value ? 'amount' AND CASE WHEN jsonb_typeof(p.value->'amount')='number' THEN (p.value->>'amount')::numeric < 0 ELSE true END) OR
             (p.value ? 'fee' AND CASE WHEN jsonb_typeof(p.value->'fee')='number' THEN (p.value->>'fee')::numeric < 0 ELSE true END)) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
      END IF;
      v_snapshot := public.read_delivery_operation_order_state(p_order_id);
      v_current_payments := coalesce(v_order_data->'payments', 'null'::jsonb);
      v_current_normalized := v_snapshot #> '{order_data,__sharedPaymentSnapshot,normalized}';
      IF jsonb_typeof(p_expected_payments) IS DISTINCT FROM 'object' THEN
        RETURN jsonb_build_object('success', false, 'reason', 'VERSION_CONFLICT');
      END IF;
      IF v_current_payments IS DISTINCT FROM coalesce(p_expected_payments->'orderData','null'::jsonb) OR
         v_current_normalized IS DISTINCT FROM coalesce(p_expected_payments->'normalized','[]'::jsonb) THEN
        SELECT coalesce(jsonb_agg(jsonb_build_object('index',p.payment_index,'method',coalesce(p.payment_method,''),
          'amount',p.amount,'fee',coalesce(p.fee,0),'feeType',coalesce(p.fee_type,'fixed'),
          'status',lower(coalesce(p.status,'')),'installments',coalesce(p.installments,1)) ORDER BY p.payment_index),'[]'::jsonb)
          INTO v_comparable_current FROM public.order_payments p WHERE p.order_id=p_order_id;
        SELECT coalesce(jsonb_agg(jsonb_build_object('index',p.ordinality,'method',coalesce(p.value->>'method',''),
          'amount',coalesce((p.value->>'amount')::numeric,0),'fee',coalesce((p.value->>'fee')::numeric,0),
          'feeType',coalesce(p.value->>'feeType','fixed'),'status',lower(coalesce(p.value->>'status','')),
          'installments',coalesce((p.value->>'installments')::integer,1)) ORDER BY p.ordinality),'[]'::jsonb)
          INTO v_comparable_desired FROM jsonb_array_elements(p_payments) WITH ORDINALITY p(value,ordinality);
        IF v_comparable_current IS DISTINCT FROM v_comparable_desired THEN
          RETURN jsonb_build_object('success', false, 'reason', 'VERSION_CONFLICT');
        END IF;
        -- Another operation already saved the same shared payment; retain its
        -- latest metadata instead of overwriting it with this stale snapshot.
        v_skip_payment_update := true;
      END IF;
      IF EXISTS (SELECT 1 FROM public.order_payments p WHERE p.order_id=p_order_id
        AND (p.payment_index < 1 OR p.payment_index > jsonb_array_length(p_payments))) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
      END IF;
      SELECT coalesce(sum(coalesce((p.value->>'amount')::numeric,0) +
        CASE WHEN p.value->>'feeType'='percentage' THEN coalesce((p.value->>'amount')::numeric,0) * coalesce((p.value->>'fee')::numeric,0) / 100
          ELSE coalesce((p.value->>'fee')::numeric,0) END),0) INTO v_paid FROM jsonb_array_elements(p_payments) p(value);
      v_total := coalesce(nullif(v_order_data #>> '{paymentsSummary,totalOrderValue}','')::numeric, v_paid);
      IF NOT v_skip_payment_update THEN
        v_payment_index := 0;
        FOR v_payment IN SELECT value FROM jsonb_array_elements(p_payments) LOOP
          v_payment_index := v_payment_index + 1;
          INSERT INTO public.order_payments(order_id,payment_index,payment_method,amount,fee,fee_type,status,installments,paid_at)
          VALUES (p_order_id,v_payment_index,v_payment->>'method',coalesce((v_payment->>'amount')::numeric,0),
            coalesce((v_payment->>'fee')::numeric,0),coalesce(v_payment->>'feeType','fixed'),
            coalesce(v_payment->>'status','PAGO'),coalesce((v_payment->>'installments')::integer,1),
            coalesce(nullif(v_payment->>'paymentDate',''),nullif(v_payment->>'date',''))::timestamptz)
          ON CONFLICT (order_id,payment_index) DO UPDATE SET payment_method=excluded.payment_method,
            amount=excluded.amount,fee=excluded.fee,fee_type=excluded.fee_type,status=excluded.status,
            installments=excluded.installments, paid_at=CASE WHEN excluded.paid_at IS NOT NULL THEN excluded.paid_at
              WHEN lower(coalesce(public.order_payments.status,'')) IN ('pago','paid') THEN public.order_payments.paid_at ELSE NULL END;
        END LOOP;
        v_order_data := v_order_data || jsonb_build_object('payments', p_payments, 'paymentsSummary',
          coalesce(v_order_data->'paymentsSummary','{}'::jsonb) || jsonb_build_object('totalOrderValue',v_total,
            'totalPaid',v_paid,'totalAmountPaid',v_paid,'amountRemaining',greatest(0,v_total-v_paid)));
      END IF;
      v_next := v_next || jsonb_build_object('deliveryStatus','completed','deliveryFinishedAt',p_patch->'deliveryFinishedAt');
    WHEN 'DELIVERY_UNATTENDED' THEN
      IF v_status NOT IN ('','arrived','in_service') OR coalesce(p_patch->>'unattendedAt','') = '' OR
         (v_status = '' AND coalesce(p_patch->>'unattendedReason','') NOT IN
           ('Cliente não poderá receber no momento','Cliente quer Cancelar','Problema no veículo','Outro motivo')) OR
         (v_status <> '' AND coalesce(p_patch->>'unattendedReason','') NOT IN
           ('Cliente comunicou que está ausente','Ninguém Atendeu no Local','Outro Motivo')) OR
         (v_status = '' AND p_patch->>'unattendedReason' = 'Outro motivo' AND btrim(coalesce(p_patch->>'unattendedNotes','')) = '') OR
         jsonb_typeof(p_patch->'unattendedProofUrls') IS DISTINCT FROM 'array' OR EXISTS (
           SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(p_patch->'unattendedProofUrls')='array' THEN p_patch->'unattendedProofUrls' ELSE '[]'::jsonb END) u(value)
           WHERE value ~* '^(file|content|blob|data):') OR
         jsonb_array_length(CASE WHEN jsonb_typeof(p_patch->'unattendedProofUrls')='array' THEN p_patch->'unattendedProofUrls' ELSE '[]'::jsonb END) > 5 OR
         (p_patch->>'unattendedReason' = 'Ninguém Atendeu no Local' AND jsonb_array_length(CASE WHEN jsonb_typeof(p_patch->'unattendedProofUrls')='array' THEN p_patch->'unattendedProofUrls' ELSE '[]'::jsonb END) = 0) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
      END IF;
      v_next := v_next || jsonb_build_object('deliveryStatus','unattended','unattendedAt',p_patch->'unattendedAt',
        'unattendedReason',p_patch->'unattendedReason','unattendedNotes',p_patch->'unattendedNotes',
        'unattendedProofUrl',p_patch->'unattendedProofUrl','unattendedProofUrls',p_patch->'unattendedProofUrls');
    WHEN 'DELIVERY_STEP_BACK' THEN
      IF NOT coalesce(((v_status = 'in_progress' AND p_patch->>'deliveryStatus' IS NULL) OR
              (v_status = 'arrived' AND p_patch->>'deliveryStatus' = 'in_progress') OR
              (v_status = 'in_service' AND p_patch->>'deliveryStatus' = 'arrived')),false) THEN
        RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED');
      END IF;
      IF v_status = 'in_progress' THEN
        IF coalesce(p_patch->>'deliveryPreparationStartedAt','') = '' THEN RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED'); END IF;
        v_next := v_next || jsonb_build_object('deliveryStatus',NULL,'deliveryPreparationStartedAt',p_patch->'deliveryPreparationStartedAt',
          'deliveryStartedAt',NULL,'deliveryArrivedAt',NULL,'deliveryServiceStartedAt',NULL);
      ELSIF v_status = 'arrived' THEN
        v_next := v_next || jsonb_build_object('deliveryStatus','in_progress','deliveryArrivedAt',NULL,'deliveryServiceStartedAt',NULL);
      ELSE
        v_next := v_next || jsonb_build_object('deliveryStatus','arrived','deliveryServiceStartedAt',NULL);
      END IF;
    WHEN 'DELIVERY_CANCEL' THEN
      IF v_status IN ('completed','unattended') THEN RETURN jsonb_build_object('success', false, 'reason', 'BUSINESS_RULE_REJECTED'); END IF;
      v_next := '{}'::jsonb;
    ELSE RETURN jsonb_build_object('success', false, 'reason', 'UNSUPPORTED_OPERATION');
  END CASE;
  PERFORM pg_catalog.set_config('morantehub.delivery_operation_write','1',true);
  INSERT INTO public.order_delivery_operations(order_id, appointment_id, revision, state, applied_events, updated_at)
    VALUES (p_order_id, p_operation_id, p_expected_revision + 1, v_next, v_events || to_jsonb(p_event_id), now())
    ON CONFLICT (order_id, appointment_id) DO UPDATE SET revision = excluded.revision,
      state = excluded.state, applied_events = excluded.applied_events, updated_at = excluded.updated_at;
  PERFORM pg_catalog.set_config('morantehub.delivery_operation_write','',true);

  -- Preserve the existing order-level physical circulation signals while at
  -- least one operation has reached the corresponding stage.
  SELECT coalesce(bool_or(nullif(state->>'deliveryStartedAt','') IS NOT NULL), false),
         coalesce(bool_or(nullif(state->>'deliveryArrivedAt','') IS NOT NULL), false),
         coalesce(bool_or(state->>'deliveryStatus' = 'completed'), false)
    INTO v_any_started,v_any_arrived,v_any_finished
    FROM public.order_delivery_operations WHERE order_id = p_order_id;
  IF p_event_type = 'DELIVERY_FINISH' THEN
    -- Close the order only after all assigned deliveries are complete, immediate
    -- pickups are marked as such, and every item quantity is allocated.
    SELECT jsonb_array_length(v_order_data #> '{shipping,scheduling,appointments}') > 0
      AND jsonb_array_length(CASE WHEN jsonb_typeof(v_order_data->'items') = 'array' THEN v_order_data->'items' ELSE '[]'::jsonb END) > 0
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_order_data #> '{shipping,scheduling,appointments}') a(value)
        LEFT JOIN public.order_delivery_operations d ON d.order_id=p_order_id AND d.appointment_id=a.value->>'id'
        WHERE NOT coalesce((
          (lower(coalesce(a.value->>'deliveryMethod',v_order_data#>>'{shipping,deliveryMethod}','delivery')) IN ('delivery','entrega')
            AND d.state->>'deliveryStatus' = 'completed') OR
          (lower(coalesce(a.value->>'deliveryMethod',v_order_data#>>'{shipping,deliveryMethod}','delivery')) IN ('pickup','retirada')
            AND a.value#>>'{scheduling,immediatePickup}' = 'true')),false)
      ) AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_order_data->'items') = 'array' THEN v_order_data->'items' ELSE '[]'::jsonb END) i(value)
        WHERE CASE WHEN coalesce(i.value->>'quantity','') ~ '^[0-9]+([.][0-9]+)?$' THEN
          (i.value->>'quantity')::numeric <= 0 OR (i.value->>'quantity')::numeric <> coalesce((
            SELECT sum(CASE WHEN coalesce(a.value->'itemQuantities'->>coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id',''), i.value->>'quantity','') ~ '^[0-9]+([.][0-9]+)?$'
              THEN coalesce(a.value->'itemQuantities'->>coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id',''), i.value->>'quantity')::numeric ELSE 0 END)
            FROM jsonb_array_elements(v_order_data #> '{shipping,scheduling,appointments}') a(value)
            WHERE coalesce(a.value->'itemIds','[]'::jsonb) ? coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id','') OR
              coalesce(a.value->'itemQuantities','{}'::jsonb) ? coalesce(nullif(i.value->>'orderItemId',''),i.value->>'id','')
          ),0) ELSE true END
      ) INTO v_all_finished;
    IF v_all_finished THEN v_order_data := v_order_data || jsonb_build_object('status','fulfilled'); END IF;
    UPDATE public.orders SET order_data = v_order_data,
      status = CASE WHEN v_all_finished THEN 'fulfilled' ELSE status END,
      delivery_status = CASE WHEN v_all_finished THEN 'completed' WHEN v_any_started THEN 'in_progress' ELSE NULL END,
      delivery_started_at = CASE WHEN v_any_started THEN coalesce(delivery_started_at,v_event_time) ELSE NULL END,
      delivery_arrived_at = CASE WHEN v_any_arrived THEN coalesce(delivery_arrived_at,v_event_time) ELSE NULL END,
      delivery_finished_at = CASE WHEN v_any_finished THEN coalesce(delivery_finished_at,v_event_time) ELSE NULL END
      WHERE id = p_order_id RETURNING * INTO v_order;
  ELSE
    UPDATE public.orders SET
      delivery_status = CASE WHEN v_any_started THEN 'in_progress' ELSE NULL END,
      delivery_started_at = CASE WHEN v_any_started THEN coalesce(delivery_started_at,v_event_time) ELSE NULL END,
      delivery_arrived_at = CASE WHEN v_any_arrived THEN coalesce(delivery_arrived_at,v_event_time) ELSE NULL END,
      delivery_finished_at = CASE WHEN v_any_finished THEN coalesce(delivery_finished_at,v_event_time) ELSE NULL END
      WHERE id = p_order_id RETURNING * INTO v_order;
  END IF;
  RETURN jsonb_build_object('success', true, 'server_version', v_order.version,
    'server_state', public.read_delivery_operation_order_state(p_order_id));
END;
$fn$;
REVOKE ALL ON FUNCTION public.apply_order_delivery_operation(text,text,text,text,integer,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_order_delivery_operation(text,text,text,text,integer,jsonb,jsonb,jsonb) TO authenticated, service_role;

-- Route optimization must patch the current full snapshot under a row lock;
-- a list summary must never replace the order or collapse its operations.
CREATE OR REPLACE FUNCTION public.set_order_operation_route_sequences(p_updates jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
  v_id text;
  v_entry jsonb;
  v_operation_id text;
  v_order public.orders%ROWTYPE;
  v_data jsonb;
  v_sequences jsonb;
BEGIN
  IF jsonb_typeof(p_updates) IS DISTINCT FROM 'array' OR
     jsonb_array_length(CASE WHEN jsonb_typeof(p_updates)='array' THEN p_updates ELSE '[]'::jsonb END) > 2000 OR
     EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_updates)='array' THEN p_updates ELSE '[]'::jsonb END) u(value)
       WHERE coalesce(u.value->>'orderId','')='' OR coalesce(u.value->>'sequence','') !~ '^[1-9][0-9]{0,5}$') OR
     (SELECT count(*) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_updates)='array' THEN p_updates ELSE '[]'::jsonb END)) <>
     (SELECT count(*) FROM (SELECT DISTINCT value->>'orderId',coalesce(value->>'operationId','')
       FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_updates)='array' THEN p_updates ELSE '[]'::jsonb END)) distinct_updates) THEN
    RAISE EXCEPTION 'Sequência de operações inválida.';
  END IF;
  FOR v_id IN SELECT DISTINCT value->>'orderId' FROM jsonb_array_elements(p_updates) ORDER BY 1 LOOP
    SELECT * INTO v_order FROM public.orders WHERE id=v_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Pedido indisponível ou sem permissão.'; END IF;
    v_data := coalesce(v_order.order_data,'{}'::jsonb);
    FOR v_entry IN SELECT value FROM jsonb_array_elements(p_updates) WHERE value->>'orderId'=v_id LOOP
      v_operation_id := nullif(v_entry->>'operationId','');
      IF v_operation_id IS NULL THEN
        IF jsonb_array_length(CASE WHEN jsonb_typeof(v_data#>'{shipping,scheduling,appointments}')='array'
           THEN v_data#>'{shipping,scheduling,appointments}' ELSE '[]'::jsonb END)>1 THEN
          RAISE EXCEPTION 'Selecione a operação para ordenar a rota.';
        END IF;
        v_data := v_data || jsonb_build_object('routeSequence',(v_entry->>'sequence')::integer);
      ELSE
        IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_data#>'{shipping,scheduling,appointments}')='array'
          THEN v_data#>'{shipping,scheduling,appointments}' ELSE '[]'::jsonb END) a(value)
          WHERE a.value->>'id'=v_operation_id AND lower(coalesce(a.value->>'deliveryMethod',v_data#>>'{shipping,deliveryMethod}','delivery')) IN ('delivery','entrega')) THEN
          RAISE EXCEPTION 'Operação de entrega não encontrada.';
        END IF;
        v_sequences := CASE WHEN jsonb_typeof(v_data->'routeSequencesByOperation')='object'
          THEN v_data->'routeSequencesByOperation' ELSE '{}'::jsonb END;
        v_data := jsonb_set(v_data,'{routeSequencesByOperation}',v_sequences || jsonb_build_object(v_operation_id,(v_entry->>'sequence')::integer),true);
      END IF;
    END LOOP;
    UPDATE public.orders SET order_data=v_data WHERE id=v_id;
  END LOOP;
  RETURN true;
END;
$fn$;
REVOKE ALL ON FUNCTION public.set_order_operation_route_sequences(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_order_operation_route_sequences(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.read_order_summaries(p_ids text[])
RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
  SELECT (to_jsonb(o)-'items'-'order_data') || jsonb_build_object(
    '__orderSummary',true,
    'order_payments',coalesce((SELECT jsonb_agg(jsonb_build_object('payment_index',p.payment_index,'payment_method',p.payment_method,
      'amount',p.amount,'fee',p.fee,'fee_type',p.fee_type,'status',p.status,'installments',p.installments,'paid_at',p.paid_at)
      ORDER BY p.payment_index) FROM public.order_payments p WHERE p.order_id=o.id),'[]'::jsonb),
    'order_data',(coalesce(o.order_data,'{}'::jsonb)-'items'-'shipping'-'fiscalContext'-'fiscalSnapshot'-'nfeXml'-'xml'-'deliveryOperations') || jsonb_build_object(
      '__orderSummary',true,'shipping',coalesce(o.order_data->'shipping','{}'::jsonb)-'routeGeoJSON') ||
      coalesce((SELECT jsonb_build_object('deliveryOperations',jsonb_object_agg(d.appointment_id,d.state || jsonb_build_object('revision',d.revision)))
        FROM public.order_delivery_operations d WHERE d.order_id=o.id HAVING count(*)>0),'{}'::jsonb),
    'items',coalesce((SELECT jsonb_agg(
      (coalesce(i.item_snapshot,'{}'::jsonb)-'fiscal'-'images'-'technicalSpecs'-'fiscalSnapshot') || jsonb_strip_nulls(jsonb_build_object(
        'id',i.id,'orderItemId',coalesce(nullif(i.item_snapshot->>'orderItemId',''), i.id::text),'productId',i.product_id,'variationId',i.variation_id,
        'code',i.code,'description',i.description,'quantity',i.quantity,'unitPrice',i.unit_price,
        'unitDiscount',i.unit_discount,'discountType',i.discount_type,'costPrice',i.cost_price,
        'condition',i.condition,'handlingType',i.handling_type,'observation',i.observation,
        'isTemporaryProduct',i.is_temporary_product,'returnedQuantity',i.returned_quantity,
        'returnedUnitPrice',i.returned_unit_price,'returnedTotalValue',i.returned_total_value,
        'originalUnitPrice',i.original_unit_price,'originalTotalValue',i.original_total_value
      )) ORDER BY i.item_index,i.id) FROM public.order_items i WHERE i.order_id=o.id),
      (SELECT jsonb_agg(j.value-'fiscal'-'images'-'technicalSpecs'-'fiscalSnapshot' ORDER BY j.ordinality)
        FROM jsonb_array_elements(CASE WHEN jsonb_typeof(o.items)='array' AND jsonb_array_length(o.items)>0 THEN o.items
          WHEN jsonb_typeof(o.order_data->'items')='array' THEN o.order_data->'items' ELSE '[]'::jsonb END) WITH ORDINALITY j),
      '[]'::jsonb)
  )
  FROM public.orders o WHERE o.id=ANY(p_ids)
  ORDER BY array_position(p_ids,o.id);
$$;
