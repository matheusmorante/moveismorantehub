ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE public.profiles
SET roles = CASE
  WHEN role IS NULL OR role = 'pending' THEN ARRAY[]::TEXT[]
  ELSE ARRAY[role]
END
WHERE cardinality(roles) = 0;

INSERT INTO public.profiles (id, email, full_name, role, roles)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', split_part(email, '@', 1)),
  'pending',
  ARRAY[]::TEXT[]
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
