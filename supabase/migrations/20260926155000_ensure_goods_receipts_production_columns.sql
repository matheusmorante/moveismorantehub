-- Completa a estrutura já existente de recebimentos sem pressupor o tipo da PK de pessoas.
-- Em produção people.id é text; em instalações locais pode ser uuid.
DO $migration$
DECLARE
  v_supplier_id_type text;
BEGIN
  SELECT format_type(attribute.atttypid, attribute.atttypmod)
    INTO v_supplier_id_type
    FROM pg_attribute AS attribute
   WHERE attribute.attrelid = 'public.people'::regclass
     AND attribute.attname = 'id'
     AND NOT attribute.attisdropped;
  IF v_supplier_id_type IS NULL THEN
    RAISE EXCEPTION 'Não foi possível determinar o tipo de people.id';
  END IF;
  EXECUTE format(
    'ALTER TABLE public.goods_receipts ADD COLUMN IF NOT EXISTS supplier_id %s REFERENCES public.people(id) ON DELETE SET NULL',
    v_supplier_id_type
  );
END;
$migration$;

ALTER TABLE public.goods_receipts
  ADD COLUMN IF NOT EXISTS receipt_index integer,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'received',
  ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ipi_percent numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_percent numeric(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS non_fiscal_discount_mode text,
  ADD COLUMN IF NOT EXISTS non_fiscal_discount_value numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS non_fiscal_freight_mode text,
  ADD COLUMN IF NOT EXISTS non_fiscal_freight_value numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS non_fiscal_other_expenses_mode text,
  ADD COLUMN IF NOT EXISTS non_fiscal_other_expenses_value numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiscal_ipi numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiscal_freight numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiscal_discount numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fiscal_other_expenses numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS fiscal_key text,
  ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT '{}';
