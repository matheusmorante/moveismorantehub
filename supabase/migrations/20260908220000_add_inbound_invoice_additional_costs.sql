ALTER TABLE public.inbound_invoices
    ADD COLUMN IF NOT EXISTS additional_freight JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS additional_costs JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS additional_costs_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS additional_cost_allocations JSONB NOT NULL DEFAULT '[]'::jsonb;