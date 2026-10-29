CREATE TABLE public.supabase_mass_load_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metric JSONB,
  CONSTRAINT supabase_mass_load_history_metric_object
    CHECK (metric IS NULL OR jsonb_typeof(metric) = 'object')
);

ALTER TABLE public.supabase_mass_load_history ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.supabase_mass_load_history FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.supabase_mass_load_history TO authenticated;

CREATE POLICY "Administradores consultam o histórico de cargas massivas"
  ON public.supabase_mass_load_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Usuários registram seus avisos de carga massiva"
  ON public.supabase_mass_load_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = (SELECT auth.uid())
  );

CREATE INDEX supabase_mass_load_history_occurred_at_idx
  ON public.supabase_mass_load_history (occurred_at DESC);

CREATE INDEX supabase_mass_load_history_user_id_idx
  ON public.supabase_mass_load_history (user_id);
