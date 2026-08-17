-- Remove políticas restritas de auth em attributes e attribute_values
DROP POLICY IF EXISTS "allow_select_attr" ON public.attributes;
DROP POLICY IF EXISTS "allow_insert_attr" ON public.attributes;
DROP POLICY IF EXISTS "allow_update_attr" ON public.attributes;
DROP POLICY IF EXISTS "allow_delete_attr" ON public.attributes;

DROP POLICY IF EXISTS "allow_select_val" ON public.attribute_values;
DROP POLICY IF EXISTS "allow_insert_val" ON public.attribute_values;
DROP POLICY IF EXISTS "allow_update_val" ON public.attribute_values;
DROP POLICY IF EXISTS "allow_delete_val" ON public.attribute_values;

-- Permite acesso total público em attributes e attribute_values
CREATE POLICY "allow_public_all_attr" ON public.attributes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_public_all_val" ON public.attribute_values FOR ALL USING (true) WITH CHECK (true);
