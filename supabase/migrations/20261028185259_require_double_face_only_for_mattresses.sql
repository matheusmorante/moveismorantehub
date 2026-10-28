-- Dupla face applies only to mattresses and is required there.
do $migration$
declare
  v_attribute_id uuid;
  v_attribute_count integer;
  v_category_count integer;
  v_mattress_category_count integer;
  v_existing_application_count integer;
  v_required_count integer;
  v_unavailable_count integer;
begin
  select count(*)
  into v_attribute_count
  from public.attributes
  where name = 'É dupla face?'
    and data_type = 'boolean';

  select id into v_attribute_id
  from public.attributes
  where name = 'É dupla face?'
    and data_type = 'boolean';

  select count(*) into v_category_count
  from public.categories
  where type = 'category';

  select count(*) into v_mattress_category_count
  from public.categories
  where type = 'category'
    and name = 'Colchões';

  select count(distinct category_id) into v_existing_application_count
  from public.attribute_category_applications
  where attribute_id = v_attribute_id;

  if v_attribute_count <> 1
    or v_category_count <> 38
    or v_mattress_category_count <> 1
    or v_existing_application_count <> 38 then
    raise exception 'Unexpected precondition for É dupla face?: attributes %, categories %, Colchões %, existing applications %',
      v_attribute_count, v_category_count, v_mattress_category_count, v_existing_application_count;
  end if;

  insert into public.attribute_category_applications (
    attribute_id,
    category_id,
    application,
    is_configured
  )
  select
    v_attribute_id,
    category.id,
    case when category.name = 'Colchões' then 'required' else 'unavailable' end,
    true
  from public.categories category
  where category.type = 'category'
  on conflict (attribute_id, category_id) do update
  set application = excluded.application,
      is_configured = true,
      updated_at = now();

  select count(*) filter (where application = 'required'),
         count(*) filter (where application = 'unavailable')
  into v_required_count, v_unavailable_count
  from public.attribute_category_applications
  where attribute_id = v_attribute_id;

  if v_required_count <> 1 or v_unavailable_count <> 37 or exists (
    select 1
    from public.categories category
    left join public.attribute_category_applications application
      on application.attribute_id = v_attribute_id
     and application.category_id = category.id
    where category.type = 'category'
      and (
        application.attribute_id is null
        or application.is_configured is distinct from true
        or application.application is distinct from case
          when category.name = 'Colchões' then 'required'
          else 'unavailable'
        end
      )
  ) then
    raise exception 'É dupla face? applications did not resolve to Colchões=required and all other categories=unavailable';
  end if;
end;
$migration$;
