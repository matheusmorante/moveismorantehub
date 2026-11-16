BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
SET LOCAL idle_in_transaction_session_timeout = '60s';

-- The administrative ERP directory must filter, deduplicate, count, order and
-- page employee rows before they cross the API boundary. The shared people
-- reader remains unchanged for other ERP and mobile consumers.
CREATE OR REPLACE FUNCTION public.list_admin_employee_page(
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 15,
  p_sort_by text DEFAULT 'fullName',
  p_sort_order text DEFAULT 'asc'
)
RETURNS TABLE(total_count bigint, rows jsonb)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_page integer := greatest(coalesce(p_page, 1), 1);
  v_page_size integer := least(greatest(coalesce(p_page_size, 15), 1), 100);
  v_page_offset bigint;
  v_sort_by text := CASE WHEN p_sort_by = 'createdAt' THEN 'createdAt' ELSE 'fullName' END;
  v_sort_order text := CASE WHEN lower(coalesce(p_sort_order, 'asc')) = 'desc' THEN 'desc' ELSE 'asc' END;
  v_allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  -- Keep the same ERP permission: administrators always pass; other roles use
  -- the persisted viewEmployees setting, inheriting viewPeople for legacy rows.
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    LEFT JOIN public.settings AS settings ON settings.id = 'app'
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN cardinality(array_remove(coalesce(profile.roles, ARRAY[]::text[]), 'pending')) > 0
          THEN array_remove(profile.roles, 'pending')
        WHEN profile.role IS NOT NULL AND profile.role <> 'pending' THEN ARRAY[profile.role]
        ELSE ARRAY[]::text[]
      END AS assigned_roles
    ) AS current_profile
    CROSS JOIN LATERAL (
      SELECT CASE
        WHEN settings.data #> '{rolePermissions,viewEmployees}' IS NOT NULL THEN
          CASE
            WHEN jsonb_typeof(settings.data #> '{rolePermissions,viewEmployees}') = 'array' THEN ARRAY(
              SELECT permission_role #>> '{}'
              FROM jsonb_array_elements(settings.data #> '{rolePermissions,viewEmployees}') AS entry(permission_role)
              WHERE jsonb_typeof(permission_role) = 'string'
            )
            ELSE ARRAY[]::text[]
          END
        WHEN settings.data #> '{rolePermissions,viewPeople}' IS NOT NULL THEN
          CASE
            WHEN jsonb_typeof(settings.data #> '{rolePermissions,viewPeople}') = 'array' THEN ARRAY(
              SELECT permission_role #>> '{}'
              FROM jsonb_array_elements(settings.data #> '{rolePermissions,viewPeople}') AS entry(permission_role)
              WHERE jsonb_typeof(permission_role) = 'string'
            )
            ELSE ARRAY[]::text[]
          END
        ELSE ARRAY['manager']::text[]
      END AS allowed_roles
    ) AS permission_config
    WHERE profile.id = (SELECT auth.uid())
      AND (
        'administrator' = ANY(current_profile.assigned_roles)
        OR current_profile.assigned_roles && permission_config.allowed_roles
      )
  ) INTO v_allowed;

  IF NOT coalesce(v_allowed, false) THEN
    RAISE EXCEPTION 'Acesso negado.' USING ERRCODE = '42501';
  END IF;

  v_page_offset := (v_page::bigint - 1) * v_page_size::bigint;

  RETURN QUERY
  WITH employee_candidates AS (
    SELECT
      person.*,
      CASE WHEN person.address IS JSON THEN person.address::jsonb ELSE NULL END AS address_json,
      CASE WHEN person.observation IS JSON THEN person.observation::jsonb ELSE NULL END AS observation_json,
      lower(btrim(coalesce(person.email, ''))) AS normalized_email,
      btrim(regexp_replace(lower(public.unaccent(coalesce(person.full_name, ''))), '[^a-z0-9]+', ' ', 'g')) AS normalized_name
    FROM public.people AS person
    WHERE (person.deleted = false OR person.deleted IS NULL)
      AND (
        person.person_type ILIKE 'employees'
        OR (person.position IS NOT NULL AND person.position <> '')
      )
  ), visible_employees AS (
    SELECT candidate.*
    FROM employee_candidates AS candidate
    WHERE (
      candidate.normalized_name IN ('teste alt nfe html operador', 'test aut nfe hml operator')
      AND candidate.normalized_email <> ''
      AND candidate.normalized_email = lower(btrim(coalesce(auth.jwt() ->> 'email', '')))
    ) OR (
      candidate.normalized_name NOT IN ('teste alt nfe html operador', 'test aut nfe hml operator')
      AND NOT (
        coalesce(candidate.address_json #>> '{testArtifact,is_test}' = 'true', false)
        OR coalesce(candidate.observation_json #>> '{testArtifact,is_test}' = 'true', false)
        OR coalesce(candidate.full_name, '') ~* '\[?\s*HML\s*NF\s*TEST\y'
        OR coalesce(candidate.full_name, '') ~* '^\s*(TEST_AUT_|playwright\.test)'
        OR coalesce(candidate.id, '') ~* '^\s*TEST_AUT_'
      )
    )
  ), contact_scored AS (
    SELECT
      visible.*,
      (CASE WHEN visible.phone IS NOT NULL AND visible.phone <> '' THEN 10 ELSE 0 END)
      + CASE
          WHEN visible.address_json IS NULL THEN CASE WHEN visible.address IS NOT NULL AND visible.address <> '' THEN 10 ELSE 0 END
          WHEN jsonb_typeof(visible.address_json) = 'object' THEN
            CASE jsonb_typeof(visible.address_json -> 'street')
              WHEN 'string' THEN CASE WHEN visible.address_json ->> 'street' <> '' THEN 10 ELSE 0 END
              WHEN 'number' THEN CASE WHEN visible.address_json -> 'street' <> '0'::jsonb THEN 10 ELSE 0 END
              WHEN 'boolean' THEN CASE WHEN visible.address_json -> 'street' = 'true'::jsonb THEN 10 ELSE 0 END
              WHEN 'object' THEN 10
              WHEN 'array' THEN 10
              ELSE 0
            END
          WHEN jsonb_typeof(visible.address_json) = 'string' THEN
            CASE WHEN visible.address_json #>> '{}' <> '' THEN 10 ELSE 0 END
          WHEN jsonb_typeof(visible.address_json) = 'number' THEN
            CASE WHEN visible.address_json <> '0'::jsonb THEN 10 ELSE 0 END
          WHEN jsonb_typeof(visible.address_json) = 'boolean' THEN
            CASE WHEN visible.address_json = 'true'::jsonb THEN 10 ELSE 0 END
          ELSE 0
        END AS contact_score
    FROM visible_employees AS visible
  ), deduplicated AS (
    SELECT
      scored.*,
      row_number() OVER (
        PARTITION BY coalesce(nullif(scored.normalized_email, ''), scored.id)
        ORDER BY scored.contact_score DESC, scored.full_name ASC, scored.id ASC
      ) AS duplicate_rank
    FROM contact_scored AS scored
  ), mapped_roles AS (
    SELECT
      employee.*,
      CASE
        WHEN employee.address_json -> 'role' IS NOT NULL
          AND employee.address_json -> 'role' NOT IN ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb)
          THEN employee.address_json -> 'role'
        WHEN employee.address_json -> 'roles' -> 0 IS NOT NULL
          AND employee.address_json -> 'roles' -> 0 NOT IN ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb)
          THEN employee.address_json -> 'roles' -> 0
        WHEN employee.person_type = 'employees' THEN '"seller"'::jsonb
        ELSE NULL
      END AS mapped_role
    FROM deduplicated AS employee
    WHERE employee.duplicate_rank = 1
  ), role_filtered AS (
    SELECT employee.*
    FROM mapped_roles AS employee
    WHERE (
      CASE
        WHEN jsonb_typeof(employee.address_json -> 'roles') = 'array' THEN EXISTS (
          SELECT 1
          FROM jsonb_array_elements(employee.address_json -> 'roles') AS role_entry(value)
          WHERE jsonb_typeof(role_entry.value) = 'string'
            AND role_entry.value #>> '{}' <> 'pending'
        )
        ELSE false
      END
    ) OR (
      jsonb_typeof(employee.mapped_role) = 'string'
      AND employee.mapped_role #>> '{}' <> 'pending'
    )
  ), ordered_employees AS (
    SELECT
      employee.*,
      row_number() OVER (
        ORDER BY
          CASE WHEN v_sort_by = 'fullName' AND v_sort_order = 'asc' THEN employee.full_name END COLLATE "C" ASC,
          CASE WHEN v_sort_by = 'fullName' AND v_sort_order = 'desc' THEN employee.full_name END COLLATE "C" DESC,
          CASE WHEN v_sort_by = 'createdAt' AND v_sort_order = 'asc' THEN employee.created_at END ASC NULLS FIRST,
          CASE WHEN v_sort_by = 'createdAt' AND v_sort_order = 'desc' THEN employee.created_at END DESC NULLS LAST,
          employee.full_name COLLATE "C" ASC,
          employee.id ASC
      ) AS page_position
    FROM role_filtered AS employee
  ), page_rows AS (
    SELECT
      employee.page_position,
      employee.id,
      jsonb_build_object(
        'id', employee.id,
        'person_type', employee.person_type,
        'person_type_pf_pj', employee.person_type_pf_pj,
        'full_name', employee.full_name,
        'social_name', employee.social_name,
        'nickname', employee.nickname,
        'cpf_cnpj', employee.cpf_cnpj,
        'rg_ie', employee.rg_ie,
        'ie_indicator', employee.ie_indicator,
        'email', employee.email,
        'phone', employee.phone,
        'address', employee.address,
        'observation', employee.observation,
        'active', employee.active,
        'is_draft', employee.is_draft,
        'deleted', employee.deleted,
        'deleted_at', employee.deleted_at,
        'position', employee.position,
        'lead_time', employee.lead_time,
        'marketing_origin', employee.marketing_origin,
        'stock_origins', employee.stock_origins,
        'created_at', employee.created_at,
        'updated_at', employee.updated_at
      ) AS payload
    FROM ordered_employees AS employee
    WHERE employee.page_position > v_page_offset
      AND employee.page_position <= v_page_offset + v_page_size
  ), employee_count AS (
    SELECT count(*) AS value FROM role_filtered
  )
  SELECT
    employee_count.value,
    coalesce(
      jsonb_agg(page_rows.payload ORDER BY page_rows.page_position)
        FILTER (WHERE page_rows.id IS NOT NULL),
      '[]'::jsonb
    )
  FROM employee_count
  LEFT JOIN page_rows ON true
  GROUP BY employee_count.value;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_admin_employee_page(integer, integer, text, text) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_admin_employee_page(integer, integer, text, text) TO authenticated;

COMMENT ON FUNCTION public.list_admin_employee_page(integer, integer, text, text) IS
  'Paginates the authenticated ERP employee directory after preserving its legacy eligibility, test visibility, email deduplication, and role filters.';

COMMIT;
