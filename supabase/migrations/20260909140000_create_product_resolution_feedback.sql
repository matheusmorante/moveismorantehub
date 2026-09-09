-- Memória auditável de decisões humanas sobre a resolução de itens de NF.
-- A IA consulta estes registros como contexto; ela nunca cria regras sozinha.
CREATE TABLE IF NOT EXISTS public.product_resolution_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT NOT NULL,
  supplier_product_code TEXT,
  supplier_code_family TEXT,
  nf_item_description TEXT NOT NULL,
  normalized_parent_name TEXT,
  detected_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  unit_cost NUMERIC,
  ai_suggestion JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_decision TEXT NOT NULL CHECK (user_decision IN ('accepted', 'rejected', 'corrected')),
  final_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  final_variation_id UUID REFERENCES public.product_variations(id) ON DELETE SET NULL,
  relation_type TEXT NOT NULL CHECK (relation_type IN (
    'existing_variation', 'new_variation', 'same_nf_product_family',
    'new_product', 'different_parent_products'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_resolution_feedback_exact
  ON public.product_resolution_feedback (supplier_id, supplier_product_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_resolution_feedback_parent
  ON public.product_resolution_feedback (supplier_id, normalized_parent_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_resolution_feedback_family
  ON public.product_resolution_feedback (supplier_id, supplier_code_family, created_at DESC)
  WHERE supplier_code_family IS NOT NULL;

-- Padrões só podem ser ativados por uma decisão explícita do backend após
-- confirmações consistentes. O histórico original permanece preservado.
CREATE TABLE IF NOT EXISTS public.supplier_product_resolution_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id TEXT NOT NULL,
  supplier_code_family TEXT NOT NULL,
  normalized_parent_name TEXT NOT NULL,
  confirmed_parent_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  variation_discriminator TEXT,
  confirmation_count INTEGER NOT NULL DEFAULT 0 CHECK (confirmation_count >= 0),
  contradiction_count INTEGER NOT NULL DEFAULT 0 CHECK (contradiction_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT supplier_product_resolution_patterns_unique
    UNIQUE (supplier_id, supplier_code_family, normalized_parent_name)
);

CREATE INDEX IF NOT EXISTS idx_supplier_product_resolution_patterns_lookup
  ON public.supplier_product_resolution_patterns (supplier_id, supplier_code_family)
  WHERE is_active = true;

ALTER TABLE public.product_resolution_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_product_resolution_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_authenticated_product_resolution_feedback"
  ON public.product_resolution_feedback FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_authenticated_supplier_resolution_patterns"
  ON public.supplier_product_resolution_patterns FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
