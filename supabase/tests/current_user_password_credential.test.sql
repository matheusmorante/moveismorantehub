begin;

create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, pg_temp;

select plan(4);

select ok(
  not has_function_privilege('anon', 'public.current_user_has_password()', 'execute'),
  'anonymous users cannot inspect password credential state'
);
select ok(
  has_function_privilege('authenticated', 'public.current_user_has_password()', 'execute'),
  'authenticated users can inspect their own password credential state'
);

insert into auth.users (id, email, encrypted_password, aud, role, created_at, updated_at)
values (
  'd51012b5-bdad-4808-a768-57477abdddb1',
  'auth-password-empty@test.invalid',
  '',
  'authenticated',
  'authenticated',
  now(),
  now()
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'd51012b5-bdad-4808-a768-57477abdddb1', true);
select is(
  public.current_user_has_password(),
  false,
  'OAuth-only user with no encrypted password is reported as not configured'
);
reset role;

update auth.users
set encrypted_password = '$2a$06$test-only-password-hash-placeholder'
where id = 'd51012b5-bdad-4808-a768-57477abdddb1';

set local role authenticated;
select is(
  public.current_user_has_password(),
  true,
  'user with a Supabase Auth password hash is reported as configured'
);
reset role;

select * from finish();
rollback;
