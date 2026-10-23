-- Keep address numbers numeric and move any nonnumeric suffix into the
-- beginning of the complement. Re-running this migration is a no-op.

WITH candidates AS (
  SELECT
    p.id,
    p.full_address,
    btrim(p.full_address->>'number') AS original_number,
    btrim(coalesce(p.full_address->>'complement', '')) AS original_complement
  FROM public.people AS p
  WHERE p.person_type = 'customers'
    AND jsonb_typeof(p.full_address) = 'object'
    AND nullif(btrim(p.full_address->>'number'), '') IS NOT NULL
    AND btrim(p.full_address->>'number') !~ '^[0-9]+$'
), normalized AS (
  SELECT
    id,
    jsonb_set(
      jsonb_set(
        full_address,
        '{number}',
        to_jsonb(coalesce(substring(original_number FROM '^([0-9]+)'), '')),
        true
      ),
      '{complement}',
      to_jsonb(concat_ws(
        ', ',
        nullif(btrim(CASE
          WHEN original_number ~ '^[0-9]+'
            THEN substring(original_number FROM '^[0-9]+(.*)$')
          ELSE original_number
        END), ''),
        nullif(original_complement, '')
      )),
      true
    ) AS full_address
  FROM candidates
)
UPDATE public.people AS p
SET full_address = normalized.full_address,
    updated_at = clock_timestamp()
FROM normalized
WHERE p.id = normalized.id;

WITH candidates AS (
  SELECT
    o.id,
    o.order_data,
    o.order_data #> '{shipping,deliveryAddress}' AS delivery_address,
    o.order_data #> '{customerData,fullAddress}' AS customer_address
  FROM public.orders AS o
  WHERE o.order_type = 'sale'
    AND jsonb_typeof(o.order_data) = 'object'
    AND (
      (
        jsonb_typeof(o.order_data #> '{shipping,deliveryAddress}') = 'object'
        AND nullif(btrim(o.order_data #>> '{shipping,deliveryAddress,number}'), '') IS NOT NULL
        AND btrim(o.order_data #>> '{shipping,deliveryAddress,number}') !~ '^[0-9]+$'
      )
      OR
      (
        jsonb_typeof(o.order_data #> '{customerData,fullAddress}') = 'object'
        AND nullif(btrim(o.order_data #>> '{customerData,fullAddress,number}'), '') IS NOT NULL
        AND btrim(o.order_data #>> '{customerData,fullAddress,number}') !~ '^[0-9]+$'
      )
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.nfe_documents AS d WHERE d.order_id = o.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.nfe_fiscal_snapshots AS s WHERE s.order_id = o.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.nfe_outbound_attempts AS a WHERE a.order_id = o.id
    )
), normalized AS (
  SELECT
    candidates.id,
    candidates.order_data,
    delivery.address AS delivery_address,
    customer.address AS customer_address
  FROM candidates
  LEFT JOIN LATERAL (
    SELECT jsonb_set(
      jsonb_set(
        candidates.delivery_address,
        '{number}',
        to_jsonb(coalesce(substring(raw.number FROM '^([0-9]+)'), '')),
        true
      ),
      '{complement}',
      to_jsonb(concat_ws(
        ', ',
        nullif(btrim(CASE
          WHEN raw.number ~ '^[0-9]+'
            THEN substring(raw.number FROM '^[0-9]+(.*)$')
          ELSE raw.number
        END), ''),
        nullif(raw.complement, '')
      )),
      true
    ) AS address
    FROM (
      SELECT
        btrim(candidates.delivery_address->>'number') AS number,
        btrim(coalesce(candidates.delivery_address->>'complement', '')) AS complement
    ) AS raw
    WHERE nullif(raw.number, '') IS NOT NULL
      AND raw.number !~ '^[0-9]+$'
  ) AS delivery ON true
  LEFT JOIN LATERAL (
    SELECT jsonb_set(
      jsonb_set(
        candidates.customer_address,
        '{number}',
        to_jsonb(coalesce(substring(raw.number FROM '^([0-9]+)'), '')),
        true
      ),
      '{complement}',
      to_jsonb(concat_ws(
        ', ',
        nullif(btrim(CASE
          WHEN raw.number ~ '^[0-9]+'
            THEN substring(raw.number FROM '^[0-9]+(.*)$')
          ELSE raw.number
        END), ''),
        nullif(raw.complement, '')
      )),
      true
    ) AS address
    FROM (
      SELECT
        btrim(candidates.customer_address->>'number') AS number,
        btrim(coalesce(candidates.customer_address->>'complement', '')) AS complement
    ) AS raw
    WHERE nullif(raw.number, '') IS NOT NULL
      AND raw.number !~ '^[0-9]+$'
  ) AS customer ON true
), updates AS (
  SELECT
    id,
    CASE
      WHEN delivery_address IS NOT NULL THEN jsonb_set(
        CASE
          WHEN customer_address IS NOT NULL THEN jsonb_set(
            order_data,
            '{customerData,fullAddress}',
            customer_address,
            true
          )
          ELSE order_data
        END,
        '{shipping,deliveryAddress}',
        delivery_address,
        true
      )
      WHEN customer_address IS NOT NULL THEN jsonb_set(
        order_data,
        '{customerData,fullAddress}',
        customer_address,
        true
      )
      ELSE order_data
    END AS order_data
  FROM normalized
)
UPDATE public.orders AS o
SET order_data = updates.order_data,
    updated_at = clock_timestamp()
FROM updates
WHERE o.id = updates.id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.people AS p
    WHERE p.person_type = 'customers'
      AND jsonb_typeof(p.full_address) = 'object'
      AND nullif(btrim(p.full_address->>'number'), '') IS NOT NULL
      AND btrim(p.full_address->>'number') !~ '^[0-9]+$'
  ) THEN
    RAISE EXCEPTION 'Customer address numbers remain nonnumeric after normalization';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.orders AS o
    WHERE o.order_type = 'sale'
      AND jsonb_typeof(o.order_data) = 'object'
      AND (
        (
          jsonb_typeof(o.order_data #> '{shipping,deliveryAddress}') = 'object'
          AND nullif(btrim(o.order_data #>> '{shipping,deliveryAddress,number}'), '') IS NOT NULL
          AND btrim(o.order_data #>> '{shipping,deliveryAddress,number}') !~ '^[0-9]+$'
        )
        OR
        (
          jsonb_typeof(o.order_data #> '{customerData,fullAddress}') = 'object'
          AND nullif(btrim(o.order_data #>> '{customerData,fullAddress,number}'), '') IS NOT NULL
          AND btrim(o.order_data #>> '{customerData,fullAddress,number}') !~ '^[0-9]+$'
        )
      )
      AND NOT EXISTS (SELECT 1 FROM public.nfe_documents AS d WHERE d.order_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.nfe_fiscal_snapshots AS s WHERE s.order_id = o.id)
      AND NOT EXISTS (SELECT 1 FROM public.nfe_outbound_attempts AS a WHERE a.order_id = o.id)
  ) THEN
    RAISE EXCEPTION 'Nonfiscal sales order address numbers remain nonnumeric after normalization';
  END IF;
END $$;
