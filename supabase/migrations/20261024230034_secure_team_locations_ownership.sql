-- Restrict team location access to authenticated owners and active delivery rows.
-- Keep team visibility for active deliveries while preventing cross-user writes.
-- Rollback: do not restore the former public policy or open grants. Any app rollback must
-- retain owner-scoped access and be delivered as a separately reviewed forward migration.
ALTER TABLE public.team_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read/write team_locations"
  ON public.team_locations;
DROP POLICY IF EXISTS "team_locations_select_self_or_active"
  ON public.team_locations;
DROP POLICY IF EXISTS "team_locations_insert_self"
  ON public.team_locations;
DROP POLICY IF EXISTS "team_locations_update_self"
  ON public.team_locations;

REVOKE ALL PRIVILEGES ON TABLE public.team_locations FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES (
  user_id,
  user_name,
  role,
  latitude,
  longitude,
  is_gps_active,
  last_seen,
  created_at,
  updated_at,
  is_delivering,
  active_order_id,
  active_order_code
) ON TABLE public.team_locations FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.team_locations TO authenticated;

CREATE POLICY "team_locations_select_self_or_active"
  ON public.team_locations
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      user_id = ((SELECT auth.uid())::text)
      OR is_delivering = true
    )
  );

CREATE POLICY "team_locations_insert_self"
  ON public.team_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = ((SELECT auth.uid())::text)
  );

CREATE POLICY "team_locations_update_self"
  ON public.team_locations
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = ((SELECT auth.uid())::text)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND user_id = ((SELECT auth.uid())::text)
  );
