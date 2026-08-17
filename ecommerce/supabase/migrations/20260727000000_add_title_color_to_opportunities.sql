-- Add title_color column to opportunities table
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS title_color text;
