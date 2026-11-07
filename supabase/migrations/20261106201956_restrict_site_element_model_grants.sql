BEGIN;

-- Supabase default table grants include capabilities that bypass CRUD/RLS.
-- This library only needs normal row-level CRUD for authenticated operators.
REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.site_element_models FROM authenticated;

COMMIT;
