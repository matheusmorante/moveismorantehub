-- Keep the invoker permissions, but do not return profile data to a
-- service-role JWT that inherits the authenticated function grant.
CREATE OR REPLACE FUNCTION public.search_delivery_staff(
  p_search text,
  p_excluded_profile_ids uuid[] DEFAULT ARRAY[]::uuid[],
  p_excluded_names text[] DEFAULT ARRAY[]::text[]
)
RETURNS TABLE (
  id uuid,
  full_name text,
  role text,
  email text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  WITH allowed_roles(role_name) AS (
    VALUES
      ('administrator'::text),
      ('manager'::text),
      ('stockist'::text),
      ('seller'::text),
      ('deliverer'::text),
      ('administrador'::text),
      ('gestor'::text),
      ('estoquista'::text),
      ('vendedor'::text),
      ('entregador'::text)
  ),
  query_words AS (
    SELECT word.value
    FROM pg_catalog.regexp_split_to_table(
      public.immutable_unaccent(pg_catalog.lower(pg_catalog.btrim(p_search))),
      '[[:space:]]+'
    ) AS word(value)
    WHERE word.value <> ''
  ),
  eligible_profiles AS (
    SELECT
      profile.id,
      profile.full_name,
      profile.email,
      granted.role_name AS role
    FROM public.profiles AS profile
    CROSS JOIN LATERAL (
      SELECT pg_catalog.lower(pg_catalog.btrim(candidate.role_value)) AS role_name
      FROM pg_catalog.unnest(
        COALESCE(profile.roles, ARRAY[]::text[]) || ARRAY[profile.role]
      ) WITH ORDINALITY AS candidate(role_value, role_position)
      WHERE pg_catalog.lower(pg_catalog.btrim(candidate.role_value)) IN (
        SELECT allowed_roles.role_name FROM allowed_roles
      )
      ORDER BY candidate.role_position
      LIMIT 1
    ) AS granted
    WHERE auth.uid() IS NOT NULL
      AND auth.jwt() ->> 'role' = 'authenticated'
      AND profile.full_name IS NOT NULL
      AND pg_catalog.btrim(profile.full_name) <> ''
  ),
  normalized_profiles AS (
    SELECT
      eligible.id,
      eligible.full_name,
      eligible.email,
      eligible.role,
      public.immutable_unaccent(pg_catalog.lower(
        pg_catalog.concat_ws(' ', eligible.full_name, eligible.role)
      )) AS search_text,
      pg_catalog.btrim(pg_catalog.regexp_replace(
        public.immutable_unaccent(pg_catalog.lower(eligible.full_name)),
        '[^a-z0-9]+',
        ' ',
        'g'
      )) AS normalized_name
    FROM eligible_profiles AS eligible
  )
  SELECT
    normalized.id,
    normalized.full_name,
    normalized.role,
    normalized.email
  FROM normalized_profiles AS normalized
  WHERE pg_catalog.char_length(pg_catalog.btrim(p_search)) BETWEEN 3 AND 120
    AND NOT EXISTS (
      SELECT 1
      FROM query_words AS word
      WHERE pg_catalog.strpos(normalized.search_text, word.value) = 0
    )
    AND (
      normalized.normalized_name NOT IN (
        'teste alt nfe html operador',
        'test aut nfe hml operator'
      )
      OR pg_catalog.lower(pg_catalog.btrim(normalized.email)) =
         pg_catalog.lower(pg_catalog.btrim(COALESCE(auth.jwt() ->> 'email', '')))
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(COALESCE(p_excluded_profile_ids, ARRAY[]::uuid[]))
        AS excluded(profile_id)
      WHERE excluded.profile_id = normalized.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_catalog.unnest(COALESCE(p_excluded_names, ARRAY[]::text[]))
        AS excluded(full_name)
      WHERE pg_catalog.lower(pg_catalog.btrim(excluded.full_name)) =
            pg_catalog.lower(pg_catalog.btrim(normalized.full_name))
    )
  ORDER BY
    public.immutable_unaccent(pg_catalog.lower(normalized.full_name)),
    pg_catalog.lower(normalized.full_name),
    normalized.id
  LIMIT 5;
$$;
