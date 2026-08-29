-- Adicionar coluna sequencial numérica para compras (purchases)
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS purchase_number SERIAL;

-- Atualizar compras antigas ordenadas por data de criação se purchase_number estiver vazio
DO $$
DECLARE
    r RECORD;
    idx INTEGER := 1;
BEGIN
    FOR r IN SELECT id FROM public.purchases ORDER BY created_at ASC LOOP
        UPDATE public.purchases SET purchase_number = idx WHERE id = r.id AND (purchase_number IS NULL OR purchase_number = 0);
        idx := idx + 1;
    END LOOP;
END $$;
