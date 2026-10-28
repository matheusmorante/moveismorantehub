-- Hide the unused Format characteristic from all product categories and keep
-- Fixed Grilles available only for cribs.
do $migration$
declare
  v_format_id uuid;
  v_grades_id uuid;
  v_format_categories integer;
  v_grades_categories integer;
  v_crib_rows integer;
  v_updated_rows integer;
begin
  select id into v_format_id
  from public.attributes
  where name = 'Formato';

  select id into v_grades_id
  from public.attributes
  where name = 'As grades são fixas?'
    and data_type = 'boolean';

  if v_format_id is null or v_grades_id is null then
    raise exception 'Expected Format and Boolean Fixed Grilles characteristics to exist';
  end if;

  select count(distinct category_id) into v_format_categories
  from public.attribute_category_applications
  where attribute_id = v_format_id;

  select count(distinct category_id) into v_grades_categories
  from public.attribute_category_applications
  where attribute_id = v_grades_id;

  if v_format_categories <> 38 or v_grades_categories <> 38 then
    raise exception 'Expected 38 category applications for each characteristic; found % and %',
      v_format_categories, v_grades_categories;
  end if;

  if exists (
    select category_id
    from public.attribute_category_applications
    where attribute_id = v_format_id
    except
    select category_id
    from public.attribute_category_applications
    where attribute_id = v_grades_id
  ) or exists (
    select category_id
    from public.attribute_category_applications
    where attribute_id = v_grades_id
    except
    select category_id
    from public.attribute_category_applications
    where attribute_id = v_format_id
  ) then
    raise exception 'Format and Fixed Grilles do not cover the same 38 categories';
  end if;

  select count(*) into v_crib_rows
  from public.attribute_category_applications application
  join public.categories category on category.id = application.category_id
  where application.attribute_id = v_grades_id
    and category.name = 'Berços';

  if v_crib_rows <> 1 then
    raise exception 'Expected one Fixed Grilles application for Berços; found %', v_crib_rows;
  end if;

  update public.attribute_category_applications
  set application = 'unavailable',
      is_configured = true,
      updated_at = now()
  where attribute_id = v_format_id;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 38 then
    raise exception 'Expected to mark Format unavailable in 38 categories; updated %', v_updated_rows;
  end if;

  update public.attribute_category_applications aca
  set application = case when category.name = 'Berços' then 'optional' else 'unavailable' end,
      is_configured = true,
      updated_at = now()
  from public.categories category
  where aca.attribute_id = v_grades_id
    and category.id = aca.category_id;

  get diagnostics v_updated_rows = row_count;
  if v_updated_rows <> 38 then
    raise exception 'Expected to set Fixed Grilles in 38 categories; updated %', v_updated_rows;
  end if;
end;
$migration$;
