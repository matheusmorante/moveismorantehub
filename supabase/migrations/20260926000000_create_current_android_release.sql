create table if not exists public.app_release_current (
  platform text primary key check (platform = 'android'),
  version text not null check (length(trim(version)) > 0),
  build_number integer not null check (build_number > 0),
  min_supported_build integer not null check (
    min_supported_build > 0 and min_supported_build <= build_number
  ),
  storage_path text not null check (storage_path = 'android/latest/morantehub.apk'),
  file_size bigint not null check (file_size > 0),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  is_mandatory boolean not null default false,
  release_notes text,
  updated_at timestamptz not null default now()
);

alter table public.app_release_current enable row level security;
grant select on public.app_release_current to anon, authenticated;

create policy "Public can read the current Android release"
  on public.app_release_current
  for select
  to anon, authenticated
  using (platform = 'android');

create or replace function public.set_android_current_release(
  p_version text,
  p_build_number integer,
  p_min_supported_build integer,
  p_file_size bigint,
  p_sha256 text,
  p_is_mandatory boolean,
  p_release_notes text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only the release publisher can change Android release metadata';
  end if;

  insert into public.app_release_current (
    platform, version, build_number, min_supported_build, storage_path,
    file_size, sha256, is_mandatory, release_notes, updated_at
  ) values (
    'android', p_version, p_build_number, p_min_supported_build, 'android/latest/morantehub.apk',
    p_file_size, lower(p_sha256), p_is_mandatory, p_release_notes, now()
  )
  on conflict (platform) do update set
    version = excluded.version,
    build_number = excluded.build_number,
    min_supported_build = excluded.min_supported_build,
    storage_path = excluded.storage_path,
    file_size = excluded.file_size,
    sha256 = excluded.sha256,
    is_mandatory = excluded.is_mandatory,
    release_notes = excluded.release_notes,
    updated_at = excluded.updated_at;

  update public.settings
  set data = jsonb_set(
    coalesce(data, '{}'::jsonb),
    '{mobileSettings}',
    coalesce(data->'mobileSettings', '{}'::jsonb) || jsonb_build_object(
      'requiredAndroidBuild', p_min_supported_build,
      'minimumAndroidBuild', p_min_supported_build,
      'androidUpdateUrl', 'https://morantehub.vercel.app/mobile-app'
    ),
    true
  )
  where id = 'app';

  if not found then
    raise exception 'The existing mobile settings row was not found';
  end if;
end;
$$;

revoke all on function public.set_android_current_release(text, integer, integer, bigint, text, boolean, text) from public, anon, authenticated;
grant execute on function public.set_android_current_release(text, integer, integer, bigint, text, boolean, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'releases',
  'releases',
  false,
  209715200,
  array['application/vnd.android.package-archive']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
