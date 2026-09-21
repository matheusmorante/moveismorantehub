-- Adiciona novas colunas à tabela attributes existente
ALTER TABLE public.attributes
ADD COLUMN IF NOT EXISTS data_type varchar DEFAULT 'list',
ADD COLUMN IF NOT EXISTS unit varchar;

-- Garante que o tipo de dado seja um dos esperados
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'attributes_data_type_check'
          AND conrelid = 'public.attributes'::regclass
    ) THEN
        ALTER TABLE public.attributes
        ADD CONSTRAINT attributes_data_type_check
        CHECK (data_type IN ('list', 'integer', 'decimal', 'text', 'boolean', 'measure'));
    END IF;
END $$;

-- Cria a tabela associativa category_attributes
CREATE TABLE IF NOT EXISTS public.category_attributes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
    is_required boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(category_id, attribute_id)
);

CREATE INDEX IF NOT EXISTS idx_category_attributes_attribute_id
ON public.category_attributes(attribute_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.category_attributes TO authenticated;

-- Permissões RLS
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_select" ON public.category_attributes;
DROP POLICY IF EXISTS "allow_insert" ON public.category_attributes;
DROP POLICY IF EXISTS "allow_update" ON public.category_attributes;
DROP POLICY IF EXISTS "allow_delete" ON public.category_attributes;

CREATE POLICY "allow_select" ON public.category_attributes
FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_insert" ON public.category_attributes
FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_update" ON public.category_attributes
FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_delete" ON public.category_attributes
FOR DELETE TO authenticated USING (true);
