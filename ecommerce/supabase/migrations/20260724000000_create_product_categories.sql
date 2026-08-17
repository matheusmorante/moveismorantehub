-- Create product_categories table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.product_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

-- Optional indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_product_id ON public.product_categories(product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_category_id ON public.product_categories(category_id);

-- Enable Row Level Security (RLS) if using Supabase policies
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Example RLS policies allowing authenticated users to select, insert, update, delete
CREATE POLICY "allow_select" ON public.product_categories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "allow_insert" ON public.product_categories FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "allow_update" ON public.product_categories FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "allow_delete" ON public.product_categories FOR DELETE USING (auth.role() = 'authenticated');
