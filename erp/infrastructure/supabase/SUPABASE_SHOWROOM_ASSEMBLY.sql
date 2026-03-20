-- Migration: Setup Showroom Assembly table
-- Created at: 2026-03-20

CREATE TABLE IF NOT EXISTS public.showroom_assemblies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    item TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.showroom_assemblies ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all (since it's an internal tool, keeping it simple for now)
-- You can refine this with auth.uid() if needed
CREATE POLICY "Allow all on showroom_assemblies" ON public.showroom_assemblies
    FOR ALL
    USING (true)
    WITH CHECK (true);
