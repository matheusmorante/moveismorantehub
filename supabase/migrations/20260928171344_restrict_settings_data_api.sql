-- Containment for the shared settings row: no anonymous Data API access.
-- Existing authenticated readers remain available; administrators retain writes
-- through the existing "Administrators manage settings" RLS policy.
begin;

drop policy if exists "Anyone can read settings" on public.settings;
drop policy if exists "Authenticated can read settings" on public.settings;
create policy "Authenticated can read settings"
  on public.settings for select to authenticated using (true);

revoke all on table public.settings from anon;
revoke all on table public.settings from authenticated;
grant select, insert, update on table public.settings to authenticated;

commit;
