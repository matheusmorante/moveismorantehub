-- The CSC secret is not part of the shared settings contract.
begin;

create or replace function public.strip_retired_csc_token()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.data := coalesce(new.data, '{}'::jsonb) - 'cscToken';
  return new;
end;
$$;

revoke all on function public.strip_retired_csc_token() from public, anon, authenticated;
drop trigger if exists strip_retired_csc_token_on_settings on public.settings;
create trigger strip_retired_csc_token_on_settings
before insert or update on public.settings
for each row execute function public.strip_retired_csc_token();

update public.settings set data = data - 'cscToken'
where id = 'app' and data ? 'cscToken';

commit;
