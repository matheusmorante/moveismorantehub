create or replace function public.current_user_has_password()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users
    where id = (select auth.uid())
      and coalesce(encrypted_password, '') <> ''
  );
$$;

revoke all on function public.current_user_has_password() from public;
revoke all on function public.current_user_has_password() from anon;
grant execute on function public.current_user_has_password() to authenticated;

comment on function public.current_user_has_password() is
  'Returns whether the authenticated user has a Supabase Auth password credential.';
