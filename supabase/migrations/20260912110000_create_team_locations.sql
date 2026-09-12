-- Migration: Team Locations Tracking with Realtime & Disconnection State
-- Permite que todos os usuários da equipe visualizem a localização uns dos outros em tempo real
-- Quando o GPS é desligado ou fica sem sinal, o marcador permanece na última localização conhecida com sinal de '?' em vermelho

CREATE TABLE IF NOT EXISTS public.team_locations (
    user_id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    role TEXT DEFAULT 'montador_entregador',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    is_gps_active BOOLEAN NOT NULL DEFAULT true,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.team_locations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'team_locations' AND policyname = 'Allow anon read/write team_locations'
    ) THEN
        CREATE POLICY "Allow anon read/write team_locations" ON public.team_locations FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Habilitar Supabase Realtime para team_locations
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'team_locations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.team_locations;
    END IF;
END $$;

GRANT ALL ON public.team_locations TO anon, authenticated, service_role;
