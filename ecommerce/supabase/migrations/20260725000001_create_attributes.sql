-- Create attributes and attribute_values tables for dynamic product variation configurations
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;

-- Create policies for attributes
CREATE POLICY "allow_select_attr" ON public.attributes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "allow_insert_attr" ON public.attributes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "allow_update_attr" ON public.attributes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "allow_delete_attr" ON public.attributes FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for attribute_values
CREATE POLICY "allow_select_val" ON public.attribute_values FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "allow_insert_val" ON public.attribute_values FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "allow_update_val" ON public.attribute_values FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "allow_delete_val" ON public.attribute_values FOR DELETE USING (auth.role() = 'authenticated');
