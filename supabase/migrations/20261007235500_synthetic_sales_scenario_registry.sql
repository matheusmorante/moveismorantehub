BEGIN;

-- Registro de propriedade e idempotência das fixtures. Os IDs comerciais são
-- gerados separadamente de scenario_key e não recebem prefixos de teste.
CREATE TABLE IF NOT EXISTS public.synthetic_sales_scenarios (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  scenario_key text NOT NULL,
  scenario_version smallint NOT NULL DEFAULT 1,
  payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'failed', 'complete')),
  phase text NOT NULL DEFAULT 'reserved'
    CHECK (phase IN ('reserved', 'customer', 'product', 'seller', 'order', 'audit', 'complete')),
  customer_id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  customer_state text NOT NULL DEFAULT 'pending'
    CHECK (customer_state IN ('pending', 'created', 'audited')),
  product_id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  product_state text NOT NULL DEFAULT 'pending'
    CHECK (product_state IN ('pending', 'created', 'audited')),
  variation_id uuid NOT NULL DEFAULT pg_catalog.gen_random_uuid(),
  seller_id text,
  order_id text NOT NULL DEFAULT pg_catalog.gen_random_uuid()::text,
  order_state text NOT NULL DEFAULT 'pending'
    CHECK (order_state IN ('pending', 'created', 'audited')),
  lease_token uuid,
  lease_until timestamptz,
  last_error_code text,
  audit_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT synthetic_sales_scenarios_key_format
    CHECK (scenario_key ~ '^[A-Z0-9_]{3,100}$'),
  CONSTRAINT synthetic_sales_scenarios_hash_format
    CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT synthetic_sales_scenarios_version_positive
    CHECK (scenario_version > 0),
  CONSTRAINT synthetic_sales_scenarios_key_version_unique
    UNIQUE (scenario_key, scenario_version),
  CONSTRAINT synthetic_sales_scenarios_customer_unique UNIQUE (customer_id),
  CONSTRAINT synthetic_sales_scenarios_product_unique UNIQUE (product_id),
  CONSTRAINT synthetic_sales_scenarios_variation_unique UNIQUE (variation_id),
  CONSTRAINT synthetic_sales_scenarios_order_unique UNIQUE (order_id)
);

ALTER TABLE public.synthetic_sales_scenarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.synthetic_sales_scenarios FROM PUBLIC, anon, service_role;
GRANT SELECT, INSERT, UPDATE ON public.synthetic_sales_scenarios TO authenticated;

DROP POLICY IF EXISTS synthetic_sales_scenarios_admin_select ON public.synthetic_sales_scenarios;
CREATE POLICY synthetic_sales_scenarios_admin_select
  ON public.synthetic_sales_scenarios FOR SELECT TO authenticated
  USING (public.is_administrator());
DROP POLICY IF EXISTS synthetic_sales_scenarios_admin_insert ON public.synthetic_sales_scenarios;
CREATE POLICY synthetic_sales_scenarios_admin_insert
  ON public.synthetic_sales_scenarios FOR INSERT TO authenticated
  WITH CHECK (public.is_administrator());
DROP POLICY IF EXISTS synthetic_sales_scenarios_admin_update ON public.synthetic_sales_scenarios;
CREATE POLICY synthetic_sales_scenarios_admin_update
  ON public.synthetic_sales_scenarios FOR UPDATE TO authenticated
  USING (public.is_administrator())
  WITH CHECK (public.is_administrator());

CREATE OR REPLACE FUNCTION public.guard_synthetic_sales_scenario_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.scenario_key IS DISTINCT FROM OLD.scenario_key OR
    NEW.scenario_version IS DISTINCT FROM OLD.scenario_version OR
    NEW.payload_hash IS DISTINCT FROM OLD.payload_hash OR
    NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
    NEW.product_id IS DISTINCT FROM OLD.product_id OR
    NEW.variation_id IS DISTINCT FROM OLD.variation_id OR
    NEW.order_id IS DISTINCT FROM OLD.order_id OR
    NEW.created_by IS DISTINCT FROM OLD.created_by
  ) THEN
    RAISE EXCEPTION 'A identidade de uma fixture sintética é imutável'
      USING ERRCODE = '22023';
  END IF;
  NEW.updated_at := pg_catalog.now();
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.guard_synthetic_sales_scenario_identity()
  FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS guard_synthetic_sales_scenario_identity
  ON public.synthetic_sales_scenarios;
CREATE TRIGGER guard_synthetic_sales_scenario_identity
  BEFORE UPDATE ON public.synthetic_sales_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.guard_synthetic_sales_scenario_identity();

CREATE OR REPLACE FUNCTION public.claim_synthetic_sales_scenario(
  p_scenario_key text,
  p_scenario_version smallint,
  p_payload_hash text,
  p_lease_token uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_run public.synthetic_sales_scenarios;
  v_claimed boolean := false;
BEGIN
  IF NOT public.is_administrator() THEN
    RAISE EXCEPTION 'Somente administradores podem criar fixtures sintéticas'
      USING ERRCODE = '42501';
  END IF;
  IF p_scenario_key IS NULL OR p_scenario_key !~ '^[A-Z0-9_]{3,100}$'
     OR p_scenario_version IS NULL OR p_scenario_version < 1
     OR p_payload_hash IS NULL OR p_payload_hash !~ '^[0-9a-f]{64}$'
     OR p_lease_token IS NULL THEN
    RAISE EXCEPTION 'Identificação ou hash da fixture inválido'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.synthetic_sales_scenarios (
    scenario_key, scenario_version, payload_hash, status, lease_token, lease_until
  ) VALUES (
    p_scenario_key, p_scenario_version, p_payload_hash, 'pending',
    p_lease_token, pg_catalog.now() + interval '15 minutes'
  ) ON CONFLICT (scenario_key, scenario_version) DO NOTHING;

  SELECT * INTO v_run
    FROM public.synthetic_sales_scenarios
   WHERE scenario_key = p_scenario_key
     AND scenario_version = p_scenario_version
   FOR UPDATE;

  IF v_run.payload_hash IS DISTINCT FROM p_payload_hash THEN
    RAISE EXCEPTION 'O scenarioKey já foi reservado para outro conteúdo'
      USING ERRCODE = '23505';
  END IF;

  IF v_run.status = 'complete' THEN
    v_claimed := false;
  ELSIF v_run.lease_until > pg_catalog.now()
        AND v_run.lease_token IS DISTINCT FROM p_lease_token THEN
    v_claimed := false;
  ELSE
    UPDATE public.synthetic_sales_scenarios
       SET status = 'in_progress',
           lease_token = p_lease_token,
           lease_until = pg_catalog.now() + interval '15 minutes',
           last_error_code = NULL
     WHERE id = v_run.id
     RETURNING * INTO v_run;
    v_claimed := true;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_run.id,
    'scenarioKey', v_run.scenario_key,
    'scenarioVersion', v_run.scenario_version,
    'payloadHash', v_run.payload_hash,
    'status', v_run.status,
    'phase', v_run.phase,
    'customerId', v_run.customer_id,
    'customerState', v_run.customer_state,
    'productId', v_run.product_id,
    'productState', v_run.product_state,
    'variationId', v_run.variation_id,
    'sellerId', v_run.seller_id,
    'orderId', v_run.order_id,
    'orderState', v_run.order_state,
    'leaseToken', v_run.lease_token,
    'claimed', v_claimed,
    'auditSummary', v_run.audit_summary
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_synthetic_sales_scenario(text, smallint, text, uuid)
  FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.claim_synthetic_sales_scenario(text, smallint, text, uuid)
  TO authenticated;

COMMIT;
