-- Migration: Create attributes, attribute_values, and product_variations tables in public schema

CREATE TABLE IF NOT EXISTS public.attributes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name varchar NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.attribute_values (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  attribute_id uuid NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  value varchar NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(attribute_id, value)
);

CREATE TABLE IF NOT EXISTS public.product_variations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  sku varchar UNIQUE,
  price numeric,
  stock integer DEFAULT 0,
  image_url text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  promo_price numeric,
  description text,
  width varchar,
  depth varchar,
  height varchar,
  use_parent_price boolean DEFAULT true,
  use_parent_promo_price boolean DEFAULT true,
  use_parent_dimensions boolean DEFAULT true,
  use_parent_description boolean DEFAULT true
);

-- Optional index for performance
CREATE INDEX IF NOT EXISTS idx_product_variations_product_id ON public.product_variations(product_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variations ENABLE ROW LEVEL SECURITY;

-- Policies for attributes
CREATE POLICY "allow_select_attr" ON public.attributes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "allow_insert_attr" ON public.attributes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "allow_update_attr" ON public.attributes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "allow_delete_attr" ON public.attributes FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for attribute_values
CREATE POLICY "allow_select_val" ON public.attribute_values FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "allow_insert_val" ON public.attribute_values FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "allow_update_val" ON public.attribute_values FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "allow_delete_val" ON public.attribute_values FOR DELETE USING (auth.role() = 'authenticated');

-- Policies for product_variations
CREATE POLICY "allow_select" ON public.product_variations FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "allow_insert" ON public.product_variations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "allow_update" ON public.product_variations FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "allow_delete" ON public.product_variations FOR DELETE USING (auth.role() = 'authenticated');
