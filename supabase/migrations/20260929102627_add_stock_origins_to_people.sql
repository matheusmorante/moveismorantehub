ALTER TABLE public.people ADD COLUMN IF NOT EXISTS stock_origins text[] DEFAULT '{normal}'::text[];
UPDATE public.people SET stock_origins = '{normal}'::text[] WHERE stock_origins IS NULL;
UPDATE public.people SET stock_origins = '{salvados}'::text[] WHERE (full_name ILIKE '%multilojas salvados%' OR full_name ILIKE '%multiloja salvados%') AND type = 'suppliers';

